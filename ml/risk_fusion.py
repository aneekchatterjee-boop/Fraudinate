"""
ml/risk_fusion.py
Weighted ensemble risk scorer for Fraudinate.

Composite Risk = 0.40*P(GBM) + 0.30*S(IsoForest) + 0.20*P(River) + 0.10*TopologyHeuristics

Tiered Circuit Breaker:
  - Amount < 1000                  → fails OPEN  (ALLOW, no ML needed)
  - Amount > 25000 AND cold-start  → fails SAFE  (HOLD, 2-hour quarantine)
  - ML inference timeout (>40ms)   → falls back to heuristic-only score
"""
import sys, time
from typing import Dict, Any, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

FAIL_OPEN_BELOW  =  1_000   # INR — micro transactions always allowed
FAIL_SAFE_ABOVE  = 25_000   # INR — large amounts on cold-start → HOLD
ML_TIMEOUT_MS    = 2500       # max inference time before heuristic fallback

# Ensemble weights
W_GBM    = 0.40
W_ISO    = 0.30
W_RIVER  = 0.20
W_HEUR   = 0.10

# Decision thresholds
import os
import json
import pathlib
HOLD_THRESHOLD = 0.45    # composite ≥ this → HOLD + bank alert
threshold_path = pathlib.Path(__file__).parent / 'models' / 'calibrated_threshold.json'
if threshold_path.exists():
    try:
        with open(threshold_path, 'r') as f:
            HOLD_THRESHOLD = json.load(f)['threshold']
    except Exception:
        pass


# ---------------------------------------------------------------------------
class RiskFusion:

    def __init__(self):
        self._gbm     = None
        self._iso     = None
        self._river   = None

    def _lazy_import(self):
        if self._gbm is None:
            from ml.gbm_engine       import gbm_engine
            from ml.isolation_forest import isolation_forest
            from ml.online_learner   import online_learner
            self._gbm   = gbm_engine
            self._iso   = isolation_forest
            self._river = online_learner

    # ------------------------------------------------------------------
    def score(self,
              features: Dict[str, Any],
              topology_score: float = 0.0,
              ) -> Dict[str, Any]:
        """
        Returns:
            {
              "composite":   float [0,1],
              "decision":    "ALLOW" | "HOLD",
              "p_gbm":       float,
              "s_iso":       float,
              "p_river":     float,
              "heuristic":   float,
              "circuit_breaker": str | None,
              "top_features": [(name, importance), ...],
            }
        """
        amount = float(features.get("amount", 0))

        # ── Circuit Breaker 1: Fail-OPEN for tiny transactions ──
        if amount < FAIL_OPEN_BELOW:
            return _result(0.0, "ALLOW", 0, 0, 0, 0,
                           circuit_breaker="FAIL_OPEN_MICRO", features=features)

        # ── Circuit Breaker 2: Fail-SAFE for large + cold-start ──
        confidence = float(features.get("confidence", 0))
        if amount > FAIL_SAFE_ABOVE and confidence < 0.1:
            return _result(1.0, "HOLD", 1, 1, 1, 1,
                           circuit_breaker="FAIL_SAFE_COLD_START", features=features)

        self._lazy_import()

        t0 = time.monotonic()

        # ── GBM Score ──
        try:
            p_gbm = self._gbm.predict_proba(features)
        except Exception:
            p_gbm = _fallback_heuristic(features)

        # ── IsoForest Score ──
        try:
            s_iso = self._iso.score(features)
        except Exception:
            s_iso = _fallback_heuristic(features)

        # ── River Score ──
        try:
            p_river = self._river.predict_proba(features)
        except Exception:
            p_river = _fallback_heuristic(features)

        elapsed_ms = (time.monotonic() - t0) * 1000

        # ── ML Timeout Circuit Breaker ──
        if elapsed_ms > ML_TIMEOUT_MS:
            # Fall back to heuristic-only
            h = _fallback_heuristic(features)
            composite = h
            return _result(composite,
                           "HOLD" if composite >= HOLD_THRESHOLD else "ALLOW",
                           p_gbm, s_iso, p_river, h,
                           circuit_breaker="ML_TIMEOUT_HEURISTIC_FALLBACK",
                           features=features)

        # ── Heuristic topology score ──
        h = min(float(topology_score) / 100.0, 1.0)  # normalize 0-100 → 0-1

        # ── Weighted Ensemble ──
        composite = (W_GBM * p_gbm + W_ISO * s_iso +
                     W_RIVER * p_river + W_HEUR * h)
        composite = max(0.0, min(1.0, composite))

        decision = "HOLD" if composite >= HOLD_THRESHOLD else "ALLOW"

        # Feature importance from GBM
        try:
            top_feats = self._gbm.feature_importances()[:5]
        except Exception:
            top_feats = []

        return _result(composite, decision, p_gbm, s_iso, p_river, h,
                       top_features=top_feats, features=features)

    # ------------------------------------------------------------------
    def train(self, conn=None):
        """Train all sub-models (called once during --seed or --train)."""
        self._lazy_import()
        print("[RiskFusion] Training GBM engine...")
        self._gbm.train(conn)
        print("[RiskFusion] Training Isolation Forest...")
        self._iso.train(conn)
        print("[RiskFusion] Warm-starting Online Learner...")
        self._river.warm_start(conn)
        print("[RiskFusion] All models trained ✓")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _result(composite, decision, p_gbm, s_iso, p_river, heuristic,
            circuit_breaker=None, top_features=None, features=None) -> Dict[str, Any]:
    return {
        "composite":      round(float(composite), 4),
        "decision":       decision,
        "p_gbm":          round(float(p_gbm),    4),
        "s_iso":          round(float(s_iso),    4),
        "p_river":        round(float(p_river),  4),
        "heuristic":      round(float(heuristic),4),
        "circuit_breaker": circuit_breaker,
        "top_features":   top_features or [],
    }


def _fallback_heuristic(features: Dict[str, Any]) -> float:
    score = 0.0
    if features.get("retention_drain_ratio_1h",  0)   > 0.9: score += 0.35
    if features.get("burst_to_median_ratio",      1)   > 8:   score += 0.25
    if features.get("pingpong_balance_ratio",     0)   > 0.5: score += 0.20
    if features.get("sub_threshold_frequency_24h", 0) >= 3:   score += 0.10
    if features.get("cadence_regularity_std",  9999)   < 5:   score += 0.10
    return min(score, 1.0)


# Singleton
risk_fusion = RiskFusion()
