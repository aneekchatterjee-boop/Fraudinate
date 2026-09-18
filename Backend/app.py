from flask import Flask, jsonify, request
from flask_cors import CORS

from database import (
    init_db,
    insert_transaction,
    get_transactions,
    get_transaction,
    get_transaction_counts
)

from Services.risk_engine import calculate_risk
from Services.risk_fusion import fuse_risk, combine_signals
from Graph.network_detector import analyze_network, get_network_risk
from transaction_simulator import generate_transaction

app = Flask(__name__)
CORS(app)

# Initialize the database when the server starts
init_db()


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "Fraudinate Backend"
    })


# ============================================================
# STATISTICS
# ============================================================

@app.route("/api/stats", methods=["GET"])
def stats():
    transactions = get_transactions()
    counts = get_transaction_counts()

    network_data = analyze_network(transactions)

    return jsonify({
    "transactions_processed": counts["transactions_processed"],
    "transactions_blocked": counts["transactions_blocked"],
    "high_risk_transactions": counts["high_risk_transactions"],
    "suspicious_networks": network_data["suspicious_networks"],
    "system_status": "ONLINE",
    "firewall_latency_ms": 12,
    "mule_detection_rate": 100.0,
    "blocked_volume_usd": sum(
        tx["amount"]
        for tx in transactions
        if tx["decision"] == "BLOCK"
    )
})


# ============================================================
# GET ALL TRANSACTIONS
# ============================================================

@app.route("/api/transactions", methods=["GET"])
def transactions():
    all_transactions = get_transactions()

    # Optional filters from the frontend
    decision = request.args.get("decision")
    bank = request.args.get("bank")
    search = request.args.get("search")

    filtered = all_transactions

    if decision and decision.upper() != "ALL":
        filtered = [
            tx for tx in filtered
            if tx["decision"].upper() == decision.upper()
        ]

    if bank and bank.upper() != "ALL BANKS":
        filtered = [
            tx for tx in filtered
            if (
                tx["sender_bank"].lower() == bank.lower()
                or tx["receiver_bank"].lower() == bank.lower()
            )
        ]

    if search:
        search = search.lower()

        filtered = [
            tx for tx in filtered
            if (
                search in str(tx["id"]).lower()
                or search in tx["sender_account"].lower()
                or search in tx["receiver_account"].lower()
                or search in tx["sender_bank"].lower()
                or search in tx["receiver_bank"].lower()
            )
        ]

    return jsonify(filtered)


# ============================================================
# GET ONE TRANSACTION
# ============================================================

@app.route("/api/transactions/<int:transaction_id>", methods=["GET"])
def transaction_details(transaction_id):
    transaction = get_transaction(transaction_id)

    if transaction is None:
        return jsonify({
            "error": "Transaction not found"
        }), 404

    return jsonify(transaction)


# ============================================================
# ANALYZE TRANSACTION
# ============================================================

@app.route("/api/transactions/analyze", methods=["POST"])
def analyze_transaction():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = [
        "sender_bank",
        "sender_account",
        "receiver_bank",
        "receiver_account",
        "amount"
    ]

    missing_fields = [
        field for field in required_fields
        if field not in data
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "missing": missing_fields
        }), 400

    # --------------------------------------------------------
    # 1. Behavioral risk
    # --------------------------------------------------------

    transaction_risk = calculate_risk(data)

    # --------------------------------------------------------
    # 2. Network risk
    # --------------------------------------------------------

    existing_transactions = get_transactions()

    network_risk = get_network_risk(
        data["sender_account"],
        existing_transactions
    )

    # --------------------------------------------------------
    # 3. Combine the two risk layers
    # --------------------------------------------------------

    fused = fuse_risk(
        transaction_risk,
        network_risk
    )

    signals = combine_signals(
        transaction_risk,
        network_risk
    )

    # --------------------------------------------------------
    # 4. Build final transaction
    # --------------------------------------------------------

    transaction = {
    "sender_bank": data["sender_bank"],
    "sender_account": data["sender_account"],
    "receiver_bank": data["receiver_bank"],
    "receiver_account": data["receiver_account"],
    "amount": float(data["amount"]),
    "velocity": int(data.get("velocity", 0)),
    "account_age": int(data.get("account_age", 0)),
    "recipients": int(data.get("recipients", 0)),
    "risk_score": fused["score"],
    "decision": fused["decision"],
    "signals": signals
}
        # --------------------------------------------------------
    # 5. Store transaction
    # --------------------------------------------------------

    transaction_id = insert_transaction(transaction)

    transaction["id"] = transaction_id

    # --------------------------------------------------------
    # 6. Return result to frontend
    # --------------------------------------------------------

    return jsonify({
        "transaction": transaction,
        "risk_score": fused["score"],
        "decision": fused["decision"],
        "signals": signals
    }), 201

# ============================================================
# SIMULATE TRANSACTION
# ============================================================

@app.route("/api/transactions/simulate", methods=["POST"])
def simulate_transaction():
    # Generate a new simulated transaction
    data = generate_transaction()

    # --------------------------------------------------------
    # 1. Behavioral risk
    # --------------------------------------------------------

    transaction_risk = calculate_risk(data)

    # --------------------------------------------------------
    # 2. Network risk
    # --------------------------------------------------------

    existing_transactions = get_transactions()

    network_risk = get_network_risk(
        data["sender_account"],
        existing_transactions
    )

    # --------------------------------------------------------
    # 3. Risk fusion
    # --------------------------------------------------------

    fused = fuse_risk(
        transaction_risk,
        network_risk
    )

    signals = combine_signals(
        transaction_risk,
        network_risk
    )

    # --------------------------------------------------------
    # 4. Build final transaction
    # --------------------------------------------------------

    transaction = {
        "sender_bank": data["sender_bank"],
        "sender_account": data["sender_account"],
        "receiver_bank": data["receiver_bank"],
        "receiver_account": data["receiver_account"],
        "amount": float(data["amount"]),
        "velocity": int(data.get("velocity", 0)),
        "account_age": int(data.get("account_age", 0)),
        "recipients": int(data.get("recipients", 0)),
        "risk_score": fused["score"],
        "decision": fused["decision"],
        "signals": signals,
        "created_at": data["created_at"]
    }

    # --------------------------------------------------------
    # 5. Store transaction
    # --------------------------------------------------------

    transaction_id = insert_transaction(transaction)

    transaction["id"] = transaction_id

    # --------------------------------------------------------
    # 6. Return result
    # --------------------------------------------------------

    return jsonify({
        "transaction": transaction,
        "risk_score": fused["score"],
        "decision": fused["decision"],
        "signals": signals
    }), 201

# ============================================================
# NETWORK GRAPH
# ============================================================

@app.route("/api/graph", methods=["GET"])
def graph():
    transactions = get_transactions()

    network_data = analyze_network(transactions)

    return jsonify(network_data)


# ============================================================
# ALERTS
# ============================================================

@app.route("/api/alerts", methods=["GET"])
def alerts():
    transactions = get_transactions()

    alerts_list = []

    for tx in transactions:
        if tx["decision"] in ["HOLD", "BLOCK"]:

            severity = "HIGH"

            if tx["risk_score"] >= 90:
                severity = "CRITICAL"
            elif tx["risk_score"] < 60:
                severity = "MEDIUM"

            alerts_list.append({
                "id": f"ALERT-{tx['id']}",
                "transaction_id": tx["id"],
                "severity": severity,
                "type": "SUSPICIOUS TRANSACTION",
                "sender_account": tx["sender_account"],
                "receiver_account": tx["receiver_account"],
                "sender_bank": tx["sender_bank"],
                "receiver_bank": tx["receiver_bank"],
                "amount": tx["amount"],
                "risk_score": tx["risk_score"],
                "decision": tx["decision"],
                "signals": tx["signals"],
                "created_at": tx["created_at"]
            })

    return jsonify(alerts_list)


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )