"""
ml/feature_extractor.py
Adversarial-resistant feature engineering for Fraudinate.
All features are computed from SQLite via sync connection.
"""
import sys, math, sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Sub-threshold smurfing window: ₹45,000–₹49,999 (just under ₹50k)
SMURF_LOW  = 45_000
SMURF_HIGH = 49_999


def _rows(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> List[sqlite3.Row]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(sql, params)
    return cur.fetchall()


def _scalar(conn: sqlite3.Connection, sql: str, params: tuple = (), default=0.0):
    cur = conn.cursor()
    cur.execute(sql, params)
    row = cur.fetchone()
    return row[0] if row and row[0] is not None else default


# ---------------------------------------------------------------------------
# Rolling outflow sums (multi-horizon)
# ---------------------------------------------------------------------------
def _outflow_window(conn: sqlite3.Connection, account_id: str, hours: float) -> float:
    since = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    return float(_scalar(conn, """
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE sender_account_id = ?
          AND status IN ('SUCCESS','HELD')
          AND timestamp >= ?
    """, (account_id, since)))


def _inflow_window(conn: sqlite3.Connection, account_id: str, hours: float) -> float:
    since = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    return float(_scalar(conn, """
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE receiver_account_id = ?
          AND status IN ('SUCCESS','HELD')
          AND timestamp >= ?
    """, (account_id, since)))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def extract_features(conn: sqlite3.Connection,
                     account_id: str,
                     amount: float,
                     receiver_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Return a flat dict of features for a proposed transaction.
    All features are computable from the SQLite DB only.
    """
    now = datetime.utcnow()

    # --- Account metadata ---
    acct_row = _rows(conn, """
        SELECT created_at, balance, profile_type, bank_code
        FROM accounts WHERE account_id = ?
    """, (account_id,))
    if not acct_row:
        return _cold_start_features(amount)

    acct = acct_row[0]
    created_at = datetime.fromisoformat(acct["created_at"])
    account_age_days = max((now - created_at).days, 1)
    balance = float(acct["balance"])
    account_type = acct["profile_type"]

    # Confidence weight: C = 1 - exp(-N/10) where N = total txn count
    N = int(_scalar(conn, """
        SELECT COUNT(*) FROM transactions
        WHERE sender_account_id = ? OR receiver_account_id = ?
    """, (account_id, account_id)))
    confidence = 1.0 - math.exp(-N / 10.0)

    # --- Historical stats for this account ---
    hist_amounts = [
        float(r[0]) for r in _rows(conn, """
            SELECT amount FROM transactions
            WHERE sender_account_id = ?
              AND status = 'SUCCESS'
            ORDER BY timestamp DESC LIMIT 200
        """, (account_id,))
    ]
    median_tx = _median(hist_amounts) if hist_amounts else amount

    # --- Multi-horizon outflows ---
    out_5m  = _outflow_window(conn, account_id, hours=5/60)
    out_1h  = _outflow_window(conn, account_id, hours=1)
    out_24h = _outflow_window(conn, account_id, hours=24)
    out_7d  = _outflow_window(conn, account_id, hours=168)
    out_30d = _outflow_window(conn, account_id, hours=720)

    in_1h  = _inflow_window(conn, account_id, hours=1)
    in_24h = _inflow_window(conn, account_id, hours=24)

    # --- Feature: volume_to_age_ratio ---
    volume_to_age_ratio = out_30d / account_age_days

    # --- Feature: burst_to_median_ratio ---
    burst_to_median_ratio = (amount / median_tx) if median_tx > 0 else 1.0

    # --- Feature: retention_drain_ratio_1h / 24h ---
    # How much of the inflow was immediately drained out?
    retention_drain_ratio_1h  = (out_1h  / in_1h)  if in_1h  > 0 else 0.0
    retention_drain_ratio_24h = (out_24h / in_24h) if in_24h > 0 else 0.0

    # --- Feature: counterparty_entropy ---
    bene_rows = _rows(conn, """
        SELECT receiver_account_id, COUNT(*) as cnt
        FROM transactions
        WHERE sender_account_id = ?
          AND status IN ('SUCCESS','HELD')
          AND timestamp >= ?
        GROUP BY receiver_account_id
    """, (account_id, (now - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")))
    counterparty_entropy = _shannon_entropy([r["cnt"] for r in bene_rows])

    # --- Feature: pingpong_balance_ratio (Sybil wash-trading) ---
    # Fraction of inflow that came FROM the same set of outflow destinations
    if receiver_id:
        pingpong = float(_scalar(conn, """
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions
            WHERE sender_account_id = ?
              AND receiver_account_id = ?
              AND status IN ('SUCCESS','HELD')
              AND timestamp >= ?
        """, (receiver_id, account_id, (now - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"))))
        out_to_recv = float(_scalar(conn, """
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions
            WHERE sender_account_id = ?
              AND receiver_account_id = ?
              AND status IN ('SUCCESS','HELD')
        """, (account_id, receiver_id)))
        pingpong_balance_ratio = (
            pingpong / out_to_recv if out_to_recv > 0 else 0.0
        )
    else:
        pingpong_balance_ratio = 0.0

    # --- Feature: sub_threshold_frequency_24h (smurfing) ---
    sub_threshold_frequency_24h = int(_scalar(conn, """
        SELECT COUNT(*) FROM transactions
        WHERE sender_account_id = ?
          AND amount BETWEEN ? AND ?
          AND timestamp >= ?
    """, (account_id, SMURF_LOW, SMURF_HIGH,
          (now - timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S"))))

    # --- Feature: cadence_regularity_std (automation detection) ---
    recent_times = [
        r[0] for r in _rows(conn, """
            SELECT timestamp FROM transactions
            WHERE sender_account_id = ?
              AND status IN ('SUCCESS','HELD')
            ORDER BY timestamp DESC LIMIT 20
        """, (account_id,))
    ]
    cadence_regularity_std = _inter_arrival_std(recent_times)

    # --- Self-Baseline Z-Score (Relative to User's Personal History) ---
    if len(hist_amounts) >= 3:
        user_mean = sum(hist_amounts) / len(hist_amounts)
        user_var = sum((x - user_mean)**2 for x in hist_amounts) / len(hist_amounts)
        user_std = math.sqrt(user_var)
        z_amount_user = (amount - user_mean) / max(user_std, 500.0)
    else:
        z_amount_user = 0.0

    # --- Feature: relationship_trust_score (Prior successful transfers) ---
    if receiver_id:
        prior_pair_txs = int(_scalar(conn, """
            SELECT COUNT(*) FROM transactions
            WHERE sender_account_id = ?
              AND receiver_account_id = ?
              AND status = 'SUCCESS'
        """, (account_id, receiver_id)))
        relationship_trust_score = min(1.0, prior_pair_txs / 3.0)
    else:
        relationship_trust_score = 0.0

    # --- Feature: kyc_completeness_score & historical_consistency_score ---
    kyc_map = {"SALARIED": 1.0, "MERCHANT": 1.0, "STUDENT": 0.8, "DORMANT": 0.4, "MULE": 0.2}
    kyc_completeness_score = kyc_map.get(account_type, 0.5)
    historical_consistency_score = math.exp(-abs(z_amount_user) / 3.0)

    feats: Dict[str, Any] = {
        # Identity
        "account_id": account_id,
        "account_type": account_type,
        "account_age_days": account_age_days,
        "confidence": confidence,
        "balance": balance,
        "amount": amount,
        # Multi-horizon outflow
        "outflow_5m":  out_5m,
        "outflow_1h":  out_1h,
        "outflow_24h": out_24h,
        "outflow_7d":  out_7d,
        "outflow_30d": out_30d,
        # Core adversarial features
        "volume_to_age_ratio":        volume_to_age_ratio,
        "burst_to_median_ratio":      burst_to_median_ratio,
        "retention_drain_ratio_1h":   min(retention_drain_ratio_1h,  5.0),
        "retention_drain_ratio_24h":  min(retention_drain_ratio_24h, 5.0),
        "counterparty_entropy":       counterparty_entropy,
        "pingpong_balance_ratio":     min(pingpong_balance_ratio, 1.0),
        "sub_threshold_frequency_24h": sub_threshold_frequency_24h,
        "cadence_regularity_std":     cadence_regularity_std,
        # Legitimacy & Self-Baseline Features (Suppress False Positives)
        "z_amount_user":              z_amount_user,
        "relationship_trust_score":   relationship_trust_score,
        "kyc_completeness_score":     kyc_completeness_score,
        "historical_consistency_score": historical_consistency_score,
        "N": N,
    }
    return feats


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _cold_start_features(amount: float) -> Dict[str, Any]:
    """Features for completely unknown accounts — fail-safe defaults."""
    return {
        "account_id": "UNKNOWN",
        "account_type": "UNKNOWN",
        "account_age_days": 1,
        "confidence": 0.0,
        "balance": 0.0,
        "amount": amount,
        "outflow_5m": amount, "outflow_1h": amount,
        "outflow_24h": amount, "outflow_7d": amount, "outflow_30d": amount,
        "volume_to_age_ratio": amount,
        "burst_to_median_ratio": 10.0,
        "retention_drain_ratio_1h": 1.0,
        "retention_drain_ratio_24h": 1.0,
        "counterparty_entropy": 0.0,
        "pingpong_balance_ratio": 0.0,
        "sub_threshold_frequency_24h": 0,
        "cadence_regularity_std": 0.0,
        "z_amount_user": 0.0,
        "relationship_trust_score": 0.0,
        "kyc_completeness_score": 0.5,
        "historical_consistency_score": 0.5,
        "N": 0,
    }


def _median(values: List[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2.0


def _shannon_entropy(counts: List[int]) -> float:
    total = sum(counts)
    if total == 0:
        return 0.0
    h = 0.0
    for c in counts:
        if c > 0:
            p = c / total
            h -= p * math.log2(p)
    return h


def _inter_arrival_std(timestamps_iso: List[str]) -> float:
    """Std of inter-arrival gaps in seconds. 0 if < 2 timestamps."""
    if len(timestamps_iso) < 2:
        return 0.0
    dts = [datetime.fromisoformat(t) for t in timestamps_iso]
    dts.sort()
    gaps = [(dts[i+1] - dts[i]).total_seconds() for i in range(len(dts)-1)]
    mean = sum(gaps) / len(gaps)
    var  = sum((g - mean)**2 for g in gaps) / len(gaps)
    return math.sqrt(var)


# ---------------------------------------------------------------------------
# Feature vector for ML models (numeric only, ordered)
# ---------------------------------------------------------------------------
FEATURE_NAMES = [
    "account_age_days", "confidence", "balance", "amount",
    "outflow_5m", "outflow_1h", "outflow_24h", "outflow_7d", "outflow_30d",
    "volume_to_age_ratio", "burst_to_median_ratio",
    "retention_drain_ratio_1h", "retention_drain_ratio_24h",
    "counterparty_entropy", "pingpong_balance_ratio",
    "sub_threshold_frequency_24h", "cadence_regularity_std",
    "z_amount_user", "relationship_trust_score",
    "kyc_completeness_score", "historical_consistency_score",
]

def to_vector(feats: Dict[str, Any]) -> List[float]:
    return [float(feats.get(k, 0.0)) for k in FEATURE_NAMES]
