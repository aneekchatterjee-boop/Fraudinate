from collections import defaultdict


def analyze_network(transactions):
    """
    Analyze transaction relationships and identify
    potentially suspicious account networks.

    Returns:
        {
            "nodes": [...],
            "edges": [...],
            "suspicious_networks": int
        }
    """

    nodes = {}
    edges = []

    # Track how many different receivers each sender has
    sender_receivers = defaultdict(set)

    # Track how many times an account appears as a sender
    sender_frequency = defaultdict(int)

    for tx in transactions:
        sender = tx["sender_account"]
        receiver = tx["receiver_account"]

        sender_bank = tx["sender_bank"]
        receiver_bank = tx["receiver_bank"]

        risk_score = int(tx.get("risk_score", 0))
        amount = float(tx.get("amount", 0))

        # ---------------------------------------------------------
        # Create sender node
        # ---------------------------------------------------------
        if sender not in nodes:
            nodes[sender] = {
                "id": sender,
                "label": sender,
                "bank": sender_bank,
                "risk_score": risk_score,
                "type": "account"
            }
        else:
            nodes[sender]["risk_score"] = max(
                nodes[sender]["risk_score"],
                risk_score
            )

        # ---------------------------------------------------------
        # Create receiver node
        # ---------------------------------------------------------
        if receiver not in nodes:
            nodes[receiver] = {
                "id": receiver,
                "label": receiver,
                "bank": receiver_bank,
                "risk_score": risk_score,
                "type": "account"
            }
        else:
            nodes[receiver]["risk_score"] = max(
                nodes[receiver]["risk_score"],
                risk_score
            )

        # ---------------------------------------------------------
        # Track network relationships
        # ---------------------------------------------------------
        sender_receivers[sender].add(receiver)
        sender_frequency[sender] += 1

        # ---------------------------------------------------------
        # Create graph edge
        # ---------------------------------------------------------
        edges.append({
            "id": f"tx-{tx['id']}",
            "source": sender,
            "target": receiver,
            "amount": amount,
            "risk_score": risk_score
        })

    # -------------------------------------------------------------
    # Identify suspicious network patterns
    # -------------------------------------------------------------

    suspicious_networks = 0

    for sender, receivers in sender_receivers.items():

        # Fan-out pattern:
        # one account sending money to many accounts
        if len(receivers) >= 5:
            suspicious_networks += 1

            nodes[sender]["risk_score"] = max(
                nodes[sender]["risk_score"],
                80
            )

        # High-frequency sender
        if sender_frequency[sender] >= 10:
            nodes[sender]["risk_score"] = max(
                nodes[sender]["risk_score"],
                85
            )

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "suspicious_networks": suspicious_networks
    }


def get_network_risk(account_id, transactions):
    """
    Calculate network-level risk for a specific account.
    """

    outgoing = []
    incoming = []

    for tx in transactions:

        if tx["sender_account"] == account_id:
            outgoing.append(tx)

        if tx["receiver_account"] == account_id:
            incoming.append(tx)

    unique_receivers = {
        tx["receiver_account"]
        for tx in outgoing
    }

    unique_senders = {
        tx["sender_account"]
        for tx in incoming
    }

    risk = 0
    signals = []

    # Many outgoing recipients
    if len(unique_receivers) >= 5:
        risk += 35
        signals.append("HIGH NETWORK FAN-OUT")

    # Many incoming sources
    if len(unique_senders) >= 5:
        risk += 25
        signals.append("MULTIPLE FUNDING SOURCES")

    # Large number of outgoing transactions
    if len(outgoing) >= 10:
        risk += 30
        signals.append("HIGH NETWORK VELOCITY")

    # Account both receives and distributes money
    if incoming and outgoing:
        risk += 15
        signals.append("FLOW-THROUGH ACCOUNT")

    risk = min(risk, 100)

    return {
        "score": risk,
        "signals": signals
    }