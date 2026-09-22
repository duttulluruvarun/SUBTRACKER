import streamlit as st
import pandas as pd
import plotly.express as px
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import hashlib
import base64
import io
from PIL import Image
from streamlit_cropper import st_cropper

from NLP_parser import normalize_merchant_names
from dataset_generator import generate_mock_transactions
from auth_engine import (
    init_db, generate_magic_link, verify_magic_link, check_password,
    cancel_subscription, get_canceled_subscriptions, get_canceled_subscriptions_detailed,
    restore_subscription,
    save_profile, get_profile, request_otp, verify_otp, rename_account_email,
    save_user_transactions, get_user_transactions, clear_user_transactions,
)
import gemini_client
import time

import numpy as np # Adding numpy here as it is needed for SVI mock data

# Page Configuration
st.set_page_config(
    page_title="Autonomous Subscription Analysis & Cost Optimizer",
    page_icon=":material/monitoring:",
    layout="wide"
)

# Initialize Database
init_db()

# --- Callback Route Logic (/auth/verify) ---
query_params = st.query_params
if "token" in query_params and "email" in query_params:
    st.title("Verifying Magic Link")
    with st.spinner("Authenticating secure session..."):
        time.sleep(1.5) # Fake loading for UX
        success, msg = verify_magic_link(query_params["email"], query_params["token"])
        if success:
            st.success(msg)
            st.session_state['logged_in'] = True
            st.session_state['current_email'] = query_params["email"]
            st.query_params.clear()
            time.sleep(1)
            st.rerun()
        else:
            st.error(msg)
            if st.button("Request New Link"):
                st.query_params.clear()
                st.rerun()
    st.stop()

# Design tokens: near-black graphite ground with a copper/amber accent —
# deliberately not the navy-and-emerald look most generated dashboards use.
# Semantic colors (good/warning/critical) are kept separate from the accent
# so status never competes visually with the brand color.
st.markdown("""
<style>
    :root {
        --ground: #0A0B0D;
        --surface: #131519;
        --surface-raised: #1B1E23;
        --rule: #262A30;
        --rule-strong: #363B42;
        --ink: #E8EAED;
        --ink-muted: #9096A0;
        --ink-faint: #565C63;
        --accent: #E8963C;
        --accent-dim: #B8752A;
        --accent-ink: #14120A;
        --good: #5CA579;
        --warning: #C9A227;
        --critical: #C25B4A;
    }
    .stApp {
        background: var(--ground);
        color: var(--ink);
    }
    html, body, [class*="css"] {
        font-family: Calibri, Candara, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    }
    h1, h2, h3 {
        font-family: Cambria, Georgia, "Times New Roman", serif !important;
        font-weight: 700 !important;
        letter-spacing: -0.01em;
    }
    [data-testid="stSidebar"] {
        background-color: var(--surface);
        border-right: 1px solid var(--rule);
    }
    [data-testid="stMetricValue"] {
        font-family: Consolas, "Cascadia Code", "SF Mono", Menlo, monospace !important;
        color: var(--ink) !important;
    }
    [data-testid="stMetricLabel"] {
        color: var(--ink-faint) !important;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 0.75rem !important;
    }
    .metric-card {
        background-color: var(--surface);
        border-radius: 6px;
        padding: 1rem 1.25rem;
        border: 1px solid var(--rule);
        margin-bottom: 1rem;
    }
    .zombie-sub { border-left: 3px solid var(--critical); }
    .good-sub { border-left: 3px solid var(--good); }
    .stButton button[kind="primary"] {
        background-color: var(--accent) !important;
        color: var(--accent-ink) !important;
        border: none !important;
        font-weight: 600;
        transition: background-color 0.15s ease;
    }
    .stButton button[kind="primary"]:hover {
        background-color: var(--accent-dim) !important;
    }
    code {
        font-family: Consolas, "Cascadia Code", "SF Mono", Menlo, monospace !important;
    }
    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-family: Consolas, monospace;
        font-size: 0.75rem;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        border: 1px solid currentColor;
    }
    .status-pill.verified { color: var(--good); }
    .status-pill.unverified { color: var(--warning); }
    .status-pill::before {
        content: "";
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        display: inline-block;
    }
    .avatar-ring {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        border: 1px solid var(--rule-strong);
        object-fit: cover;
        display: block;
    }
    .avatar-initial {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: var(--accent);
        color: var(--accent-ink);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Cambria, Georgia, serif;
        font-size: 2.2rem;
        font-weight: 700;
    }
</style>
""", unsafe_allow_html=True)

# Helper function to auto-detect and rename CSV columns
def standardize_csv_columns(df):
    cols = {str(c).strip().lower(): c for c in df.columns}
    
    date_col = next((cols[c] for c in cols if any(k in c for k in ['date', 'time', 'txn_date', 'timestamp'])), None)
    desc_col = next((cols[c] for c in cols if any(k in c for k in ['desc', 'narration', 'particulars', 'merchant', 'details', 'title'])), None)
    amt_col = next((cols[c] for c in cols if any(k in c for k in ['amount', 'amt', 'debit', 'withdrawal', 'price'])), None)
    
    if date_col and desc_col and amt_col:
        df = df.rename(columns={
            date_col: 'Date',
            desc_col: 'Description',
            amt_col: 'Amount'
        })
        # Clean Amount column (remove currency symbols/commas if present)
        df['Amount'] = df['Amount'].astype(str).str.replace(r'[^\d.]', '', regex=True)
        df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce')
        df = df.dropna(subset=['Date', 'Description', 'Amount'])
        return df
    else:
        st.error("Could not automatically detect required columns. Please ensure your CSV has Date, Description, and Amount columns.")
        return pd.DataFrame()

# Step 2: Multi-Cycle DBSCAN Subscription Mining. Defined up here (not
# inline with the Dashboard rendering below) because build_transaction_report
# needs it too, and that function can be called from the Cancelled
# Subscriptions page — a completely different script path that never
# reaches the Dashboard code.
def detect_multi_cycle_subscriptions(df, eps=0.35, min_samples=2):
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(['Canonical_Merchant', 'Date']).reset_index(drop=True)

    merchant_groups = []

    for merchant, group in df.groupby('Canonical_Merchant'):
        if len(group) < 2:
            continue

        group['Days_Diff'] = group['Date'].diff().dt.days
        avg_interval = group['Days_Diff'].mean()
        std_interval = group['Days_Diff'].std() if len(group) > 2 else 0
        avg_amount = group['Amount'].mean()
        std_amount = group['Amount'].std() if len(group) > 2 else 0

        merchant_groups.append({
            'Canonical_Merchant': merchant,
            'Transaction_Count': len(group),
            'Avg_Interval_Days': avg_interval,
            'Std_Interval_Days': std_interval,
            'Avg_Amount': avg_amount,
            'Std_Amount': std_amount,
            'Last_Paid': group['Date'].max(),
            'Total_Spent': group['Amount'].sum()
        })

    features_df = pd.DataFrame(merchant_groups)

    if features_df.empty:
        return pd.DataFrame(), df

    X = features_df[['Avg_Interval_Days', 'Std_Amount']].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    features_df['Cluster'] = dbscan.fit_predict(X_scaled)

    # Classify multi-cycle subscription patterns
    def classify_cycle(days):
        if 20 <= days <= 35:
            return "Monthly"
        elif 85 <= days <= 95:
            return "Quarterly"
        elif 350 <= days <= 380:
            return "Annual"
        else:
            return "Non-Subscription / Random"

    features_df['Cycle_Type'] = features_df['Avg_Interval_Days'].apply(classify_cycle)

    # DBSCAN actually drives the decision: a merchant counts as recurring when
    # DBSCAN groups it into a dense cluster (not noise, label != -1) AND its
    # charge amount barely varies between cycles (coefficient of variation).
    # Interval alone isn't a safe DBSCAN signal — random one-off spends sampled
    # over a fixed window naturally converge to similar-looking average
    # intervals purely from sample-count math, unrelated to being recurring.
    # The classic Monthly/Quarterly/Annual windows stay as a floor so tightening
    # eps/min_samples can only ADD detections, never drop the obvious ones.
    interval_rule = features_df['Cycle_Type'] != "Non-Subscription / Random"
    amount_cv = (features_df['Std_Amount'] / features_df['Avg_Amount'].replace(0, np.nan)).fillna(0)
    dbscan_rule = (
        (features_df['Cluster'] != -1)
        & features_df['Avg_Interval_Days'].between(5, 400)
        & (amount_cv < 0.35)
    )
    features_df['Is_Subscription'] = interval_rule | dbscan_rule
    # DBSCAN-only catches that don't land in a classic billing window still
    # get a display label instead of the misleading "Non-Subscription" tag.
    features_df.loc[dbscan_rule & ~interval_rule, 'Cycle_Type'] = "Other Recurring Cycle"

    return features_df, df


def stable_usage_hours(merchant_name):
    # Same stable hash used by the Dashboard's SVI calculation — defined
    # here too so build_transaction_report doesn't depend on Dashboard-only
    # state (report can be generated from the Cancelled Subscriptions page).
    digest = hashlib.md5(merchant_name.encode('utf-8')).hexdigest()
    return 1 + (int(digest, 16) % 60)


KNOWN_CITIES = ["MUMBAI", "DELHI", "BANGALORE", "CHENNAI", "HYDERABAD"]


def extract_location(raw_description):
    upper_desc = str(raw_description).upper()
    for city in KNOWN_CITIES:
        if city in upper_desc:
            return city.title()
    return "Not available"


def build_transaction_report(email):
    """
    Self-contained report builder — fetches the account's transaction
    history and re-runs detection itself, rather than depending on
    Dashboard-page state, so it works when called from a different page
    (Cancelled Subscriptions) that never executes the Dashboard code path.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    # Same light-mode palette as the app's own design tokens (see the
    # showcase/dashboard Artifacts and app.py's <style> block) — the report
    # is a white/print document, so it uses the light-mode values of the
    # same system rather than inventing a separate look.
    C_INK = colors.HexColor("#14161A")
    C_INK_MUTED = colors.HexColor("#5B5F66")
    C_ACCENT = colors.HexColor("#B5691E")
    C_GOOD = colors.HexColor("#3D7A56")
    C_WARN = colors.HexColor("#9C7A15")
    C_CRITICAL = colors.HexColor("#9C3D2E")
    C_RULE = colors.HexColor("#DAD8D3")
    C_ROW_ALT = colors.HexColor("#F5F4F1")
    C_HEADER_BG = colors.HexColor("#14161A")

    # Georgia mirrors the same serif used for headings on the web (Cambria
    # isn't a plain single-file TTF — Georgia is its documented fallback in
    # the app's own font stack). Registered from the local Windows fonts
    # directory for this locally-generated, locally-downloaded PDF; falls
    # back to Helvetica cleanly if the font file isn't present.
    heading_font = "Helvetica-Bold"
    try:
        pdfmetrics.registerFont(TTFont("Georgia", r"C:\Windows\Fonts\georgia.ttf"))
        pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:\Windows\Fonts\georgiab.ttf"))
        heading_font = "Georgia-Bold"
    except Exception:
        pass

    saved = get_user_transactions(email)
    tx_df = saved if saved is not None else generate_mock_transactions()
    tx_df = tx_df.copy()
    tx_df['Date'] = pd.to_datetime(tx_df['Date'])
    tx_df = tx_df.sort_values('Date')

    name_mapping = normalize_merchant_names(tx_df['Description'].unique().tolist(), similarity_threshold=0.75)
    tx_df['Canonical_Merchant'] = tx_df['Description'].map(name_mapping)

    features_df, _ = detect_multi_cycle_subscriptions(tx_df.copy(), eps=0.35, min_samples=2)
    active_subs = pd.DataFrame()
    if not features_df.empty:
        active_subs = features_df[features_df['Is_Subscription'] == True].copy()
        active_subs['Mock_Usage_Hours'] = active_subs['Canonical_Merchant'].apply(stable_usage_hours)
        active_subs['SVI'] = (active_subs['Mock_Usage_Hours'] / active_subs['Avg_Amount']).round(4)
        canceled_now = get_canceled_subscriptions(email)
        if canceled_now:
            active_subs = active_subs[~active_subs['Canonical_Merchant'].isin(canceled_now)]

    cancelled_detail = get_canceled_subscriptions_detailed(email)

    # ---- Charts (matplotlib, rendered to PNG bytes for embedding, styled
    # to match the report's own palette rather than matplotlib defaults) ----
    plt.rcParams.update({
        "font.size": 8, "axes.edgecolor": "#DAD8D3", "axes.labelcolor": "#14161A",
        "xtick.color": "#5B5F66", "ytick.color": "#5B5F66", "text.color": "#14161A",
    })
    chart_images = []
    if not active_subs.empty:
        fig1, ax1 = plt.subplots(figsize=(6, 3))
        ax1.bar(active_subs['Canonical_Merchant'], active_subs['Avg_Amount'], color="#B5691E", width=0.6)
        ax1.set_ylabel("Avg Monthly Cost (Rs.)")
        ax1.set_title("Active Subscription Spend by Merchant", fontsize=10, fontweight='bold')
        ax1.spines[['top', 'right']].set_visible(False)
        plt.xticks(rotation=30, ha='right', fontsize=7)
        fig1.tight_layout()
        buf1 = io.BytesIO()
        fig1.savefig(buf1, format='png', dpi=150)
        plt.close(fig1)
        buf1.seek(0)
        chart_images.append(("Active Subscription Spend", buf1))

    if 'Category' in tx_df.columns and tx_df['Category'].notna().any():
        fig2, ax2 = plt.subplots(figsize=(4.5, 4.5))
        cat_totals = tx_df.groupby('Category')['Amount'].sum().sort_values(ascending=False)
        palette = ["#B5691E", "#3D7A56", "#9C7A15", "#5B5F66", "#9C3D2E", "#8F5216", "#7A8577"]
        ax2.pie(
            cat_totals.values, labels=cat_totals.index, autopct='%1.0f%%',
            textprops={'fontsize': 7}, colors=palette[:len(cat_totals)],
            wedgeprops={'edgecolor': 'white', 'linewidth': 1}
        )
        ax2.set_title("Spend by Category", fontsize=10, fontweight='bold')
        fig2.tight_layout()
        buf2 = io.BytesIO()
        fig2.savefig(buf2, format='png', dpi=150)
        plt.close(fig2)
        buf2.seek(0)
        chart_images.append(("Spend by Category", buf2))

    # ---- Styles ----
    styles = getSampleStyleSheet()
    eyebrow_style = ParagraphStyle(
        'Eyebrow', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5,
        textColor=C_ACCENT, spaceAfter=4, characterSpace=1.2
    )
    title_style = ParagraphStyle('ReportTitle', parent=styles['Title'], fontName=heading_font, fontSize=20, textColor=C_INK, spaceAfter=2)
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=8.5, textColor=C_INK_MUTED)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontName=heading_font, fontSize=13, textColor=C_INK, spaceBefore=16, spaceAfter=6)
    body_style = ParagraphStyle('Body', parent=styles['BodyText'], fontSize=9, textColor=C_INK, leading=13)
    kpi_label_style = ParagraphStyle('KPILabel', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7, textColor=C_INK_MUTED)
    kpi_value_style = ParagraphStyle('KPIValue', parent=styles['Normal'], fontName=heading_font, fontSize=15, textColor=C_INK, spaceBefore=2)
    cell_style = ParagraphStyle('Cell', parent=styles['Normal'], fontSize=8, textColor=C_INK, leading=10)

    def kpi_cell(label, value, value_color=C_INK):
        v_style = ParagraphStyle('KPIValueColored', parent=kpi_value_style, textColor=value_color)
        return [Paragraph(label.upper(), kpi_label_style), Paragraph(str(value), v_style)]

    def wrap(text):
        # Plain strings in a reportlab Table never wrap — they overflow
        # into the next column instead. Any cell that might hold a long
        # merchant name or raw transaction description needs to go through
        # this so the column width is actually respected.
        return Paragraph(str(text), cell_style)

    # ---- Header ----
    story = [
        Paragraph("ACCOUNT REPORT", eyebrow_style),
        Paragraph("SubTracker — Subscription &amp; Cashflow Report", title_style),
        Paragraph(f"Account: {email} &nbsp;&nbsp;|&nbsp;&nbsp; Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", meta_style),
        Spacer(1, 0.35 * cm),
        HRFlowable(width="100%", thickness=1.2, color=C_ACCENT, spaceAfter=0.5 * cm),
    ]

    monthly_spend = active_subs['Avg_Amount'].sum() if not active_subs.empty else 0
    zombie_count = int((active_subs['SVI'] < 0.05).sum()) if not active_subs.empty else 0

    kpi_table = Table(
        [[
            kpi_cell("Transactions", len(tx_df)),
            kpi_cell("Active Subscriptions", len(active_subs)),
            kpi_cell("Monthly Commitment", f"Rs. {monthly_spend:,.0f}", C_ACCENT),
            kpi_cell("Low Utility", zombie_count, C_CRITICAL if zombie_count else C_GOOD),
            kpi_cell("Cancelled", len(cancelled_detail)),
        ]],
        colWidths=[3.5 * cm] * 5
    )
    kpi_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, C_RULE),
        ('INNERGRID', (0, 0), (-1, -1), 0.75, C_RULE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(kpi_table)

    # AI-written narrative — opt-in only (checked via session_state since
    # this function can be called from the Cancelled Subscriptions page,
    # which never renders the sidebar toggle that sets this key). Never
    # blocks report generation if the call fails or isn't configured.
    if st.session_state.get("gemini_enabled_persisted") and gemini_client.is_configured():
        with st.spinner("Writing AI summary..."):
            narrative = gemini_client.generate_narrative(
                active_subs=[
                    {"merchant": r['Canonical_Merchant'], "cycle": r['Cycle_Type'],
                     "cost": round(float(r['Avg_Amount']), 2), "usage_hours": int(r['Mock_Usage_Hours']),
                     "svi": round(float(r['SVI']), 4)}
                    for _, r in active_subs.iterrows()
                ] if not active_subs.empty else [],
                cancelled_subs=[
                    {"merchant": e['merchant'], "cycle": e['cycle_type'], "cost": e['avg_amount'], "svi": e['svi']}
                    for e in cancelled_detail
                ],
                monthly_spend=monthly_spend, zombie_count=zombie_count,
            )
        if narrative:
            story.append(Paragraph("AI Summary", section_style))
            story.append(Paragraph(narrative, body_style))
            story.append(Paragraph(
                "Generated by Gemini from the data in this report — verify before acting on it.",
                ParagraphStyle('FinePrint2', parent=body_style, fontSize=7.5, textColor=C_INK_MUTED)
            ))

    for chart_title, chart_buf in chart_images:
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph(chart_title, section_style))
        story.append(RLImage(chart_buf, width=14 * cm, height=14 * cm * 0.6, kind='proportional'))

    def styled_table(rows, col_widths, right_align_cols=(), assessment_col=None):
        t = Table(rows, repeatRows=1, hAlign='LEFT', colWidths=col_widths)
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), C_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, C_RULE),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, C_ROW_ALT]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]
        for col in right_align_cols:
            style_cmds.append(('ALIGN', (col, 0), (col, -1), 'RIGHT'))
        if assessment_col is not None:
            for row_idx, row in enumerate(rows[1:], start=1):
                color = C_CRITICAL if row[assessment_col] == "Low utility" else C_GOOD
                style_cmds.append(('TEXTCOLOR', (assessment_col, row_idx), (assessment_col, row_idx), color))
                style_cmds.append(('FONTNAME', (assessment_col, row_idx), (assessment_col, row_idx), 'Helvetica-Bold'))
        t.setStyle(TableStyle(style_cmds))
        return t

    if not active_subs.empty:
        story.append(Paragraph("Active Subscriptions — Usefulness Assessment", section_style))
        rows = [["Merchant", "Cycle", "Cost (Rs.)", "Usage (Hrs)", "SVI", "Assessment"]]
        for _, r in active_subs.iterrows():
            assessment = "Low utility" if r['SVI'] < 0.05 else "Good value"
            rows.append([
                wrap(r['Canonical_Merchant']), r['Cycle_Type'], f"{r['Avg_Amount']:,.2f}",
                f"{int(r['Mock_Usage_Hours'])}", f"{r['SVI']:.4f}", assessment
            ])
        story.append(styled_table(
            rows, [4.3 * cm, 2.1 * cm, 2.5 * cm, 2.3 * cm, 1.8 * cm, 2.8 * cm],
            right_align_cols=(2, 3, 4), assessment_col=5
        ))

    if cancelled_detail:
        story.append(Paragraph("Cancelled Subscriptions", section_style))
        rows = [["Merchant", "Cycle", "Cost (Rs.)", "Usage (Hrs)", "SVI at cancellation", "Cancelled"]]
        for entry in cancelled_detail:
            cost = f"{entry['avg_amount']:,.2f}" if entry['avg_amount'] is not None else "Not recorded"
            usage = str(entry['usage_hours']) if entry['usage_hours'] is not None else "Not recorded"
            svi_val = f"{entry['svi']:.4f}" if entry['svi'] is not None else "Not recorded"
            try:
                cancelled_label = datetime.strptime(entry['canceled_at'], "%Y-%m-%d %H:%M:%S.%f").strftime("%Y-%m-%d")
            except (ValueError, TypeError):
                cancelled_label = str(entry['canceled_at'])[:10]
            rows.append([wrap(entry['merchant']), entry['cycle_type'] or 'Not recorded', cost, usage, svi_val, cancelled_label])
        story.append(styled_table(rows, [3.9 * cm, 2.0 * cm, 2.3 * cm, 2.1 * cm, 2.8 * cm, 2.4 * cm], right_align_cols=(2, 3, 4)))
        story.append(Paragraph(
            "\"Not recorded\" means this subscription was cancelled before detailed cost/usage tracking was "
            "added to the account — the value was never captured, so it isn't estimated here.",
            ParagraphStyle('FinePrint', parent=body_style, fontSize=7.5, textColor=C_INK_MUTED)
        ))

    story.append(Paragraph("Transaction History", section_style))
    tx_rows = [["Date", "Time", "Description", "Amount (Rs.)", "Category", "Location"]]
    for _, r in tx_df.iterrows():
        time_val = r['Time'] if 'Time' in tx_df.columns and pd.notna(r.get('Time')) else "-"
        tx_rows.append([
            r['Date'].strftime('%Y-%m-%d'), time_val, wrap(str(r['Description'])[:40]),
            f"{r['Amount']:,.2f}", str(r.get('Category') or '-'), extract_location(r['Description'])
        ])
    story.append(styled_table(
        tx_rows, [2.1 * cm, 1.4 * cm, 5.3 * cm, 2.2 * cm, 2.6 * cm, 2.4 * cm], right_align_cols=(3,)
    ))

    def _footer(canvas, doc_):
        canvas.saveState()
        canvas.setStrokeColor(C_RULE)
        canvas.setLineWidth(0.5)
        canvas.line(1.5 * cm, 1.3 * cm, A4[0] - 1.5 * cm, 1.3 * cm)
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(C_INK_MUTED)
        canvas.drawString(1.5 * cm, 0.9 * cm, "SubTracker — Autonomous Subscription Analysis & Cost Optimizer")
        canvas.drawRightString(A4[0] - 1.5 * cm, 0.9 * cm, f"Page {doc_.page}")
        canvas.restoreState()

    pdf_buf = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=2 * cm)
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    pdf_buf.seek(0)
    return pdf_buf.getvalue()


if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

if not st.session_state['logged_in']:
    # 50/50 Split Layout
    left_panel, right_panel = st.columns(2, gap="large")
    
    with left_panel:
        st.markdown("<br><br>", unsafe_allow_html=True)
        st.markdown('<h2 style="color: var(--ink); font-weight: 700;">Uncover hidden recurring costs in 60 seconds.</h2>', unsafe_allow_html=True)
        st.markdown('<div class="metric-card">', unsafe_allow_html=True)

        # Interactive Widgets
        st.markdown("#### The Savings Calculator")
        active_subs = st.slider("Active Subscriptions", 3, 40, 12)
        monthly_spend = st.slider("Estimated Monthly Spend (₹)", 50, 2000, 400)

        # Dynamic Metric Display
        avg_savings = monthly_spend * 0.22 * 12
        st.markdown(f'<h1 style="color: var(--accent); font-size: 3.5rem; font-weight: 800; margin: 0; font-family: Consolas, monospace;">₹{avg_savings:,.0f}</h1>', unsafe_allow_html=True)
        st.markdown('<p style="color: var(--ink-muted); font-weight: 600;">Estimated Annual Waste</p>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        # Micro-Proof Badge
        st.markdown('<p style="color: var(--ink-muted); font-size: 0.9rem;"><i>"Users with ~12 subscriptions discover an average of ₹264/yr in unused trials & price hikes."</i></p>', unsafe_allow_html=True)

        # Save slider values to session state for carryover
        st.session_state['onboarding_subs'] = active_subs
        st.session_state['onboarding_spend'] = monthly_spend

    with right_panel:
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown('<div class="metric-card">', unsafe_allow_html=True)
        st.markdown('<h3>SubTracker</h3>', unsafe_allow_html=True)

        # Check Magic Link State
        if st.session_state.get('magic_link_sent', False):
            st.success(f"Magic Link sent to {st.session_state['magic_email']}!")
            st.info("Please check your inbox. The link expires in 10 minutes.")

            # Mock Delivery in UI
            st.markdown("---")
            st.markdown("##### Demo delivery — no email provider configured")
            st.markdown(f"**To:** `{st.session_state['magic_email']}`")
            mock_url = f"http://localhost:8501/?token={st.session_state['magic_token']}&email={st.session_state['magic_email']}"
            st.markdown(f"[{mock_url}]({mock_url})")
            st.markdown("---")

            if st.button("Use password instead", use_container_width=True):
                st.session_state['magic_link_sent'] = False
                st.rerun()
        else:
            email = st.text_input("Work or Personal Email")
            st.caption("New here? Just enter an email and a password (8+ characters) — that password becomes your account.")

            pwd_type = "default" if st.session_state.get("show_pwd", False) else "password"
            col_p, col_i = st.columns([5, 1])
            with col_p:
                password = st.text_input("Password", type=pwd_type)
            with col_i:
                st.markdown("<br>", unsafe_allow_html=True)
                toggle_label = "Hide" if st.session_state.get("show_pwd", False) else "Show"
                if st.button(toggle_label, key="toggle_pwd", help="Toggle password visibility"):
                    st.session_state["show_pwd"] = not st.session_state.get("show_pwd", False)
                    st.rerun()
            
            # Action Button
            if st.button("Log In & Optimize", use_container_width=True, type="primary"):
                if not email or not password:
                    st.error("Please enter credentials.")
                elif len(password) < 8:
                    st.error("Password must be at least 8 characters.")
                else:
                    ok, msg = check_password(email, password)
                    if ok:
                        st.session_state['logged_in'] = True
                        st.session_state['current_email'] = email
                        st.rerun()
                    else:
                        st.error(msg)
            
            ml_email = st.text_input("Or enter email for passwordless login", key="ml_email")
            if st.button("Send Magic Link", use_container_width=True):
                if not ml_email or "@" not in ml_email:
                    st.error("Please enter a valid email address.")
                else:
                    raw_token, err = generate_magic_link(ml_email)
                    if err:
                        st.error(err)
                    else:
                        st.session_state['magic_link_sent'] = True
                        st.session_state['magic_email'] = ml_email
                        st.session_state['magic_token'] = raw_token
                        st.rerun()
        
        st.markdown('</div>', unsafe_allow_html=True)

    st.stop()

current_email = st.session_state.get('current_email', 'admin@company.com')

# Small profile summary in the sidebar — same identity snippet on every
# page (Dashboard, Profile, Cancelled Subscriptions), not just the
# dedicated Profile page.
_sidebar_profile = get_profile(current_email)
sb_avatar_col, sb_id_col = st.sidebar.columns([1, 3])
with sb_avatar_col:
    if _sidebar_profile["profile_pic"]:
        _sb_b64 = base64.b64encode(_sidebar_profile["profile_pic"]).decode()
        st.markdown(
            f'<img src="data:{_sidebar_profile["profile_pic_type"]};base64,{_sb_b64}" '
            f'style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:1px solid var(--rule-strong);">',
            unsafe_allow_html=True
        )
    else:
        _sb_initial = (_sidebar_profile["full_name"] or current_email)[0].upper()
        st.markdown(
            f'<div style="width:44px;height:44px;border-radius:50%;background:var(--accent);'
            f'color:var(--accent-ink);display:flex;align-items:center;justify-content:center;'
            f'font-family:Cambria,serif;font-size:1.1rem;font-weight:700;">{_sb_initial}</div>',
            unsafe_allow_html=True
        )
with sb_id_col:
    st.markdown(
        f'<div style="font-size:0.85rem;font-weight:700;line-height:1.2;">{_sidebar_profile["full_name"] or "Unnamed"}</div>'
        f'<div style="font-size:0.7rem;color:var(--ink-faint);word-break:break-all;">{current_email}</div>',
        unsafe_allow_html=True
    )

if st.sidebar.button("Log Out", use_container_width=True):
    st.session_state['logged_in'] = False
    st.rerun()

st.sidebar.markdown("---")
# A button elsewhere on the page (the Kill Switch panel's "Cancelled
# Subscriptions" shortcut) can't set st.session_state["nav_page"] directly
# once this radio has been instantiated with that same key — Streamlit
# raises StreamlitAPIException for that. It sets "nav_page_request"
# instead; consumed here, before the radio renders, which IS allowed.
if "nav_page_request" in st.session_state:
    st.session_state["nav_page"] = st.session_state.pop("nav_page_request")
page = st.sidebar.radio("Navigation", ["Dashboard", "Profile", "Cancelled Subscriptions"], key="nav_page")

if page == "Profile":
    st.title("Profile")
    st.caption("Manage your account details, contact verification, and profile picture.")

    user_email = st.session_state.get("current_email", "admin@company.com")
    profile = get_profile(user_email)
    edit_mode = st.session_state.get("profile_edit_mode", False)

    @st.dialog("Profile saved")
    def _profile_saved_dialog():
        st.write("Your changes have been saved.")
        if st.button("Close", type="primary", use_container_width=True):
            st.rerun()

    avatar_col, identity_col = st.columns([1, 4])
    with avatar_col:
        if profile["profile_pic"]:
            b64 = base64.b64encode(profile["profile_pic"]).decode()
            st.markdown(
                f'<img class="avatar-ring" src="data:{profile["profile_pic_type"]};base64,{b64}">',
                unsafe_allow_html=True
            )
        else:
            initial = (profile["full_name"] or user_email)[0].upper()
            st.markdown(f'<div class="avatar-initial">{initial}</div>', unsafe_allow_html=True)
    with identity_col:
        st.markdown(f"**{user_email}**")
        header_verified = profile["email_verified"]
        pill_class = "verified" if header_verified else "unverified"
        pill_label = "Verified" if header_verified else "Not verified"
        st.markdown(f'<span class="status-pill {pill_class}">{pill_label}</span>', unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("Account information")

    pending_pic_bytes = None
    pending_pic_type = None

    # A single "Change Information" toggle gates every editable field below
    # (picture, name, bio, email, phone) — one switch for the whole
    # section rather than a separate edit control per field.
    if not edit_mode:
        info_rows = [
            ("Full name", profile["full_name"] or "Not set"),
            ("Bio", profile["bio"] or "Not set"),
            ("Email", user_email),
            ("Phone", profile["phone"] or "Not set"),
        ]
        for label, value in info_rows:
            lcol, vcol = st.columns([1, 3])
            lcol.markdown(
                f'<span style="color: var(--ink-faint); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">{label}</span>',
                unsafe_allow_html=True
            )
            vcol.write(value)

        full_name = profile["full_name"]
        bio = profile["bio"]
        new_email = user_email
        phone = profile["phone"]

        if st.button("Change Information", type="primary"):
            st.session_state["profile_edit_mode"] = True
            st.rerun()

    else:
        st.caption("Profile picture — PNG or JPEG. Drag to crop; the selection becomes your picture.")
        new_pic_upload = st.file_uploader(
            "Upload a new profile picture", type=["png", "jpg", "jpeg"],
            key="profile_pic_uploader", label_visibility="collapsed"
        )
        if new_pic_upload is not None:
            pil_img = Image.open(new_pic_upload).convert("RGB")
            cropped = st_cropper(
                pil_img, box_color="#E8963C", aspect_ratio=(1, 1),
                return_type="image", key="profile_cropper"
            )
            preview = cropped.resize((120, 120))
            buf = io.BytesIO()
            preview.save(buf, format="PNG")
            preview_b64 = base64.b64encode(buf.getvalue()).decode()
            st.markdown(
                f'<img src="data:image/png;base64,{preview_b64}" '
                f'style="width:120px;height:120px;border-radius:50%;border:1px solid var(--rule-strong);object-fit:cover;">',
                unsafe_allow_html=True
            )
            st.caption("This is exactly how your new picture will look.")

            final_img = cropped.resize((512, 512))
            buf2 = io.BytesIO()
            final_img.save(buf2, format="PNG")
            pending_pic_bytes = buf2.getvalue()
            pending_pic_type = "image/png"

        full_name = st.text_input("Full name", value=profile["full_name"], key="profile_full_name")
        bio = st.text_area("Bio", value=profile["bio"], key="profile_bio")
        new_email = st.text_input("Email", value=user_email, key="profile_email_input")
        phone = st.text_input("Phone number", value=profile["phone"], key="profile_phone", placeholder="+91 00000 00000")

        save_col, cancel_col = st.columns([1, 1])
        with save_col:
            if st.button("Save", type="primary", use_container_width=True):
                proceed = True
                final_email = user_email
                if new_email.strip() != user_email:
                    ok, msg = rename_account_email(user_email, new_email.strip())
                    if not ok:
                        st.error(msg)
                        proceed = False
                    else:
                        final_email = new_email.strip()
                        st.session_state["current_email"] = final_email

                if proceed:
                    save_profile(
                        final_email, full_name, bio, phone=phone,
                        profile_pic=pending_pic_bytes, profile_pic_type=pending_pic_type
                    )
                    st.session_state["profile_edit_mode"] = False
                    st.session_state["profile_just_saved"] = True
                    st.rerun()
        with cancel_col:
            if st.button("Cancel", use_container_width=True):
                st.session_state["profile_edit_mode"] = False
                st.rerun()

    st.markdown("---")
    st.subheader("Email verification")
    email_currently_verified = profile["email_verified"] and (not edit_mode or new_email.strip() == user_email)
    if email_currently_verified:
        st.markdown('<span class="status-pill verified">Email verified</span>', unsafe_allow_html=True)
    else:
        st.markdown('<span class="status-pill unverified">Email not verified</span>', unsafe_allow_html=True)
        if st.button("Send verification code to email"):
            code, err = request_otp(user_email, "email")
            if err:
                st.error(err)
            else:
                st.session_state["email_otp_sent"] = True
                st.session_state["email_otp_demo_code"] = code
                st.rerun()

        if st.session_state.get("email_otp_sent"):
            st.info(f"Demo verification code: `{st.session_state['email_otp_demo_code']}` — no email provider configured, so the code is shown here instead of being sent.")
            email_code = st.text_input("Enter the 6-digit code", key="email_otp_input", max_chars=6)
            if st.button("Verify email code"):
                ok, msg = verify_otp(user_email, "email", email_code)
                if ok:
                    st.session_state.pop("email_otp_sent", None)
                    st.session_state.pop("email_otp_demo_code", None)
                    st.session_state["email_just_verified"] = True
                    st.rerun()
                else:
                    st.error(msg)

    if st.session_state.pop("email_just_verified", False):
        st.success("Verified.")

    st.markdown("---")
    st.subheader("Phone verification")
    phone_currently_verified = profile["phone_verified"] and phone == profile["phone"]
    if phone_currently_verified:
        st.markdown('<span class="status-pill verified">Phone verified</span>', unsafe_allow_html=True)
    else:
        st.markdown('<span class="status-pill unverified">Phone not verified</span>', unsafe_allow_html=True)
        if st.button("Send verification code to phone", disabled=not phone):
            # Persist the phone number immediately so the number being
            # verified is the one actually saved, not left pending on the
            # edit form's Save button.
            save_profile(user_email, full_name, bio, phone=phone)
            code, err = request_otp(user_email, "phone")
            if err:
                st.error(err)
            else:
                st.session_state["phone_otp_sent"] = True
                st.session_state["phone_otp_demo_code"] = code
                st.rerun()

        if st.session_state.get("phone_otp_sent"):
            st.info(f"Demo verification code: `{st.session_state['phone_otp_demo_code']}` — no SMS provider configured, so the code is shown here instead of being sent.")
            phone_code = st.text_input("Enter the 6-digit code", key="phone_otp_input", max_chars=6)
            if st.button("Verify phone code"):
                ok, msg = verify_otp(user_email, "phone", phone_code)
                if ok:
                    st.session_state.pop("phone_otp_sent", None)
                    st.session_state.pop("phone_otp_demo_code", None)
                    st.session_state["phone_just_verified"] = True
                    st.rerun()
                else:
                    st.error(msg)

    if st.session_state.pop("phone_just_verified", False):
        st.success("Verified.")

    if st.session_state.pop("profile_just_saved", False):
        _profile_saved_dialog()

    st.stop()

if page == "Cancelled Subscriptions":
    st.title("Cancelled Subscriptions")
    st.caption("Everything you've cancelled from the Kill Switch panel, with the value assessment it had at the time.")

    cancelled_list = get_canceled_subscriptions_detailed(current_email)

    if not cancelled_list:
        st.info("Nothing cancelled yet. Cancel a subscription from the Kill Switch Action Panel and it will show up here.")
    else:
        for entry in cancelled_list:
            svi = entry["svi"]
            is_zombie = svi is not None and svi < 0.05
            card_class = "metric-card zombie-sub" if is_zombie else "metric-card good-sub"

            try:
                canceled_dt = datetime.strptime(entry["canceled_at"], "%Y-%m-%d %H:%M:%S.%f")
                canceled_label = canceled_dt.strftime("%Y-%m-%d %H:%M UTC")
            except (ValueError, TypeError):
                canceled_label = entry["canceled_at"]

            st.markdown(f'<div class="{card_class}">', unsafe_allow_html=True)
            col_a, col_b, col_c = st.columns([2, 1, 1])
            with col_a:
                cost_str = f"₹{entry['avg_amount']:,.2f}" if entry['avg_amount'] is not None else "—"
                usage_str = f"{entry['usage_hours']} Hrs" if entry['usage_hours'] is not None else "—"
                svi_str = f"{svi:.4f}" if svi is not None else "—"
                st.write(f"**{entry['merchant']}** ({entry['cycle_type'] or 'Unknown cycle'})")
                st.caption(f"Cost: {cost_str} | Usage: {usage_str} | SVI: **{svi_str}** | Cancelled: {canceled_label}")
            with col_b:
                if svi is None:
                    st.info("No data")
                elif is_zombie:
                    st.error("LOW UTILITY")
                else:
                    st.success("GOOD VALUE")
            with col_c:
                if st.button("Add Back", key=f"restore_{entry['merchant']}", use_container_width=True):
                    restore_subscription(current_email, entry['merchant'])
                    st.toast(f"{entry['merchant']} added back to active subscriptions", icon=":material/check_circle:")
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

        st.markdown("---")
        if st.button("Generate Report"):
            st.session_state["show_report_download"] = True
            st.rerun()

        if st.session_state.get("show_report_download"):
            with st.spinner("Building report..."):
                report_bytes = build_transaction_report(current_email)
            st.download_button(
                "Download report (PDF)", data=report_bytes,
                file_name=f"subtracker_report_{current_email.split('@')[0]}.pdf",
                mime="application/pdf"
            )

    st.stop()

st.title("Autonomous Subscription Analysis & Cost Optimizer")

# Sidebar Controls
st.sidebar.title("Engine Configuration")

st.sidebar.subheader("NLP & Machine Learning Hyperparameters")
similarity_thresh = st.sidebar.slider("TF-IDF String Match Threshold", 0.50, 0.95, 0.75, 0.05)
eps_val = st.sidebar.slider("DBSCAN Epsilon (Eps)", 0.1, 1.0, 0.35, 0.05)
min_samples_val = st.sidebar.slider("Min Samples", 1, 5, 2)

st.sidebar.markdown("---")
st.sidebar.subheader("AI Features (Optional)")
gemini_available = gemini_client.is_configured()
if gemini_available:
    gemini_enabled = st.sidebar.toggle("Enable Gemini AI features", value=False, key="gemini_enabled")
    # Streamlit clears a widget-bound session_state key when that widget
    # isn't re-instantiated in a script run — and the Cancelled
    # Subscriptions page never renders this sidebar section at all (it
    # st.stop()s before reaching it), so build_transaction_report() reading
    # st.session_state["gemini_enabled"] directly would always see None
    # there even right after toggling this on. Mirrored into a plain,
    # non-widget key that survives regardless of which page is showing.
    st.session_state["gemini_enabled_persisted"] = gemini_enabled
    if gemini_enabled:
        st.sidebar.caption(
            "Transaction descriptions will be sent to Google's Gemini API for categorization, "
            "merchant grouping, and report summaries. This is the only place in the app that "
            "sends data off-device — everything else runs locally, per the README."
        )
        canonicalization_method = st.sidebar.radio(
            "Merchant grouping method", ["TF-IDF (local)", "Gemini (cloud)"], key="canon_method"
        )
    else:
        canonicalization_method = "TF-IDF (local)"
else:
    gemini_enabled = False
    canonicalization_method = "TF-IDF (local)"
    st.sidebar.caption("Gemini API key not configured — AI features unavailable.")

# Data source: upload + submit here on the main page (not tucked into the
# sidebar). A submitted CSV is parsed, standardized, and persisted to
# auth.db under this account — so it's still there on the next login, not
# just held in memory for this one run.
st.subheader("Data Source")
saved_df = get_user_transactions(current_email)

upload_col, submit_col = st.columns([4, 1])
with upload_col:
    uploaded_file = st.file_uploader(
        "Upload a bank/UPI CSV statement", type=["csv", "txt"],
        key="main_csv_uploader", label_visibility="collapsed"
    )
with submit_col:
    submit_clicked = st.button("Submit", type="primary", use_container_width=True)

if submit_clicked:
    if uploaded_file is None:
        st.error("Choose a CSV file first.")
    else:
        user_df = pd.read_csv(uploaded_file)
        standardized = standardize_csv_columns(user_df)
        if standardized.empty:
            st.error("Could not read that CSV — check it has Date, Description, and Amount columns.")
        else:
            save_user_transactions(current_email, standardized)
            # st.rerun() below is needed to pick up the newly saved data —
            # but it also wipes any st.success() from this same run before
            # it ever paints. Same fix as the Profile page's save flow:
            # persist the confirmation through session_state instead.
            st.session_state["csv_ingested_count"] = len(standardized)
            st.rerun()

if st.session_state.get("csv_ingested_count"):
    st.success(f"Ingested {st.session_state.pop('csv_ingested_count')} transactions and saved to your account.")

if saved_df is not None:
    raw_df = saved_df
    data_source_label = f"Your uploaded statement ({len(saved_df)} transactions, saved to your account)"
    if st.button("Use synthetic demo data instead"):
        clear_user_transactions(current_email)
        st.rerun()
else:
    raw_df = generate_mock_transactions()
    data_source_label = "Synthetic demo data (no statement uploaded yet)"

st.caption(f"Data source: {data_source_label}")

if gemini_enabled:
    with st.spinner("Categorizing transactions with Gemini..."):
        gemini_categories = gemini_client.categorize_transactions(raw_df['Description'].unique().tolist())
    if gemini_categories:
        raw_df['Category'] = raw_df['Description'].map(gemini_categories).fillna(raw_df['Category'])
    else:
        st.sidebar.warning("Gemini categorization failed (quota/network) — using existing categories.")

# Step 1: NLP Normalization Layer
st.subheader("1. Ingested Transactions & NLP Entity Canonicalization")

unique_descriptions = raw_df['Description'].unique().tolist()
name_mapping = None
if gemini_enabled and canonicalization_method == "Gemini (cloud)":
    with st.spinner("Grouping merchants with Gemini..."):
        name_mapping = gemini_client.canonicalize_merchants_llm(unique_descriptions)
    if name_mapping is None:
        st.warning("Gemini merchant grouping failed (quota/network) — falling back to local TF-IDF.")

if name_mapping is None:
    with st.spinner("Running TF-IDF & Cosine String Normalization..."):
        name_mapping = normalize_merchant_names(unique_descriptions, similarity_threshold=similarity_thresh)

raw_df['Canonical_Merchant'] = raw_df['Description'].map(name_mapping)

col_raw, col_nlp = st.columns(2)
with col_raw:
    st.markdown("**Raw Transaction Stream (Messy Inputs)**")
    st.dataframe(raw_df[['Date', 'Description', 'Amount']].head(8), use_container_width=True)

with col_nlp:
    st.markdown("**NLP Normalized Entities**")
    st.dataframe(raw_df[['Description', 'Canonical_Merchant']].drop_duplicates().head(8), use_container_width=True)

sub_summary, processed_df = detect_multi_cycle_subscriptions(raw_df, eps=eps_val, min_samples=min_samples_val)
detected_subs = sub_summary[sub_summary['Is_Subscription'] == True].copy() if not sub_summary.empty else pd.DataFrame()

# Subscriptions this user cancelled via the Kill Switch panel are gone for
# good — filtered here so they disappear from every tab and every metric at
# once, and it survives logout/login since it's stored in auth.db, not
# session state.
canceled = get_canceled_subscriptions(current_email)
if not detected_subs.empty and canceled:
    detected_subs = detected_subs[~detected_subs['Canonical_Merchant'].isin(canceled)]

st.markdown("---")

# Step 3: Analytics Dashboard
if not detected_subs.empty:
    # -------------------------------------------------------------
    # SVI (Subscription Value Index) Calculation Simulation
    # SVI = Monthly Active Usage Hours / Monthly Recurring Cost (₹)
    # Bank transactions carry no usage-time data, so "usage hours" is a
    # simulated stand-in (disclosed in the UI below) — but it must still be
    # STABLE per merchant. A random draw keyed only by row position would
    # reshuffle every other merchant's number the moment one subscription is
    # cancelled or a slider changes how many rows survive detection. Hashing
    # the merchant name into the same 1-60 range keeps each merchant's value
    # fixed regardless of who else is on the list. (stable_usage_hours is
    # defined near the top of the file, shared with build_transaction_report.)
    detected_subs['Mock_Usage_Hours'] = detected_subs['Canonical_Merchant'].apply(stable_usage_hours)
    detected_subs['SVI'] = detected_subs['Mock_Usage_Hours'] / detected_subs['Avg_Amount']
    detected_subs['SVI'] = detected_subs['SVI'].apply(lambda x: round(x, 4))

    st.subheader("2. ML-Clustered Subscriptions, SVI & Cost Analysis")
    st.caption("SVI = simulated usage hours ÷ monthly cost — a proxy metric, since bank transactions alone don't reveal real usage.")
    
    m1, m2, m3, m4 = st.columns(4)
    monthly_outflux = detected_subs[detected_subs['Cycle_Type'] == 'Monthly']['Avg_Amount'].sum()
    
    m1.metric("Active Subscriptions", f"{len(detected_subs)}")
    m2.metric("Monthly Recurring Spend", f"₹{monthly_outflux:,.2f}")
    
    zombie_count = len(detected_subs[detected_subs['SVI'] < 0.05])
    m3.metric("Zombie Subscriptions", f"{zombie_count} Detected")
    
    m4.metric("NLP Grouping Efficiency", f"{len(raw_df['Description'].unique()) - len(raw_df['Canonical_Merchant'].unique())} Merged")

    tab1, tab2, tab3 = st.tabs(["Subscriptions & SVI", "30-Day Predictive Cashflow", "Kill Switch Action Panel"])

    with tab1:
        st.dataframe(
            detected_subs[['Canonical_Merchant', 'Cycle_Type', 'Avg_Amount', 'Mock_Usage_Hours', 'SVI', 'Avg_Interval_Days', 'Last_Paid']],
            use_container_width=True
        )
        
        fig_bar = px.bar(
            detected_subs,
            x='Canonical_Merchant',
            y='Avg_Amount',
            color='Cycle_Type',
            title="Recurring Spend Breakdown by Billing Cycle",
            template="plotly_dark",
            labels={'Canonical_Merchant': 'Merchant', 'Avg_Amount': 'Avg Monthly Cost (₹)', 'Cycle_Type': 'Billing Cycle'},
        )
        fig_bar.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig_bar, use_container_width=True)

        # Bubble size no longer duplicates the x-axis (both were Avg_Amount,
        # which added no information) — every bubble is now a fixed, legible
        # size, and color is the only encoding for SVI (cost is read from x,
        # usage from y, value from color).
        fig_scatter = px.scatter(
            detected_subs,
            x='Avg_Amount',
            y='Mock_Usage_Hours',
            color='SVI',
            hover_name='Canonical_Merchant',
            title="SVI Quadrant Analysis (Cost vs Usage)",
            template="plotly_dark",
            color_continuous_scale="RdYlGn",
            labels={'Avg_Amount': 'Avg Monthly Cost (₹)', 'Mock_Usage_Hours': 'Est. Monthly Usage (Hours)', 'SVI': 'SVI'},
        )
        fig_scatter.update_traces(marker=dict(size=16, line=dict(width=1, color='rgba(255,255,255,0.35)')))
        fig_scatter.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig_scatter, use_container_width=True)

    with tab2:
        st.markdown("### Projected Auto-Debits for Next 30 Days")
        
        forecast_data = []
        for idx, row in detected_subs.iterrows():
            next_bill = row['Last_Paid'] + timedelta(days=int(row['Avg_Interval_Days']))
            forecast_data.append({
                'Merchant': row['Canonical_Merchant'],
                'Cycle': row['Cycle_Type'],
                'Expected Date': next_bill.strftime("%Y-%m-%d"),
                'Amount (₹)': row['Avg_Amount']
            })
            
        forecast_df = pd.DataFrame(forecast_data)
        st.table(forecast_df)

    with tab3:
        st.markdown("### Kill Switch Action Panel")
        st.caption("Zombie subscriptions (SVI below 0.05) are flagged for review.")
        if st.button("Cancelled Subscriptions", key="goto_cancelled"):
            st.session_state["nav_page_request"] = "Cancelled Subscriptions"
            st.rerun()
        st.markdown("---")
        for idx, row in detected_subs.iterrows():
            is_zombie = row['SVI'] < 0.05

            card_class = "metric-card zombie-sub" if is_zombie else "metric-card good-sub"

            st.markdown(f'<div class="{card_class}">', unsafe_allow_html=True)
            col_a, col_b, col_c = st.columns([2, 1, 1])
            with col_a:
                st.write(f"**{row['Canonical_Merchant']}** ({row['Cycle_Type']})")
                st.caption(f"Cost: ₹{row['Avg_Amount']:,.2f} | Usage: {row['Mock_Usage_Hours']} Hrs | SVI: **{row['SVI']:.4f}**")
            with col_b:
                if is_zombie:
                    st.error("LOW UTILITY")
                else:
                    st.success("GOOD VALUE")
            with col_c:
                if st.button("Cancel Subscription", key=f"btn_p2_{idx}"):
                    cancel_subscription(
                        current_email, row['Canonical_Merchant'],
                        avg_amount=float(row['Avg_Amount']), cycle_type=row['Cycle_Type'],
                        svi=float(row['SVI']), usage_hours=int(row['Mock_Usage_Hours'])
                    )
                    st.toast(f"Cancellation alert issued for {row['Canonical_Merchant']}", icon=":material/check_circle:")
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)
