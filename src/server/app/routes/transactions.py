from __future__ import annotations

from decimal import Decimal

from flask import Blueprint

from app.errors import ResourceNotFound
from app.models import Transaction
from app.permissions import current_user
from app.routes.helpers import data_response, paginated_response
from app.services.serializers import transaction_for_collector, transaction_for_owner
from app.services.workflows import get_or_404, mark_transaction_paid

bp = Blueprint("transactions", __name__, url_prefix="")


def serialize_for(user, transaction: Transaction) -> dict:
    return transaction_for_owner(transaction) if user.role == "owner" else transaction_for_collector(transaction)


def transaction_query(user):
    query = Transaction.query
    if user.role == "owner":
        query = query.filter_by(owner_id=user.id)
    elif user.role == "collector":
        query = query.filter_by(collector_id=user.id)
    return query


@bp.get("/transactions")
def list_transactions():
    user = current_user()
    return paginated_response(transaction_query(user).order_by(Transaction.created_at.desc()), lambda txn: serialize_for(user, txn), default_per_page=50)


@bp.get("/transactions/<transaction_id>")
def get_transaction(transaction_id: str):
    user = current_user()
    transaction = get_or_404(Transaction, transaction_id, "The requested transaction was not found.")
    if user.role != "admin" and user.id not in {transaction.owner_id, transaction.collector_id}:
        raise ResourceNotFound("The requested transaction was not found.")
    return data_response(serialize_for(user, transaction))


@bp.get("/earnings/summary")
def earnings_summary():
    user = current_user()
    query = transaction_query(user)
    paid_total = sum((txn.total_amount for txn in query.filter_by(payment_status="paid").all()), Decimal("0"))
    pending_total = sum((txn.total_amount for txn in transaction_query(user).filter(Transaction.payment_status != "paid").all()), Decimal("0"))
    return data_response({"paidTotal": float(paid_total), "pendingTotal": float(pending_total), "currency": "LKR"})


@bp.get("/earnings/timeseries")
def earnings_timeseries():
    user = current_user()
    rows = transaction_query(user).order_by(Transaction.created_at.asc()).all()
    return data_response([{"date": txn.created_at.date().isoformat(), "amount": float(txn.total_amount), "status": txn.payment_status} for txn in rows])


@bp.get("/spending/summary")
def spending_summary():
    user = current_user()
    query = transaction_query(user)
    total = sum((txn.total_amount for txn in query.all()), Decimal("0"))
    return data_response({"total": float(total), "currency": "LKR"})


@bp.post("/transactions/<transaction_id>/mark-paid")
def mark_paid(transaction_id: str):
    user = current_user()
    transaction = mark_transaction_paid(user, transaction_id)
    return data_response(serialize_for(user, transaction))
