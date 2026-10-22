import random
from datetime import datetime


BANKS = [
    "Bank A",
    "Bank B",
    "Bank C",
    "Bank D"
]


# Persistent accounts used by the simulator.
# Reusing these accounts allows the network detector
# to observe patterns across multiple transactions.

ACCOUNTS = {
    "Bank A": ["A-1001", "A-1002", "A-1003", "A-1004"],
    "Bank B": ["B-2001", "B-2002", "B-2003", "B-2004"],
    "Bank C": ["C-3001", "C-3002", "C-3003", "C-3004"],
    "Bank D": ["D-4001", "D-4002", "D-4003", "D-4004"]
}


def generate_transaction():
    """
    Generate a simulated financial transaction.

    Some transactions reuse the same accounts so that
    repeated money-flow patterns can be detected.
    """

    transaction_type = random.choices(
        ["normal", "suspicious", "high_risk"],
        weights=[60, 25, 15],
        k=1
    )[0]

    # ---------------------------------------------------------
    # Normal transaction
    # ---------------------------------------------------------

    if transaction_type == "normal":

        sender_bank = random.choice(BANKS)
        receiver_bank = random.choice(BANKS)

        sender_account = random.choice(ACCOUNTS[sender_bank])
        receiver_account = random.choice(ACCOUNTS[receiver_bank])

        amount = random.randint(500, 15000)
        velocity = random.randint(1, 4)
        account_age = random.randint(180, 2500)
        recipients = random.randint(1, 3)

    # ---------------------------------------------------------
    # Suspicious transaction
    # ---------------------------------------------------------

    elif transaction_type == "suspicious":

        # Reuse a smaller set of accounts so suspicious
        # behavior can accumulate in the network.
        sender_bank = random.choice(["Bank A", "Bank B"])

        receiver_bank = random.choice(
            [bank for bank in BANKS if bank != sender_bank]
        )

        sender_account = random.choice(
            ACCOUNTS[sender_bank][:2]
        )

        receiver_account = random.choice(
            ACCOUNTS[receiver_bank]
        )

        amount = random.randint(15000, 70000)
        velocity = random.randint(5, 12)
        account_age = random.randint(15, 120)
        recipients = random.randint(4, 10)

    # ---------------------------------------------------------
    # High-risk transaction
    # ---------------------------------------------------------

    else:

        # Concentrate high-risk activity around a small
        # number of accounts to create network patterns.
        sender_bank = random.choice(["Bank A", "Bank B"])

        receiver_bank = random.choice(
            [bank for bank in BANKS if bank != sender_bank]
        )

        sender_account = random.choice(
            ACCOUNTS[sender_bank][:2]
        )

        receiver_account = random.choice(
            ACCOUNTS[receiver_bank]
        )

        amount = random.randint(50000, 150000)
        velocity = random.randint(10, 20)
        account_age = random.randint(1, 30)
        recipients = random.randint(8, 20)

    return {
        "sender_bank": sender_bank,
        "sender_account": sender_account,
        "receiver_bank": receiver_bank,
        "receiver_account": receiver_account,
        "amount": amount,
        "velocity": velocity,
        "account_age": account_age,
        "recipients": recipients,
        "created_at": datetime.now().isoformat()
    }


def generate_transactions(count=10):
    """Generate multiple simulated transactions."""

    return [
        generate_transaction()
        for _ in range(count)
    ]