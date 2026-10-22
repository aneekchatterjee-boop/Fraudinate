"""
ml/llm_investigator.py
Hybrid LLM Cognitive Investigation Agent.

Priority:
  1. If GEMINI_API_KEY env var is set → call Gemini Flash with CoT prompt
  2. Otherwise → deterministic offline Chain-of-Thought engine

Correctly classifies all 5 case narratives:
  ALLOW : Cases 1,2,3 (Capital Pooling / Fan-In / legitimate fund pooling)
  HOLD  : Cases 4,5   (Coordinated pass-through layering / mule chain)
"""
import sys, os, json, re
from typing import Dict, Any, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Offline Chain-of-Thought Signal Definitions
# ---------------------------------------------------------------------------

# ALLOW signals: capital pooling patterns
#   - Money flows INTO a single named beneficiary from multiple known sources
#   - The beneficiary account does NOT rapidly drain outward to unknown parties
#   - Transactions are explained by a declared shared purpose (medical, education, business)
#   - Inflow sources are mutual contacts / social network proximity

# HOLD signals: coordinated layering patterns
#   - Inbound from unsolicited / unrelated accounts
#   - Rapid drain (>80% of inflow) within minutes/hours
#   - Sequential hops: A→B→C→D where each hop drains immediately
#   - Small commission deductions per hop (typical mule fee)
#   - New accounts with no prior relationship to sender
#   - Funds end at an account with no declared purpose


class OfflineCoT:
    """
    Deterministic Chain-of-Thought classifier.
    Evaluates a structured transaction graph description.
    """

    def analyze(self, graph: Dict[str, Any]) -> Dict[str, Any]:
        """
        graph keys:
          transactions      : list of {from, to, amount, minutes_after_start}
          declared_purpose  : str
          terminal_nodes    : list of account IDs that are known destinations
          prior_relationship: bool (do participants know each other?)
          rapid_drain_pct   : float (0-1) — fraction of inflow that left within 1h
          hop_count         : int
          new_account_ids   : list of previously-unseen account IDs in flow
          commission_per_hop: bool
        """
        signals_allow = []
        signals_hold  = []
        adversarial   = []

        txns = graph.get("transactions", [])
        purpose    = graph.get("declared_purpose", "")
        terminal   = set(graph.get("terminal_nodes", []))
        prior_rel  = graph.get("prior_relationship", False)
        drain_pct  = float(graph.get("rapid_drain_pct", 0.0))
        hop_count  = int(graph.get("hop_count", 1))
        new_accts  = graph.get("new_account_ids", [])
        commission = graph.get("commission_per_hop", False)

        # ── ALLOW signals ──────────────────────────────────────────────

        # 1. Capital Pooling: multiple sources → ONE terminal
        destinations = set(t.get("to") for t in txns)
        if len(terminal) == 1 and terminal == destinations:
            signals_allow.append("CAPITAL_POOLING: All flows terminate at a single known destination")

        # 2. Fan-In with known relationships
        term_node = list(terminal)[0] if terminal else None
        sources = set(t.get("from") for t in txns if (not term_node or t.get("from") != term_node))
        if prior_rel:
            signals_allow.append("PRIOR_RELATIONSHIP: All participants known to each other")

        # 3. Declared legitimate purpose
        legit_keywords = ["hospital", "medical", "college", "tuition", "fee",
                          "education", "inventory", "business", "rent", "emergency"]
        if any(kw in purpose.lower() for kw in legit_keywords):
            signals_allow.append(f"DECLARED_PURPOSE: '{purpose}' is a recognized legitimate purpose")

        # 4. Low drain — money stays at destination
        if drain_pct < 0.2:
            signals_allow.append(f"LOW_DRAIN: Only {drain_pct*100:.0f}% of inflow was re-transmitted")

        # 5. Shallow hop count
        if hop_count <= 2:
            signals_allow.append(f"SHALLOW_HOPS: {hop_count} hop(s) is consistent with relay help")

        # ── HOLD signals ───────────────────────────────────────────────

        # 1. Rapid drain (pass-through layering)
        if drain_pct > 0.8:
            signals_hold.append(
                f"RAPID_DRAIN: {drain_pct*100:.0f}% of inflow drained within the observation window "
                f"— classic pass-through layering"
            )

        # 2. New / unknown accounts in flow
        if len(new_accts) > 0:
            signals_hold.append(
                f"UNKNOWN_ACCOUNTS: {len(new_accts)} new/unrelated account(s) in flow: {new_accts}"
            )

        # 3. Deep hop chain
        if hop_count >= 3 and drain_pct > 0.5:
            signals_hold.append(
                f"DEEP_HOP_CHAIN: {hop_count} sequential hops with high drain "
                f"— coordinated layering pattern"
            )
            adversarial.append("LAYERING_EVASION: Multi-hop chain designed to obscure origin")

        # 4. Commission per hop (mule fee)
        if commission:
            signals_hold.append("COMMISSION_PER_HOP: Each intermediary retains a fee — mule chain indicator")
            adversarial.append("MULE_FEE_STRUCTURE: Per-hop commission deduction typical of mule networks")

        # 5. No declared purpose + new accounts
        if not purpose and len(new_accts) > 0:
            signals_hold.append("NO_PURPOSE_WITH_NEW_ACCOUNTS: Unexplained flows through new accounts")

        # ── Decision ───────────────────────────────────────────────────
        allow_score = len(signals_allow)
        hold_score  = len(signals_hold) * 2   # hold signals weighted 2x

        if hold_score > allow_score:
            verdict    = "HOLD"
            confidence = min(0.95, 0.5 + 0.1 * (hold_score - allow_score))
        elif allow_score > 0 and hold_score == 0:
            verdict    = "ALLOW"
            confidence = min(0.95, 0.5 + 0.1 * allow_score)
        elif allow_score > hold_score:
            verdict    = "ALLOW"
            confidence = min(0.95, 0.5 + 0.05 * (allow_score - hold_score))
        else:
            # Tie → conservative: HOLD
            verdict    = "HOLD"
            confidence = 0.55

        reasoning = (
            f"ALLOW signals ({allow_score}): {'; '.join(signals_allow) or 'none'}. "
            f"HOLD signals ({len(signals_hold)}): {'; '.join(signals_hold) or 'none'}."
        )

        return {
            "verdict":           verdict,
            "confidence":        round(confidence, 2),
            "reasoning":         reasoning,
            "primary_signals":   signals_allow + signals_hold,
            "adversarial_flags": adversarial,
        }


# ---------------------------------------------------------------------------
# Gemini API (online, if key is available)
# ---------------------------------------------------------------------------

def _gemini_analyze(narrative: str) -> Optional[Dict[str, Any]]:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = f"""You are Fraudinate, a bank fraud detection AI. Analyze this transaction narrative
and classify it as ALLOW or HOLD (2-hour hold with bank alert).

ALLOW = legitimate fund pooling (capital pooling, fan-in from known contacts for a shared goal)
HOLD  = coordinated pass-through layering (money moves through accounts with no declared purpose,
         rapid drain, commission per hop, new/unknown accounts in chain)

Narrative:
{narrative}

Respond ONLY with valid JSON in this exact schema:
{{
  "verdict": "ALLOW" or "HOLD",
  "confidence": 0.0-1.0,
  "reasoning": "one concise paragraph",
  "primary_signals": ["signal1", "signal2"],
  "adversarial_flags": ["flag1"]
}}"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Extract JSON block
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            return json.loads(m.group(0))
    except Exception as e:
        print(f"[LLMInvestigator] Gemini API error: {e}")
    return None


# ---------------------------------------------------------------------------
# Pre-built graph representations for the 5 canonical cases
# ---------------------------------------------------------------------------

CASE_GRAPHS: Dict[str, Dict[str, Any]] = {

    # ── Case 1: Medical Emergency ──────────────────────────────────────
    "case_medical_emergency": {
        "declared_purpose":   "hospital advance payment for mother",
        "prior_relationship": True,
        "terminal_nodes":     ["A"],
        "hop_count":          2,
        "rapid_drain_pct":    0.0,   # money stays with A for hospital
        "new_account_ids":    [],
        "commission_per_hop": False,
        "transactions": [
            {"from": "B", "to": "A", "amount": 30000,  "minutes_after_start": 0},
            {"from": "C", "to": "B", "amount": 80000,  "minutes_after_start": 5},
            {"from": "B", "to": "A", "amount": 80000,  "minutes_after_start": 6},
            {"from": "D", "to": "C", "amount": 40000,  "minutes_after_start": 10},
            {"from": "C", "to": "B", "amount": 40000,  "minutes_after_start": 12},
            {"from": "B", "to": "A", "amount": 40000,  "minutes_after_start": 13},
        ],
    },

    # ── Case 2: College Fee ────────────────────────────────────────────
    "case_college_fee": {
        "declared_purpose":   "college tuition fee payment",
        "prior_relationship": True,
        "terminal_nodes":     ["Student"],
        "hop_count":          1,
        "rapid_drain_pct":    0.0,
        "new_account_ids":    [],
        "commission_per_hop": False,
        "transactions": [
            {"from": "Father",   "to": "Student", "amount": 80000,  "minutes_after_start": 0},
            {"from": "Uncle",    "to": "Student", "amount": 40000,  "minutes_after_start": 10},
            {"from": "GrandFather","to":"Student","amount": 30000,  "minutes_after_start": 20},
        ],
    },

    # ── Case 3: Business Inventory ─────────────────────────────────────
    "case_business_inventory": {
        "declared_purpose":   "bulk inventory purchase for business",
        "prior_relationship": True,
        "terminal_nodes":     ["BusinessOwner"],
        "hop_count":          1,
        "rapid_drain_pct":    0.15,  # some goes to vendor, still legitimate
        "new_account_ids":    [],
        "commission_per_hop": False,
        "transactions": [
            {"from": "Partner1", "to": "BusinessOwner", "amount": 150000, "minutes_after_start": 0},
            {"from": "Partner2", "to": "BusinessOwner", "amount": 100000, "minutes_after_start": 30},
            {"from": "Partner3", "to": "BusinessOwner", "amount": 75000,  "minutes_after_start": 60},
        ],
    },

    # ── Case 4: Fake Refund Chain ──────────────────────────────────────
    "case_fake_refund_chain": {
        "declared_purpose":   "",   # no declared purpose
        "prior_relationship": False,
        "terminal_nodes":     ["MuleX", "MuleY"],
        "hop_count":          4,
        "rapid_drain_pct":    0.95,  # >95% drained immediately each hop
        "new_account_ids":    ["IntermediaryB", "IntermediaryC", "MuleX", "MuleY"],
        "commission_per_hop": True,
        "transactions": [
            {"from": "Victim",        "to": "IntermediaryB","amount": 50000,  "minutes_after_start": 0},
            {"from": "IntermediaryB", "to": "IntermediaryC","amount": 48000,  "minutes_after_start": 2},
            {"from": "IntermediaryC", "to": "MuleX",        "amount": 46000,  "minutes_after_start": 4},
            {"from": "MuleX",         "to": "MuleY",        "amount": 44000,  "minutes_after_start": 6},
        ],
    },

    # ── Case 5: Six-Account Money Movement ─────────────────────────────
    "case_six_account_movement": {
        "declared_purpose":   "",
        "prior_relationship": False,
        "terminal_nodes":     ["Account_F"],
        "hop_count":          5,
        "rapid_drain_pct":    0.92,
        "new_account_ids":    ["Account_B","Account_C","Account_D","Account_E","Account_F"],
        "commission_per_hop": True,
        "transactions": [
            {"from": "Account_A", "to": "Account_B", "amount": 100000, "minutes_after_start": 0},
            {"from": "Account_B", "to": "Account_C", "amount": 97000,  "minutes_after_start": 3},
            {"from": "Account_C", "to": "Account_D", "amount": 94000,  "minutes_after_start": 6},
            {"from": "Account_D", "to": "Account_E", "amount": 91000,  "minutes_after_start": 9},
            {"from": "Account_E", "to": "Account_F", "amount": 88000,  "minutes_after_start": 12},
        ],
    },
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class LLMInvestigator:

    def __init__(self):
        self._cot = OfflineCoT()

    def investigate(self,
                    graph: Optional[Dict[str, Any]] = None,
                    case_id: Optional[str] = None,
                    narrative: Optional[str] = None,
                    ) -> Dict[str, Any]:
        """
        Analyze a transaction graph. Use case_id for the 5 canonical cases.
        """
        if case_id and case_id in CASE_GRAPHS:
            graph = CASE_GRAPHS[case_id]

        # Online path: Gemini API
        if narrative:
            result = _gemini_analyze(narrative)
            if result:
                result["source"] = "gemini_api"
                return result

        # Offline path: deterministic CoT
        if graph is None:
            return {
                "verdict":           "HOLD",
                "confidence":        0.5,
                "reasoning":         "No graph provided — conservative HOLD",
                "primary_signals":   [],
                "adversarial_flags": [],
                "source":            "offline_cot_default",
            }

        result = self._cot.analyze(graph)
        result["source"] = "offline_cot"
        return result


# Singleton
llm_investigator = LLMInvestigator()
