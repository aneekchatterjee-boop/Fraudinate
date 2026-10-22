"""
ml/isolation_forest.py
Per-cohort Isolation Forest anomaly scorer.
Cohorts: SALARIED, STUDENT, MERCHANT (DORMANT/MULE/UNKNOWN → SALARIED fallback)
"""
import sys, os, pickle
from typing import Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "isoforest_models.pkl")

COHORTS = ["SALARIED", "STUDENT", "MERCHANT"]
COHORT_MAP = {c: c for c in COHORTS}
# Fallback cohort for unknown types
def _cohort(account_type: str) -> str:
    return COHORT_MAP.get(account_type, "SALARIED")


class CohortIsolationForest:
    """
    Trains one IsolationForest per cohort on synthetic baseline data,
    then scores new transactions.
    """

    def __init__(self):
        self.models: Dict[str, Any] = {}
        self._trained = False

    # ------------------------------------------------------------------
    def train(self, conn=None):
        """
        Train one IF per cohort using transactions from the DB.
        If conn is None, generate tiny synthetic baselines so the
        model is always usable (cold-start safe).
        """
        try:
            from sklearn.ensemble import IsolationForest
            import numpy as np
        except ImportError:
            print("[IsoForest] scikit-learn not available — using dummy scorer")
            self._trained = False
            return

        from ml.feature_extractor import FEATURE_NAMES, to_vector, extract_features

        rng = np.random.default_rng(42)

        for cohort in COHORTS:
            rows_X = []

            if conn is not None:
                # Pull up to 2000 historical transactions for this cohort
                try:
                    cur = conn.cursor()
                    cur.execute("""
                        SELECT t.sender_account_id, t.amount
                        FROM transactions t
                        JOIN accounts a ON a.account_id = t.sender_account_id
                        WHERE a.profile_type = ?
                          AND t.status = 'SUCCESS'
                        ORDER BY RANDOM()
                        LIMIT 2000
                    """, (cohort,))
                    sample_rows = cur.fetchall()

                    for r in sample_rows:
                        try:
                            feats = extract_features(conn, r[0], r[1])
                            rows_X.append(to_vector(feats))
                        except Exception:
                            pass
                except Exception as e:
                    print(f"[IsoForest] DB query error for {cohort}: {e}")

            # If DB gave us too few rows, augment with synthetic baseline
            if len(rows_X) < 50:
                rows_X += _synthetic_baseline(cohort, rng, FEATURE_NAMES)

            X = np.array(rows_X, dtype=float)
            clf = IsolationForest(
                n_estimators=200,
                max_samples="auto",
                contamination=0.05,
                random_state=42,
                n_jobs=-1,
            )
            clf.fit(X)
            self.models[cohort] = (clf, X.mean(axis=0), X.std(axis=0) + 1e-9)

        self._trained = True
        self._save()

    # ------------------------------------------------------------------
    def score(self, features: Dict[str, Any]) -> float:
        """
        Return anomaly score in [0, 1]. Higher = more anomalous.
        """
        if not self._trained:
            self._load()

        if not self._trained:
            # Deterministic fallback: use heuristic proxy
            return _heuristic_iso_score(features)

        try:
            import numpy as np
            from ml.feature_extractor import to_vector
        except ImportError:
            return _heuristic_iso_score(features)

        cohort = _cohort(features.get("account_type", "SALARIED"))
        if cohort not in self.models:
            cohort = "SALARIED"

        clf, mean, std = self.models[cohort]
        vec = np.array(to_vector(features), dtype=float).reshape(1, -1)
        # sklearn IF: decision_function returns negative for anomalies
        raw = clf.decision_function(vec)[0]
        # Map to [0,1]: raw in roughly [-0.5, 0.5], invert so high=anomalous
        score = float(1.0 - (raw + 0.5))
        return max(0.0, min(1.0, score))

    # ------------------------------------------------------------------
    def _save(self):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({"models": self.models, "trained": self._trained}, f)

    def _load(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                self.models   = data["models"]
                self._trained = data["trained"]
            except Exception:
                self._trained = False


# ---------------------------------------------------------------------------
# Synthetic baseline generator (cold-start safe training)
# ---------------------------------------------------------------------------
def _synthetic_baseline(cohort: str, rng, feature_names) -> list:
    """
    Generate ~200 plausible normal transactions per cohort
    so the model can be trained even without DB data.
    """
    import numpy as np
    n = 200
    # Approximate normal ranges per cohort
    profiles = {
        "SALARIED": {"amount": (5000, 3000), "age": (365*3, 365)},
        "STUDENT":  {"amount": (1000, 800),  "age": (365, 200)},
        "MERCHANT": {"amount": (20000, 15000), "age": (365*2, 365)},
    }
    p = profiles.get(cohort, profiles["SALARIED"])
    rows = []
    for _ in range(n):
        amt    = max(100, rng.normal(*p["amount"]))
        age    = max(1,   rng.normal(*p["age"]))
        bal    = amt * rng.uniform(2, 20)
        conf   = min(1.0, rng.uniform(0.3, 0.95))
        out_1h = amt * rng.uniform(0, 0.5)
        out_24h = out_1h * rng.uniform(1, 4)
        row = {k: 0.0 for k in feature_names}
        row.update({
            "account_age_days": age,
            "confidence": conf,
            "balance": bal,
            "amount": amt,
            "outflow_1h": out_1h,
            "outflow_24h": out_24h,
            "outflow_7d": out_24h * 3,
            "outflow_30d": out_24h * 10,
            "volume_to_age_ratio": out_24h * 10 / age,
            "burst_to_median_ratio": rng.uniform(0.5, 2.0),
            "retention_drain_ratio_1h": rng.uniform(0, 0.3),
            "retention_drain_ratio_24h": rng.uniform(0, 0.5),
            "counterparty_entropy": rng.uniform(0.5, 3.0),
            "pingpong_balance_ratio": rng.uniform(0, 0.05),
            "sub_threshold_frequency_24h": int(rng.uniform(0, 1)),
            "cadence_regularity_std": rng.uniform(10, 3600),
        })
        rows.append([row[k] for k in feature_names])
    return rows


def _heuristic_iso_score(features: Dict[str, Any]) -> float:
    """Pure-Python fallback when sklearn is unavailable."""
    score = 0.0
    if features.get("retention_drain_ratio_1h", 0) > 0.8:
        score += 0.4
    if features.get("burst_to_median_ratio", 1) > 5:
        score += 0.3
    if features.get("pingpong_balance_ratio", 0) > 0.5:
        score += 0.2
    if features.get("sub_threshold_frequency_24h", 0) >= 3:
        score += 0.1
    return min(score, 1.0)


# Singleton
isolation_forest = CohortIsolationForest()
