"""
ml/gbm_engine.py
Gradient-boosted tree classifier for Fraudinate.
Primary: LightGBM. Fallback: sklearn HistGradientBoostingClassifier.
Cost-sensitive training: fraud weight ~20x (class imbalance ~1:20).
Feature importance is read directly from the fitted model (no SHAP needed).
"""
import sys, os, pickle
from typing import Dict, Any, List, Tuple, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "gbm_model.pkl")
FRAUD_WEIGHT = 20.0      # class_weight for fraud label


class GBMEngine:

    def __init__(self):
        self.model = None
        self.backend: str = "none"
        self.feature_names: List[str] = []
        self._trained = False

    # ------------------------------------------------------------------
    def train(self, conn=None):
        """Train on DB transactions.  If too few rows, train on synthetic data."""
        from ml.feature_extractor import FEATURE_NAMES, to_vector, extract_features
        self.feature_names = FEATURE_NAMES

        X, y, w = [], [], []

        if conn is not None:
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT t.sender_account_id, t.amount,
                           a.profile_type,
                           CASE WHEN a.is_mule = 1 OR a.profile_type = 'MULE' THEN 1
                                WHEN t.status = 'HELD' THEN 1
                                ELSE 0 END AS label
                    FROM transactions t
                    JOIN accounts a ON a.account_id = t.receiver_account_id
                    ORDER BY RANDOM() LIMIT 4000
                """)
                db_rows = cur.fetchall()
                for r in db_rows:
                    try:
                        feats = extract_features(conn, r[0], r[1])
                        X.append(to_vector(feats))
                        label = int(r[3])
                        y.append(label)
                        w.append(FRAUD_WEIGHT if label == 1 else 1.0)
                    except Exception:
                        pass
            except Exception as e:
                print(f"[GBM] DB error: {e}")

        # Always augment with high-signal synthetic adversarial & legitimate cases
        Xs, ys, ws = _synthetic_training_set(FEATURE_NAMES)
        X += Xs; y += ys; w += ws

        import numpy as np
        X_np = np.array(X, dtype=float)
        y_np = np.array(y, dtype=int)
        w_np = np.array(w, dtype=float)

        self.model, self.backend = _fit_model(X_np, y_np, w_np)
        self._trained = True
        self._save()
        print(f"[GBM] Trained ({self.backend}) on {len(y)} samples "
              f"({sum(y)} fraud, {len(y)-sum(y)} legit)")

    # ------------------------------------------------------------------
    def predict_proba(self, features: Dict[str, Any]) -> float:
        """Return P(fraud) in [0, 1]."""
        if not self._trained:
            self._load()
        if not self._trained or self.model is None:
            return _heuristic_gbm_score(features)

        import numpy as np
        from ml.feature_extractor import to_vector
        vec = np.array(to_vector(features), dtype=float).reshape(1, -1)
        try:
            if self.backend == "lightgbm":
                prob = float(self.model.predict(vec)[0])
            else:
                prob = float(self.model.predict_proba(vec)[0, 1])
            return max(0.0, min(1.0, prob))
        except Exception:
            return _heuristic_gbm_score(features)

    # ------------------------------------------------------------------
    def feature_importances(self) -> List[Tuple[str, float]]:
        """Return [(feature_name, importance), ...] sorted descending."""
        if not self._trained:
            self._load()
        if self.model is None:
            return []
        try:
            if self.backend == "lightgbm":
                imp = self.model.feature_importance(importance_type="gain")
            else:
                imp = self.model.feature_importances_
            total = sum(imp) or 1.0
            pairs = [(self.feature_names[i], float(imp[i]/total))
                     for i in range(len(self.feature_names))]
            return sorted(pairs, key=lambda x: -x[1])
        except Exception:
            return []

    # ------------------------------------------------------------------
    def _save(self):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({
                "model": self.model,
                "backend": self.backend,
                "feature_names": self.feature_names,
                "trained": self._trained,
            }, f)

    def _load(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                self.model        = data["model"]
                self.backend      = data["backend"]
                self.feature_names = data.get("feature_names", [])
                self._trained     = data["trained"]
            except Exception:
                self._trained = False


# ---------------------------------------------------------------------------
# Fitting helpers
# ---------------------------------------------------------------------------
def _fit_model(X, y, w):
    """Try LightGBM first, fall back to sklearn."""
    try:
        import lightgbm as lgb
        pos   = int(y.sum())
        neg   = len(y) - pos
        spw   = max(1.0, neg / max(pos, 1))
        dtrain = lgb.Dataset(X, label=y, weight=w)
        params = {
            "objective":       "binary",
            "metric":          "average_precision",
            "scale_pos_weight": spw,
            "num_leaves":       63,
            "learning_rate":    0.05,
            "n_estimators":     400,
            "min_child_samples": 5,
            "verbose":         -1,
        }
        model = lgb.train(params, dtrain, num_boost_round=400,
                          valid_sets=[dtrain], callbacks=[lgb.log_evaluation(period=-1)])
        return model, "lightgbm"
    except Exception as e:
        print(f"[GBM] LightGBM unavailable ({e}), using HistGradientBoosting")

    try:
        from sklearn.ensemble import HistGradientBoostingClassifier
        clf = HistGradientBoostingClassifier(
            max_iter=300,
            learning_rate=0.05,
            max_leaf_nodes=63,
            class_weight={0: 1.0, 1: FRAUD_WEIGHT},
            random_state=42,
        )
        clf.fit(X, y, sample_weight=w)
        return clf, "sklearn"
    except Exception as e2:
        print(f"[GBM] sklearn also failed ({e2})")
        return None, "none"


# ---------------------------------------------------------------------------
# Synthetic training data (cold-start safe)
# ---------------------------------------------------------------------------
def _synthetic_training_set(feature_names: List[str]):
    import numpy as np
    rng = np.random.default_rng(42)
    X, y, w = [], [], []

    def _row(label, overrides={}):
        base = {k: 0.0 for k in feature_names}
        base.update({
            "account_age_days":  rng.uniform(30, 1000),
            "confidence":        rng.uniform(0.2, 0.9),
            "balance":           rng.uniform(1000, 200000),
            "amount":            rng.uniform(500, 200000),
            "outflow_1h":        rng.uniform(0, 5000),
            "outflow_24h":       rng.uniform(0, 30000),
            "outflow_7d":        rng.uniform(0, 100000),
            "outflow_30d":       rng.uniform(0, 300000),
            "burst_to_median_ratio":    rng.uniform(0.5, 2.5),
            "retention_drain_ratio_1h": rng.uniform(0, 0.25),
            "retention_drain_ratio_24h": rng.uniform(0, 0.25),
            "counterparty_entropy":     rng.uniform(1.0, 3.5),
            "pingpong_balance_ratio":   rng.uniform(0, 0.05),
            "sub_threshold_frequency_24h": 0,
            "cadence_regularity_std":   rng.uniform(120, 7200),
        })
        base.update(overrides)
        return [base[k] for k in feature_names]

    # 1. Standard Legit: 800 samples
    for _ in range(800):
        X.append(_row(0)); y.append(0); w.append(1.0)

    # 2. Legitimate High Burst (pooling/emergencies/fees/inventory): 400 samples
    # High burst & amount, but low drain (<0.20) and human cadence (>180s)
    for _ in range(400):
        X.append(_row(0, {
            "amount": rng.uniform(50000, 250000),
            "burst_to_median_ratio": rng.uniform(3.0, 12.0),
            "retention_drain_ratio_1h": rng.uniform(0.0, 0.15),
            "retention_drain_ratio_24h": rng.uniform(0.0, 0.20),
            "sub_threshold_frequency_24h": 0,
            "cadence_regularity_std": rng.uniform(180, 1800),
            "counterparty_entropy": rng.uniform(1.0, 2.5),
            "confidence": rng.uniform(0.5, 0.9),
        }))
        y.append(0); w.append(1.5)

    # 3. Fraud: Pass-through Layering & Rapid Drain: 400 samples
    for _ in range(400):
        amt = rng.uniform(30000, 250000)
        X.append(_row(1, {
            "amount": amt,
            "retention_drain_ratio_1h":  rng.uniform(0.85, 1.2),
            "retention_drain_ratio_24h": rng.uniform(0.85, 1.2),
            "burst_to_median_ratio":     rng.uniform(6.0, 35.0),
            "pingpong_balance_ratio":    rng.uniform(0.0, 0.3),
            "sub_threshold_frequency_24h": int(rng.uniform(2, 6)),
            "cadence_regularity_std":    rng.uniform(1, 30),  # bot-like regularity
            "counterparty_entropy":      rng.uniform(0.1, 0.6),
            "confidence": rng.uniform(0.1, 0.4),
        }))
        y.append(1); w.append(FRAUD_WEIGHT)

    # 4. Fraud: Smurfing & Sybil Wash-Trading: 200 samples
    for _ in range(200):
        X.append(_row(1, {
            "amount": rng.uniform(45000, 49999),
            "burst_to_median_ratio": rng.uniform(4.0, 15.0),
            "retention_drain_ratio_1h": rng.uniform(0.7, 1.0),
            "sub_threshold_frequency_24h": int(rng.uniform(3, 8)),
            "pingpong_balance_ratio": rng.uniform(0.4, 0.95),
            "cadence_regularity_std": rng.uniform(0.5, 15.0),
            "counterparty_entropy": rng.uniform(0.0, 0.5),
            "confidence": rng.uniform(0.05, 0.35),
        }))
        y.append(1); w.append(FRAUD_WEIGHT)

    return X, y, w


def _heuristic_gbm_score(features: Dict[str, Any]) -> float:
    score = 0.0
    if features.get("retention_drain_ratio_1h", 0) > 0.9: score += 0.35
    if features.get("burst_to_median_ratio", 1)    > 8:   score += 0.25
    if features.get("pingpong_balance_ratio", 0)   > 0.5: score += 0.25
    if features.get("sub_threshold_frequency_24h", 0) >= 3: score += 0.15
    return min(score, 1.0)


# Singleton
gbm_engine = GBMEngine()
