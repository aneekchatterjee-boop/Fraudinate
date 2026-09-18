from Services.risk_engine import get_decision


def fuse_risk(transaction_risk, network_risk):
    """
    Combine behavioral transaction risk and network risk.

    transaction_risk:
        Risk score from the individual transaction analysis.

    network_risk:
        Risk score from network-level analysis.

    Returns:
        {
            "score": int,
            "decision": str
        }
    """

    transaction_score = int(transaction_risk.get("score", 0))
    network_score = int(network_risk.get("score", 0))

    # Behavioral transaction risk has slightly more weight
    # because it describes the current transaction directly.
    final_score = (
        transaction_score * 0.6
        + network_score * 0.4
    )

    final_score = round(final_score)
    final_score = min(max(final_score, 0), 100)

    decision = get_decision(final_score)

    return {
        "score": final_score,
        "decision": decision
    }


def combine_signals(transaction_risk, network_risk):
    """
    Combine behavioral and network risk signals
    while avoiding duplicate signals.
    """

    signals = []

    for signal in transaction_risk.get("signals", []):
        if signal not in signals:
            signals.append(signal)

    for signal in network_risk.get("signals", []):
        if signal not in signals:
            signals.append(signal)

    return signals