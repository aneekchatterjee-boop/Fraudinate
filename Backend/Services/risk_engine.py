def calculate_risk(transaction):
    """
    Calculate a behavioral risk score for a transaction.

    Returns:
        {
            "score": int,
            "signals": list[str]
        }
    """

    score = 0
    signals = []

    amount = float(transaction.get("amount", 0))
    velocity = int(transaction.get("velocity", 0))
    account_age = int(transaction.get("account_age", 0))
    recipients = int(transaction.get("recipients", 0))

    # ---------------------------------------------------------
    # 1. Transaction amount
    # ---------------------------------------------------------
    if amount >= 100000:
        score += 30
        signals.append("VERY HIGH AMOUNT")
    elif amount >= 50000:
        score += 20
        signals.append("HIGH AMOUNT")
    elif amount >= 25000:
        score += 10
        signals.append("ELEVATED AMOUNT")

    # ---------------------------------------------------------
    # 2. Transaction velocity
    # ---------------------------------------------------------
    if velocity >= 15:
        score += 30
        signals.append("VERY HIGH VELOCITY")
    elif velocity >= 10:
        score += 20
        signals.append("HIGH VELOCITY")
    elif velocity >= 5:
        score += 10
        signals.append("ELEVATED VELOCITY")

    # ---------------------------------------------------------
    # 3. Account age
    # ---------------------------------------------------------
    if account_age <= 7:
        score += 25
        signals.append("VERY NEW ACCOUNT")
    elif account_age <= 30:
        score += 15
        signals.append("NEW ACCOUNT")
    elif account_age <= 90:
        score += 5
        signals.append("RECENTLY CREATED ACCOUNT")

    # ---------------------------------------------------------
    # 4. Number of recipients
    # ---------------------------------------------------------
    if recipients >= 15:
        score += 20
        signals.append("HIGH RECIPIENT COUNT")
    elif recipients >= 8:
        score += 15
        signals.append("MULTIPLE RECIPIENTS")
    elif recipients >= 4:
        score += 5
        signals.append("ELEVATED RECIPIENT COUNT")

    # ---------------------------------------------------------
    # Cap score at 100
    # ---------------------------------------------------------
    score = min(score, 100)

    return {
        "score": score,
        "signals": signals
    }


def get_decision(score):
    """
    Convert a risk score into a transaction decision.
    """

    if score >= 75:
        return "BLOCK"

    if score >= 45:
        return "HOLD"

    return "ALLOW"