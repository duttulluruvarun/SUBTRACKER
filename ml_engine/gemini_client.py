"""
Optional Gemini-powered features: transaction categorization, merchant
canonicalization, and report narrative generation.

Entirely opt-in and fail-safe — every public function here returns None on
any error (missing key, quota, network, malformed response) rather than
raising, so the rest of the app never has a hard dependency on this working.
Kept as a separate module so the core local ML pipeline (TF-IDF + DBSCAN,
described in README.md as running fully on-device) has zero import-time
dependency on it — the privacy-first claim stays true unless the user
explicitly opts in via the sidebar toggle in app.py.
"""
import json
import streamlit as st

MODEL = "gemini-flash-latest"


def is_configured():
    try:
        return bool(st.secrets.get("GEMINI_API_KEY"))
    except Exception:
        return False


@st.cache_resource(show_spinner=False)
def _get_client():
    from google import genai
    return genai.Client(api_key=st.secrets["GEMINI_API_KEY"])


def _json_call(prompt):
    from google.genai import types
    client = _get_client()
    resp = client.models.generate_content(
        model=MODEL, contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return json.loads(resp.text)


@st.cache_data(show_spinner=False)
def categorize_transactions(descriptions):
    """descriptions: list of unique raw description strings.
    Returns {description: category}, or None on failure.

    Cached on the exact description list — Streamlit reruns this whole
    script on every widget interaction (a button click, a slider nudge),
    and without caching this would re-call the Gemini API on every single
    one of those reruns even though the input data hadn't changed, turning
    a single click into a multi-second round trip every time.
    """
    if not descriptions or not is_configured():
        return None
    try:
        prompt = (
            "Classify each of these bank/UPI transaction descriptions into exactly one "
            "short, general spending category (e.g. Entertainment, Food, Transport, "
            "Shopping, Fitness, Cloud/SaaS, AI Tool, Utilities, Groceries, One-Time Spend). "
            "Respond with a JSON object mapping each input string to its category, using "
            "the exact input strings as keys.\n\n"
            f"Descriptions: {json.dumps(descriptions)}"
        )
        result = _json_call(prompt)
        return {k: v for k, v in result.items() if k in descriptions}
    except Exception:
        return None


@st.cache_data(show_spinner=False)
def canonicalize_merchants_llm(descriptions):
    """descriptions: list of unique raw description strings.
    Returns {description: canonical_merchant_name}, or None on failure.
    Cached for the same reason as categorize_transactions above."""
    if not descriptions or not is_configured():
        return None
    try:
        prompt = (
            "These are raw bank/UPI transaction descriptions, often with gateway prefixes "
            "(UPI/, POS-, RAZORPAY-), reference numbers, and city names mixed in. Group "
            "descriptions that refer to the SAME real-world merchant under one clean "
            "canonical name (e.g. 'UPI/NETFLIX RECURRING AUTOPAY/1234' and "
            "'POS-NETFLIX-MUMBAI' should both map to 'NETFLIX'). Respond with a JSON object "
            "mapping each exact input string to its canonical merchant name.\n\n"
            f"Descriptions: {json.dumps(descriptions)}"
        )
        result = _json_call(prompt)
        return {k: v for k, v in result.items() if k in descriptions}
    except Exception:
        return None


def generate_narrative(active_subs, cancelled_subs, monthly_spend, zombie_count):
    """active_subs / cancelled_subs: list of plain dicts (merchant, cycle,
    cost, usage, svi). Returns a short narrative string, or None on failure."""
    if not is_configured():
        return None
    try:
        client = _get_client()
        prompt = (
            "Write a short (120-180 word), plain-language paragraph summarizing this "
            "person's subscription spending for a financial report. Be specific about "
            "which subscriptions are worth keeping and which aren't, using the SVI values "
            "given (SVI = usage hours / monthly cost; below 0.05 is low utility). Do not "
            "invent any numbers not given below. Do not use markdown formatting.\n\n"
            f"Monthly commitment: Rs. {monthly_spend:,.2f}\n"
            f"Low-utility count: {zombie_count}\n"
            f"Active subscriptions: {json.dumps(active_subs)}\n"
            f"Recently cancelled: {json.dumps(cancelled_subs)}\n"
        )
        resp = client.models.generate_content(model=MODEL, contents=prompt)
        return resp.text.strip()
    except Exception:
        return None
