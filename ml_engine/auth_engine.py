import sqlite3
import secrets
import hashlib
import os
from datetime import datetime, timedelta

DB_FILE = 'auth.db'
PBKDF2_ITERATIONS = 390_000

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS magic_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN NOT NULL DEFAULT 0,
            ip_address TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS canceled_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            merchant TEXT NOT NULL,
            canceled_at TIMESTAMP NOT NULL,
            UNIQUE(email, merchant)
        )
    ''')
    existing_cancel_cols = {row[1] for row in c.execute("PRAGMA table_info(canceled_subscriptions)").fetchall()}
    cancel_new_columns = {
        'avg_amount': 'REAL',
        'cycle_type': 'TEXT',
        'svi': 'REAL',
        'usage_hours': 'INTEGER',
    }
    for col_name, col_type in cancel_new_columns.items():
        if col_name not in existing_cancel_cols:
            c.execute(f'ALTER TABLE canceled_subscriptions ADD COLUMN {col_name} {col_type}')

    c.execute('''
        CREATE TABLE IF NOT EXISTS user_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT,
            time TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_profiles (
            email TEXT PRIMARY KEY,
            full_name TEXT,
            bio TEXT,
            updated_at TIMESTAMP NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            salt BLOB NOT NULL,
            password_hash BLOB NOT NULL,
            created_at TIMESTAMP NOT NULL
        )
    ''')

    # Schema grew after user_profiles already existed on disk in earlier
    # runs — add the new columns rather than requiring a fresh DB.
    existing_cols = {row[1] for row in c.execute("PRAGMA table_info(user_profiles)").fetchall()}
    new_columns = {
        'phone': 'TEXT',
        'email_verified': 'INTEGER NOT NULL DEFAULT 0',
        'phone_verified': 'INTEGER NOT NULL DEFAULT 0',
        'profile_pic': 'BLOB',
        'profile_pic_type': 'TEXT',
    }
    for col_name, col_type in new_columns.items():
        if col_name not in existing_cols:
            c.execute(f'ALTER TABLE user_profiles ADD COLUMN {col_name} {col_type}')

    c.execute('''
        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            purpose TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN NOT NULL DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()


def _hash_password(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ITERATIONS)


def check_password(email, password):
    """
    Real credential check backed by a local users table (PBKDF2-SHA256,
    salted). The first time an email is used with a password, that
    password is what the account is created with — every login after
    that must match it. This replaces the old `elif email and password`
    check, which accepted any non-empty password for any email.
    Returns (success_bool, message).
    """
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT salt, password_hash FROM users WHERE email = ?', (email,))
    row = c.fetchone()

    if row is None:
        # First time this email has been used — create the account with
        # the password just entered.
        salt = os.urandom(16)
        pw_hash = _hash_password(password, salt)
        c.execute(
            'INSERT INTO users (email, salt, password_hash, created_at) VALUES (?, ?, ?, ?)',
            (email, salt, pw_hash, datetime.utcnow())
        )
        conn.commit()
        conn.close()
        return True, "Account created."

    salt, stored_hash = row
    candidate = _hash_password(password, salt)
    conn.close()

    if secrets.compare_digest(candidate, stored_hash):
        return True, "Welcome back."
    return False, "Incorrect password for this email."


def email_taken(email):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT 1 FROM users WHERE email = ?', (email,))
    taken = c.fetchone() is not None
    conn.close()
    return taken


def rename_account_email(old_email, new_email):
    """
    The account email is the primary key across users, user_profiles,
    canceled_subscriptions, and otp_codes — changing it from the profile
    page is a real identity migration, not a cosmetic field edit. Runs as
    one transaction so a failure partway through can't split an account
    across two email identities. Resets email_verified to 0 on the new
    address, since owning the old address doesn't prove ownership of the
    new one. Returns (success_bool, message).
    """
    new_email = new_email.strip()
    if not new_email or '@' not in new_email:
        return False, "Enter a valid email address."
    if new_email == old_email:
        return True, "unchanged"
    if email_taken(new_email):
        return False, "That email is already in use by another account."

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    try:
        c.execute('UPDATE users SET email = ? WHERE email = ?', (new_email, old_email))
        c.execute('UPDATE user_profiles SET email = ?, email_verified = 0 WHERE email = ?', (new_email, old_email))
        c.execute('UPDATE canceled_subscriptions SET email = ? WHERE email = ?', (new_email, old_email))
        c.execute('UPDATE otp_codes SET email = ? WHERE email = ?', (new_email, old_email))
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        conn.close()
        return False, f"Could not update email: {e}"
    conn.close()
    return True, "Email updated."


def cancel_subscription(email, merchant, avg_amount=None, cycle_type=None, svi=None, usage_hours=None):
    """
    Snapshots the subscription's cost/cycle/SVI/usage at the moment of
    cancellation. Without this, the Cancelled Subscriptions page would have
    to re-run detection on whatever the current data happens to be to show
    any detail at all — and a merchant that no longer appears in the
    current stream (or falls out of detection after a slider change) would
    show nothing. The snapshot makes cancellation history durable and
    independent of what's currently being analyzed.
    """
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO canceled_subscriptions (email, merchant, canceled_at, avg_amount, cycle_type, svi, usage_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email, merchant) DO UPDATE SET
            canceled_at=excluded.canceled_at, avg_amount=excluded.avg_amount,
            cycle_type=excluded.cycle_type, svi=excluded.svi, usage_hours=excluded.usage_hours
    ''', (email, merchant, datetime.utcnow(), avg_amount, cycle_type, svi, usage_hours))
    conn.commit()
    conn.close()


def get_canceled_subscriptions(email):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT merchant FROM canceled_subscriptions WHERE email = ?', (email,))
    rows = c.fetchall()
    conn.close()
    return {row[0] for row in rows}


def get_canceled_subscriptions_detailed(email):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        SELECT merchant, canceled_at, avg_amount, cycle_type, svi, usage_hours
        FROM canceled_subscriptions WHERE email = ? ORDER BY canceled_at DESC
    ''', (email,))
    rows = c.fetchall()
    conn.close()
    return [
        {
            "merchant": r[0], "canceled_at": r[1], "avg_amount": r[2],
            "cycle_type": r[3], "svi": r[4], "usage_hours": r[5],
        }
        for r in rows
    ]


def restore_subscription(email, merchant):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM canceled_subscriptions WHERE email = ? AND merchant = ?', (email, merchant))
    conn.commit()
    conn.close()


def save_user_transactions(email, df):
    """Replaces this user's saved transaction stream with df (Date, Description, Amount, Category[, Time])."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM user_transactions WHERE email = ?', (email,))
    rows = [
        (
            email,
            str(row.get('Date', '')),
            str(row.get('Description', '')),
            float(row.get('Amount', 0) or 0),
            str(row.get('Category', '')) if row.get('Category') is not None else None,
            str(row.get('Time', '')) if row.get('Time') is not None else None,
        )
        for _, row in df.iterrows()
    ]
    c.executemany('''
        INSERT INTO user_transactions (email, date, description, amount, category, time)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', rows)
    conn.commit()
    conn.close()


def get_user_transactions(email):
    """Returns a DataFrame of this user's saved transactions, or None if they haven't uploaded any."""
    import pandas as pd
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query(
        'SELECT date AS "Date", description AS "Description", amount AS "Amount", category AS "Category", time AS "Time" '
        'FROM user_transactions WHERE email = ?',
        conn, params=(email,)
    )
    conn.close()
    return df if not df.empty else None


def clear_user_transactions(email):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM user_transactions WHERE email = ?', (email,))
    conn.commit()
    conn.close()


def save_profile(email, full_name, bio, phone=None, profile_pic=None, profile_pic_type=None):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    if profile_pic is not None:
        c.execute('''
            INSERT INTO user_profiles (email, full_name, bio, phone, profile_pic, profile_pic_type, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                full_name=excluded.full_name, bio=excluded.bio, phone=excluded.phone,
                profile_pic=excluded.profile_pic, profile_pic_type=excluded.profile_pic_type,
                updated_at=excluded.updated_at
        ''', (email, full_name, bio, phone, profile_pic, profile_pic_type, datetime.utcnow()))
    else:
        # No new picture uploaded this save — leave whatever is already stored alone.
        c.execute('''
            INSERT INTO user_profiles (email, full_name, bio, phone, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                full_name=excluded.full_name, bio=excluded.bio, phone=excluded.phone,
                updated_at=excluded.updated_at
        ''', (email, full_name, bio, phone, datetime.utcnow()))
    conn.commit()
    conn.close()


def get_profile(email):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        SELECT full_name, bio, phone, email_verified, phone_verified, profile_pic, profile_pic_type
        FROM user_profiles WHERE email = ?
    ''', (email,))
    row = c.fetchone()
    conn.close()
    if row is None:
        return {
            "full_name": "", "bio": "", "phone": "",
            "email_verified": False, "phone_verified": False,
            "profile_pic": None, "profile_pic_type": None,
        }
    return {
        "full_name": row[0] or "", "bio": row[1] or "", "phone": row[2] or "",
        "email_verified": bool(row[3]), "phone_verified": bool(row[4]),
        "profile_pic": row[5], "profile_pic_type": row[6],
    }


def request_otp(email, purpose, rate_limit_max=5):
    """
    purpose: 'email' or 'phone'. Generates a 6-digit code, stores only its
    hash (never the raw code) with a 10-minute expiry, same pattern as the
    magic-link tokens above. Returns (raw_code, error) — the raw code is
    for on-screen demo display only, since no SMTP/SMS provider is wired
    up; a real deployment would send it out-of-band instead of returning it.
    """
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
    c.execute(
        'SELECT COUNT(*) FROM otp_codes WHERE email = ? AND purpose = ? AND created_at > ?',
        (email, purpose, ten_mins_ago)
    )
    if c.fetchone()[0] >= rate_limit_max:
        conn.close()
        return None, "Too many codes requested. Please wait a few minutes."

    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(minutes=10)

    c.execute('''
        INSERT INTO otp_codes (email, purpose, code_hash, created_at, expires_at, used)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (email, purpose, code_hash, created_at, expires_at))
    conn.commit()
    conn.close()
    return code, None


def verify_otp(email, purpose, code):
    """Returns (success_bool, message). On success, marks the corresponding
    *_verified flag on user_profiles."""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    code_hash = hashlib.sha256((code or "").encode()).hexdigest()

    c.execute('''
        SELECT id, expires_at, used FROM otp_codes
        WHERE email = ? AND purpose = ? AND code_hash = ?
        ORDER BY id DESC LIMIT 1
    ''', (email, purpose, code_hash))
    row = c.fetchone()

    if not row:
        conn.close()
        return False, "Incorrect code."

    otp_id, expires_at_str, used = row
    expires_at = datetime.strptime(expires_at_str, "%Y-%m-%d %H:%M:%S.%f")

    if used:
        conn.close()
        return False, "This code has already been used."
    if datetime.utcnow() > expires_at:
        conn.close()
        return False, "This code has expired."

    c.execute('UPDATE otp_codes SET used = 1 WHERE id = ?', (otp_id,))
    verified_col = 'email_verified' if purpose == 'email' else 'phone_verified'
    c.execute(f'''
        INSERT INTO user_profiles (email, updated_at, {verified_col})
        VALUES (?, ?, 1)
        ON CONFLICT(email) DO UPDATE SET {verified_col}=1, updated_at=excluded.updated_at
    ''', (email, datetime.utcnow()))
    conn.commit()
    conn.close()
    return True, "Verified."

def generate_magic_link(email, ip_address="127.0.0.1"):
    """
    Generates a cryptographically secure token, stores the hash, 
    and handles rate limiting (max 3 per 10 mins).
    Returns the raw token to be embedded in the URL.
    """
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Rate Limiting Check
    ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
    c.execute('''
        SELECT COUNT(*) FROM magic_links 
        WHERE email = ? AND created_at > ?
    ''', (email, ten_mins_ago))
    count = c.fetchone()[0]
    
    if count >= 3:
        conn.close()
        return None, "Rate limit exceeded. Please wait 10 minutes."
    
    # Generate Token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(minutes=10)
    
    c.execute('''
        INSERT INTO magic_links (email, token_hash, created_at, expires_at, used, ip_address)
        VALUES (?, ?, ?, ?, 0, ?)
    ''', (email, token_hash, created_at, expires_at, ip_address))
    
    conn.commit()
    conn.close()
    
    return raw_token, None

def verify_magic_link(email, raw_token):
    """
    Verifies the token hash, checks expiry, and ensures it hasn't been used.
    If valid, marks it as used.
    Returns (success_bool, message).
    """
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    c.execute('''
        SELECT id, expires_at, used FROM magic_links 
        WHERE email = ? AND token_hash = ?
    ''', (email, token_hash))
    
    record = c.fetchone()
    
    if not record:
        conn.close()
        return False, "Invalid link or email."
        
    link_id, expires_at_str, used = record
    expires_at = datetime.strptime(expires_at_str, "%Y-%m-%d %H:%M:%S.%f")
    
    if used:
        conn.close()
        return False, "This magic link has already been used."
        
    if datetime.utcnow() > expires_at:
        conn.close()
        return False, "This magic link has expired."
        
    # Valid - Mark as used
    c.execute('''
        UPDATE magic_links SET used = 1 WHERE id = ?
    ''', (link_id,))
    conn.commit()
    conn.close()
    
    return True, "Successfully authenticated!"
