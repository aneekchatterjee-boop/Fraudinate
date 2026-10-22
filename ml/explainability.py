"""
ml/explainability.py
SHAP-based model explainability for Fraudinate GBM predictions.
Provides per-transaction feature contribution explanations.
"""
import sys
from typing import Dict, Any, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def explain_prediction(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate SHAP explanation for a single transaction's ML prediction.
    
    Returns:
        {
            "risk_score": float,
            "base_value": float,  # expected value (average prediction)
            "contributions": [
                {"feature": str, "value": float, "contribution": float, "direction": "fraud"|"legit"},
                ...
            ],
            "top_fraud_drivers": [...],  # top 5 features pushing toward fraud
            "top_legit_drivers": [...],  # top 5 features pushing toward legit
            "explanation_text": str,     # human-readable one-paragraph explanation
        }
    """
    import numpy as np
    
    from ml.gbm_engine import gbm_engine
    from ml.feature_extractor import FEATURE_NAMES, to_vector
    
    # Ensure model is loaded
    if not gbm_engine._trained:
        gbm_engine._load()
    if not gbm_engine._trained or gbm_engine.model is None:
        return {"error": "Model not trained yet. Run: python run.py --train"}
    
    # Get feature vector
    vec = np.array(to_vector(features), dtype=float).reshape(1, -1)
    
    # Try SHAP first, fall back to feature importance approximation
    try:
        import shap
        if gbm_engine.backend == "lightgbm":
            explainer = shap.TreeExplainer(gbm_engine.model)
            shap_values = explainer.shap_values(vec)
            # For lightgbm binary, shap_values is a single array
            if isinstance(shap_values, list):
                sv = shap_values[1][0]  # class 1 (fraud)
            else:
                sv = shap_values[0]
            base_value = float(explainer.expected_value)
            if isinstance(base_value, (list, np.ndarray)):
                base_value = float(base_value[1] if len(base_value) > 1 else base_value[0])
        else:
            # sklearn fallback - use KernelExplainer (slower)
            explainer = shap.TreeExplainer(gbm_engine.model)
            shap_values = explainer.shap_values(vec)
            if isinstance(shap_values, list):
                sv = shap_values[1][0]
            else:
                sv = shap_values[0]
            base_value = float(explainer.expected_value)
            if isinstance(base_value, (list, np.ndarray)):
                base_value = float(base_value[1] if len(base_value) > 1 else base_value[0])
    except ImportError:
        # SHAP not installed - use feature importance as approximation
        sv = _approximate_contributions(gbm_engine, features, FEATURE_NAMES, vec)
        base_value = 0.5
    except Exception as e:
        # Any SHAP error - fall back
        sv = _approximate_contributions(gbm_engine, features, FEATURE_NAMES, vec)
        base_value = 0.5
    
    # Get the actual risk score
    risk_score = gbm_engine.predict_proba(features)
    
    # Build contributions list
    contributions = []
    for i, fname in enumerate(FEATURE_NAMES):
        contrib = float(sv[i])
        contributions.append({
            "feature": fname,
            "value": round(float(features.get(fname, 0.0)), 4),
            "contribution": round(contrib, 6),
            "direction": "fraud" if contrib > 0 else "legit",
            "abs_contribution": abs(contrib),
        })
    
    # Sort by absolute contribution
    contributions.sort(key=lambda x: x["abs_contribution"], reverse=True)
    
    # Top drivers
    top_fraud = [c for c in contributions if c["direction"] == "fraud"][:5]
    top_legit = [c for c in contributions if c["direction"] == "legit"][:5]
    
    # Generate human-readable explanation
    explanation = _generate_explanation(risk_score, top_fraud, top_legit)
    
    # Clean up - remove abs_contribution from output
    for c in contributions:
        del c["abs_contribution"]
    
    return {
        "risk_score": round(risk_score, 4),
        "base_value": round(base_value, 4),
        "contributions": contributions,
        "top_fraud_drivers": top_fraud,
        "top_legit_drivers": top_legit,
        "explanation_text": explanation,
    }


def _approximate_contributions(engine, features, feature_names, vec):
    """Fallback when SHAP is not available: use feature importance * feature value direction."""
    import numpy as np
    importances = engine.feature_importances()
    imp_dict = dict(importances)
    risk = engine.predict_proba(features)
    
    contribs = []
    for fname in feature_names:
        imp = imp_dict.get(fname, 0.0)
        fval = float(features.get(fname, 0.0))
        # Approximate: importance * (risk - 0.5) * sign based on feature semantics
        if fname in ('retention_drain_ratio_1h', 'retention_drain_ratio_24h',
                     'burst_to_median_ratio', 'pingpong_balance_ratio',
                     'sub_threshold_frequency_24h'):
            # Higher = more fraud
            contrib = imp * (risk - 0.5) * min(fval, 1.0)
        elif fname in ('cadence_regularity_std', 'counterparty_entropy',
                       'account_age_days', 'confidence'):
            # Higher = more legit
            contrib = -imp * (0.5 - risk) * min(fval / 100, 1.0)
        else:
            contrib = imp * (risk - 0.5)
        contribs.append(contrib)
    return contribs


def _generate_explanation(risk_score, top_fraud, top_legit):
    """Generate a human-readable one-paragraph explanation."""
    FEATURE_DESCRIPTIONS = {
        'retention_drain_ratio_1h': 'account drained rapidly within 1 hour',
        'retention_drain_ratio_24h': 'account drained within 24 hours',
        'burst_to_median_ratio': 'transaction amount unusually high vs. history',
        'cadence_regularity_std': 'transaction timing pattern',
        'pingpong_balance_ratio': 'circular money flow detected',
        'sub_threshold_frequency_24h': 'multiple just-under-threshold transfers',
        'counterparty_entropy': 'variety of transaction partners',
        'account_age_days': 'account age',
        'confidence': 'behavioral data availability',
        'balance': 'account balance level',
        'amount': 'transaction amount',
        'outflow_1h': 'outflow volume in last hour',
        'outflow_24h': 'outflow volume in last 24 hours',
        'outflow_5m': 'outflow in last 5 minutes',
        'outflow_7d': 'weekly outflow volume',
        'outflow_30d': 'monthly outflow volume',
        'volume_to_age_ratio': 'transaction volume relative to account age',
    }
    
    if risk_score >= 0.7:
        severity = "HIGH RISK"
    elif risk_score >= 0.45:
        severity = "MEDIUM RISK"
    else:
        severity = "LOW RISK"
    
    parts = [f"This transaction is rated {severity} (score: {risk_score:.1%})."]
    
    if top_fraud:
        fraud_reasons = []
        for d in top_fraud[:3]:
            desc = FEATURE_DESCRIPTIONS.get(d['feature'], d['feature'])
            fraud_reasons.append(f"{desc} (contributed +{abs(d['contribution']):.3f})")
        parts.append("Key fraud indicators: " + "; ".join(fraud_reasons) + ".")
    
    if top_legit and risk_score < 0.7:
        legit_reasons = []
        for d in top_legit[:2]:
            desc = FEATURE_DESCRIPTIONS.get(d['feature'], d['feature'])
            legit_reasons.append(f"{desc} (contributed {d['contribution']:.3f})")
        parts.append("Mitigating factors: " + "; ".join(legit_reasons) + ".")
    
    return " ".join(parts)
