"""
ml/online_learner.py
River-based incremental streaming classifier for Fraudinate.
- Role-gated updates: only OFFICER_FRAUD_DESK_* triggers weight updates
- Gradient clamping: max weight delta 0.05 (anti-poisoning)
- Audit log for all update attempts
"""
import sys, os, pickle, logging, datetime
from typing import Dict, Any, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "river_model.pkl")
AUDIT_LOG  = os.path.join(os.path.dirname(__file__), "models", "online_learner_audit.log")
MAX_WEIGHT_DELTA = 0.05   # gradient clamp

logging.basicConfig(
    filename=AUDIT_LOG,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
audit = logging.getLogger("Fraudinate.online_learner")


class OnlineLearner:

    def __init__(self):
        self.model  = None
        self.scaler = None
        self._ready = False
        self._weights_before: Optional[Dict] = None

    # ------------------------------------------------------------------
    def _build_model(self):
        """Build River pipeline: StandardScaler -> LogisticRegression with Adam."""
        try:
            from river import preprocessing, linear_model, optim, compose
            scaler = preprocessing.StandardScaler()
            lr     = linear_model.LogisticRegression(optimizer=optim.Adam(lr=0.01))
            model  = compose.Pipeline(scaler, lr)
            return model
        except ImportError:
            return None

    # ------------------------------------------------------------------
    def _ensure_ready(self):
        if self._ready:
            return
        self._load()
        if not self._ready:
            self.model = self._build_model()
            self._ready = self.model is not None
            if not self._ready:
                print("[OnlineLearner] River not available — using heuristic fallback")

    # ------------------------------------------------------------------
    def predict_proba(self, features: Dict[str, Any]) -> float:
        """Return P(fraud) in [0, 1]."""
        self._ensure_ready()
        if self.model is None:
            return _heuristic_online_score(features)
        try:
            from ml.feature_extractor import FEATURE_NAMES
            x = {k: float(features.get(k, 0.0)) for k in FEATURE_NAMES}
            prob = self.model.predict_proba_one(x)
            # River returns dict {False: p, True: p}
            return float(prob.get(True, prob.get(1, 0.0)))
        except Exception:
            return _heuristic_online_score(features)

    # ------------------------------------------------------------------
    def update(self, features: Dict[str, Any], label: int, officer_id: str = "", weight: float = 1.0) -> bool:
        """
        Update model with a new labelled observation.
        Returns True if update was applied, False if rejected.
        All attempts are audit-logged.
        """
        allowed = officer_id.startswith("OFFICER_FRAUD_DESK")
        audit.info(
            "UPDATE_ATTEMPT officer=%s label=%d weight=%.2f allowed=%s",
            officer_id, label, weight, allowed
        )
        if not allowed:
            audit.warning(
                "UPDATE_REJECTED: officer_id=%s does not have FRAUD_DESK role",
                officer_id
            )
            return False

        self._ensure_ready()
        if self.model is None:
            return False

        try:
            from river import linear_model
            from ml.feature_extractor import FEATURE_NAMES
            x = {k: float(features.get(k, 0.0)) for k in FEATURE_NAMES}
            y = bool(label)

            # Capture weights before update for clamp check
            try:
                inner_lr = self.model[-1]   # last step
                before   = dict(inner_lr.weights) if hasattr(inner_lr, "weights") else {}
            except Exception:
                before = {}

            # Fractional Weighting
            try:
                self.model.learn_one(x, y, w=weight)
            except TypeError:
                # Fallback if the River pipeline doesn't accept 'w'
                self.model.learn_one(x, y)

            # Gradient clamping: if any weight moved > MAX_WEIGHT_DELTA, revert it
            try:
                inner_lr = self.model[-1]
                for k in list(inner_lr.weights.keys()):
                    if k in before:
                        delta = inner_lr.weights[k] - before[k]
                        if abs(delta) > MAX_WEIGHT_DELTA:
                            inner_lr.weights[k] = before[k] + (
                                MAX_WEIGHT_DELTA * (1 if delta > 0 else -1)
                            )
            except Exception:
                pass

            self._save()
            audit.info("UPDATE_APPLIED officer=%s label=%d weight=%.2f", officer_id, label, weight)
            return True

        except Exception as e:
            audit.error("UPDATE_ERROR officer=%s error=%s", officer_id, str(e))
            return False

    # ------------------------------------------------------------------
    def warm_start(self, conn=None, n: int = 1000):
        """
        Pre-warm the River model from synthetic & DB data so it starts with reasonable weights.
        """
        self._ensure_ready()
        if self.model is None:
            return
        from ml.feature_extractor import FEATURE_NAMES, extract_features
        from ml.gbm_engine import _synthetic_training_set

        # 1. Warm-start on synthetic balanced data
        Xs, ys, _ = _synthetic_training_set(FEATURE_NAMES)
        for vec, label in zip(Xs, ys):
            x = {k: float(v) for k, v in zip(FEATURE_NAMES, vec)}
            self.model.learn_one(x, bool(label))

        # 2. Add real DB samples if available
        if conn is not None:
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT t.sender_account_id, t.amount,
                           CASE WHEN a.is_mule = 1 OR a.profile_type = 'MULE' THEN 1 ELSE 0 END AS label
                    FROM transactions t
                    JOIN accounts a ON a.account_id = t.receiver_account_id
                    ORDER BY RANDOM() LIMIT ?
                """, (n,))
                rows = cur.fetchall()
                for r in rows:
                    try:
                        feats = extract_features(conn, r[0], r[1])
                        x = {k: float(feats.get(k, 0.0)) for k in FEATURE_NAMES}
                        self.model.learn_one(x, bool(r[2]))
                    except Exception:
                        pass
            except Exception as e:
                print(f"[OnlineLearner] Warm-start error: {e}")

        self._save()
        print(f"[OnlineLearner] Warm-started on {len(Xs)} synthetic + DB samples")

    # ------------------------------------------------------------------
    def _save(self):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({"model": self.model, "ready": self._ready}, f)

    def _load(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                self.model  = data.get("model")
                self._ready = bool(data.get("ready")) and self.model is not None
            except Exception:
                self._ready = False


def _heuristic_online_score(features: Dict[str, Any]) -> float:
    score = 0.0
    if features.get("retention_drain_ratio_24h", 0) > 0.9: score += 0.4
    if features.get("cadence_regularity_std", 9999) < 5:    score += 0.3  # bot-like
    if features.get("counterparty_entropy", 9) < 0.5:       score += 0.2
    return min(score, 1.0)


# Singleton
online_learner = OnlineLearner()
