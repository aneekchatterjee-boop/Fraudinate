import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Make the Fraudinate project root available so the ML package can be imported.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.feature_extractor import extract_features
from ml.risk_fusion import risk_fusion


def _to_ml_timestamp(value):
    """Convert Fraudinate ISO timestamps to the format expected by the ML package."""
    try:
        dt = datetime.fromisoformat(value)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def _build_compat_db(transactions):
    """
    Build a temporary SQLite database using the schema expected by
    the team's ML feature extractor.

    The original Fraudinate database is NOT modified.
    """
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row

    conn.executescript("""
        CREATE TABLE accounts (
            account_id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            balance REAL NOT NULL,
            profile_type TEXT NOT NULL,
            bank_code TEXT NOT NULL
        );

        CREATE TABLE transactions (
            id INTEGER PRIMARY KEY,
            sender_account_id TEXT NOT NULL,
            receiver_account_id TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
    """)

    accounts = {}

    for tx in transactions:
        sender = tx["sender_account"]
        receiver = tx["receiver_account"]

        sender_age = max(int(tx.get("account_age", 365)), 1)

        if sender not in accounts:
            accounts[sender] = {
                "age": sender_age,
                "bank": tx["sender_bank"],
            }

        if receiver not in accounts:
            accounts[receiver] = {
                "age": 365,
                "bank": tx["receiver_bank"],
            }

    # Derived/simulated account metadata.
    # This does NOT represent real banking/KYC data.
    for account_id, info in accounts.items():
        created_at = (
            datetime.utcnow() - timedelta(days=info["age"])
        ).strftime("%Y-%m-%d %H:%M:%S")

        conn.execute(
            """
            INSERT INTO accounts
                (account_id, created_at, balance, profile_type, bank_code)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                account_id,
                created_at,
                100000.0,
                "SALARIED",
                info["bank"],
            ),
        )

    for tx in transactions:
        decision = tx.get("decision", "ALLOW")

        if decision == "HOLD":
            status = "HELD"
        elif decision == "BLOCK":
            status = "BLOCKED"
        else:
            status = "SUCCESS"

        conn.execute(
            """
            INSERT INTO transactions
                (id, sender_account_id, receiver_account_id,
                 amount, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                int(tx["id"]),
                tx["sender_account"],
                tx["receiver_account"],
                float(tx["amount"]),
                status,
                _to_ml_timestamp(tx["created_at"]),
            ),
        )

    conn.commit()
    return conn


def analyze_with_ml(transaction, historical_transactions, topology_score=0.0):
    """
    Run the team's ML pipeline against a Fraudinate transaction.

    Returns a result compatible with the existing Fraudinate backend.
    """
    compat_conn = _build_compat_db(historical_transactions)

    try:
        sender = transaction["sender_account"]
        receiver = transaction["receiver_account"]
        amount = float(transaction["amount"])

        features = extract_features(
            compat_conn,
            sender,
            amount,
            receiver,
        )

        ml_result = risk_fusion.score(
            features,
            topology_score=topology_score,
        )

        composite = float(ml_result.get("composite", 0.0))
        score = round(max(0.0, min(100.0, composite * 100)))

        # Fraudinate keeps its three-action decision system.
        # The ML package itself produces ALLOW/HOLD, so BLOCK is
        # applied by the existing Fraudinate high-risk policy.
        if score >= 75:
            decision = "BLOCK"
        elif score >= 45:
            decision = "HOLD"
        else:
            decision = "ALLOW"

        signals = []

        if ml_result.get("p_gbm") is not None:
            signals.append(
                f"GBM RISK {float(ml_result['p_gbm']) * 100:.1f}%"
            )

        if ml_result.get("s_iso") is not None:
            signals.append(
                f"ISOLATION FOREST {float(ml_result['s_iso']) * 100:.1f}%"
            )

        if ml_result.get("p_river") is not None:
            signals.append(
                f"RIVER RISK {float(ml_result['p_river']) * 100:.1f}%"
            )

        if topology_score > 0:
            signals.append(
                f"NETWORK RISK {float(topology_score):.1f}%"
            )

        for feature_name, importance in ml_result.get("top_features", [])[:3]:
            signals.append(
                f"ML FEATURE: {feature_name}"
            )

        return {
            "score": score,
            "decision": decision,
            "signals": signals,
            "ml_composite": composite,
            "p_gbm": ml_result.get("p_gbm", 0.0),
            "s_iso": ml_result.get("s_iso", 0.0),
            "p_river": ml_result.get("p_river", 0.0),
            "top_features": ml_result.get("top_features", []),
            "circuit_breaker": ml_result.get("circuit_breaker"),
        }

    finally:
        compat_conn.close()