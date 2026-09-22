"""Local account auth + per-user subscription-cancellation state.

Deliberately has no Streamlit imports. app.py is the only caller today,
but keeping this UI-free means it can sit behind a future API layer
(FastAPI, etc.) without changes to the auth logic itself.
"""
import sqlite3
import hashlib
import os
import secrets
import urllib.error
import urllib.request
from contextlib import contextmanager
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vault.db")
PBKDF2_ITERATIONS = 390_000


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with _connect() as conn:
        # An earlier iteration of this project had a per-entry password
        # vault (encrypted with a key derived from the login password) —
        # that feature was cut in favor of a single app-wide login gate.
        # If a users table from that schema is still on disk, rebuild it
        # rather than fail on the missing enc_salt column.
        existing_cols = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
        if "enc_salt" in existing_cols:
            conn.execute("DROP TABLE IF EXISTS vault_items")
            conn.execute("DROP TABLE IF EXISTS users")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                auth_salt BLOB NOT NULL,
                auth_hash BLOB NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS canceled_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                canceled_at TEXT NOT NULL,
                UNIQUE(user_id, description)
            )
        """)


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)


def create_user(username: str, password: str):
    username = username.strip()
    if not username or not password:
        raise ValueError("Username and password are required.")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")

    salt = os.urandom(16)
    auth_hash = _derive(password, salt)

    with _connect() as conn:
        try:
            conn.execute(
                "INSERT INTO users (username, auth_salt, auth_hash, created_at) VALUES (?, ?, ?, ?)",
                (username, salt, auth_hash, datetime.now(timezone.utc).isoformat()),
            )
        except sqlite3.IntegrityError:
            raise ValueError("That username is already taken.")


def authenticate(username: str, password: str):
    """Returns the user_id on success, else None."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, auth_salt, auth_hash FROM users WHERE username = ?",
            (username.strip(),),
        ).fetchone()

    if row is None:
        return None

    candidate = _derive(password, row["auth_salt"])
    if not secrets.compare_digest(candidate, row["auth_hash"]):
        return None
    return row["id"]


def cancel_subscription(user_id: int, description: str):
    with _connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO canceled_subscriptions (user_id, description, canceled_at) "
            "VALUES (?, ?, ?)",
            (user_id, description, datetime.now(timezone.utc).isoformat()),
        )


def get_canceled_subscriptions(user_id: int) -> set:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT description FROM canceled_subscriptions WHERE user_id = ?", (user_id,)
        ).fetchall()
    return {row["description"] for row in rows}


def check_pwned(password: str, timeout: float = 3.0) -> int:
    """Checks a password against the Have I Been Pwned Pwned Passwords API.

    Uses k-anonymity: only the first 5 hex characters of the SHA-1 hash are
    ever sent over the network, so the full password never leaves this
    machine, not even hashed in full. No API key required.

    Returns the number of known breaches the password appeared in (0 = not
    found), or -1 if the check could not be completed (e.g. offline) —
    callers must treat -1 as "unknown", not "safe".
    """
    sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]

    try:
        req = urllib.request.Request(
            f"https://api.pwnedpasswords.com/range/{prefix}",
            headers={"User-Agent": "SubTracker-Vault"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
    except (urllib.error.URLError, OSError):
        return -1

    for line in body.splitlines():
        line_suffix, _, count = line.partition(":")
        if line_suffix == suffix:
            return int(count)
    return 0
