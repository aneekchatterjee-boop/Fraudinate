import random
from datetime import datetime


BANKS = [
    "Bank A",
    "Bank B",
    "Bank C",
    "Bank D"
]


def generate_account(bank):
    """Generate a simulated account ID."""
    return f"{bank.replace(' ', '')}-{random.randint(1000, 9999)}"


def generate_transaction():
    """
    Generate a simulated financial transaction.

    The generated transaction contains behavioral
    characteristics that our risk engine can analyze.
    """

    sender_bank = random.choice(BANKS)

    # Make sure receiver bank can be different
    receiver_bank = random.choice(BANKS)

    sender_account = generate_account(sender_bank)
    receiver_account = generate_account(receiver_bank)

    # Most transactions should be relatively normal,
    # with occasional high-risk characteristics.
    transaction_type = random.choices(
        ["normal", "suspicious", "high_risk"],
        weights=[65, 25, 10],
        k=1
    )[0]

    if transaction_type == "normal":
        amount = random.randint(500, 15000)
        velocity = random.randint(1, 4)
        account_age = random.randint(180, 2500)
        recipients = random.randint(1, 3)

    elif transaction_type == "suspicious":
        amount = random.randint(15000, 70000)
        velocity = random.randint(5, 12)
        account_age = random.randint(15, 120)
        recipients = random.randint(4, 10)

    else:
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