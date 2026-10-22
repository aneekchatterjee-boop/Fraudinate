import sqlite3
from pathlib import Path
from datetime import datetime


# Database file will be created inside the Backend folder
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fraudinate.db"


def get_connection():
    """Create and return a connection to the SQLite database."""
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    """Create the transactions table if it does not already exist."""
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_bank TEXT NOT NULL,
            sender_account TEXT NOT NULL,
            receiver_bank TEXT NOT NULL,
            receiver_account TEXT NOT NULL,
            amount REAL NOT NULL,
            velocity INTEGER DEFAULT 0,
            account_age INTEGER DEFAULT 0,
            recipients INTEGER DEFAULT 0,
            risk_score INTEGER DEFAULT 0,
            decision TEXT DEFAULT 'ALLOW',
            signals TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def insert_transaction(transaction):
    """Insert a transaction into the database and return its ID."""
    connection = get_connection()

    cursor = connection.execute("""
        INSERT INTO transactions (
            sender_bank,
            sender_account,
            receiver_bank,
            receiver_account,
            amount,
            velocity,
            account_age,
            recipients,
            risk_score,
            decision,
            signals,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        transaction["sender_bank"],
        transaction["sender_account"],
        transaction["receiver_bank"],
        transaction["receiver_account"],
        transaction["amount"],
        transaction.get("velocity", 0),
        transaction.get("account_age", 0),
        transaction.get("recipients", 0),
        transaction.get("risk_score", 0),
        transaction.get("decision", "ALLOW"),
        ",".join(transaction.get("signals", [])),
        transaction.get("created_at", datetime.now().isoformat())
    ))

    transaction_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return transaction_id


def get_transactions():
    """Return all transactions, newest first."""
    connection = get_connection()

    rows = connection.execute("""
        SELECT *
        FROM transactions
        ORDER BY id DESC
    """).fetchall()

    connection.close()

    transactions = []

    for row in rows:
        transaction = dict(row)

        if transaction["signals"]:
            transaction["signals"] = transaction["signals"].split(",")
        else:
            transaction["signals"] = []

        transactions.append(transaction)

    return transactions


def get_transaction(transaction_id):
    """Return a single transaction by ID."""
    connection = get_connection()

    row = connection.execute("""
        SELECT *
        FROM transactions
        WHERE id = ?
    """, (transaction_id,)).fetchone()

    connection.close()

    if row is None:
        return None

    transaction = dict(row)

    if transaction["signals"]:
        transaction["signals"] = transaction["signals"].split(",")
    else:
        transaction["signals"] = []

    return transaction


def get_transaction_counts():
    """Return basic transaction statistics."""
    connection = get_connection()

    total = connection.execute("""
        SELECT COUNT(*) AS count
        FROM transactions
    """).fetchone()["count"]

    blocked = connection.execute("""
        SELECT COUNT(*) AS count
        FROM transactions
        WHERE decision = 'BLOCK'
    """).fetchone()["count"]

    high_risk = connection.execute("""
        SELECT COUNT(*) AS count
        FROM transactions
        WHERE risk_score >= 70
    """).fetchone()["count"]

    connection.close()

    return {
        "transactions_processed": total,
        "transactions_blocked": blocked,
        "high_risk_transactions": high_risk
    }