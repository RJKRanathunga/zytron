from __future__ import annotations

from flask import Blueprint, request

from app.extensions import db
from app.models import ListingPayment, PaymentTransaction, SellerSubscription
from app.routes.helpers import data_response
from app.services.listing_payments import confirm_listing_payment, fail_listing_payment, mark_listing_payment_processing
from app.services.payment_provider import get_payment_provider
from app.services.subscriptions import activate_subscription, expire_subscription, mark_subscription_past_due, record_subscription_payment

bp = Blueprint("payments", __name__, url_prefix="/payments")


@bp.post("/webhook/<provider_name>")
def payment_webhook(provider_name: str):
    provider = get_payment_provider(provider_name)
    event = provider.verify_webhook(request.get_json(silent=True) or {}, dict(request.headers))
    existing = PaymentTransaction.query.filter_by(provider_event_id=event.event_id).first()
    if existing:
        return data_response({"processed": False, "transactionId": existing.id})

    reference = event.provider_reference
    subscription = SellerSubscription.query.filter_by(provider_subscription_id=reference, provider=provider_name).first()
    listing_payment = ListingPayment.query.filter_by(provider_payment_id=reference, provider=provider_name).first()

    if subscription:
        status = "paid" if event.status in {"paid", "active", "success"} else "failed"
        transaction = record_subscription_payment(subscription, status=status, provider_reference=reference, metadata=event.metadata)
        transaction.provider_event_id = event.event_id
        if event.event_type in {"subscription_cancelled", "subscription.expired"}:
            expire_subscription(subscription)
        elif event.event_type in {"subscription_renewal_failed", "subscription.failed"}:
            mark_subscription_past_due(subscription)
        elif status == "paid":
            activate_subscription(subscription, provider_subscription_id=reference)
        db.session.commit()
        return data_response({"processed": True, "transactionId": transaction.id})

    if listing_payment:
        if event.status in {"processing", "pending"}:
            mark_listing_payment_processing(listing_payment, reference)
        elif event.status in {"paid", "success"}:
            confirm_listing_payment(listing_payment, reference, event.metadata)
        elif event.status in {"cancelled", "failed", "refunded"}:
            fail_listing_payment(listing_payment, event.status)
        transaction = PaymentTransaction.query.filter_by(listing_payment_id=listing_payment.id).first()
        if transaction:
            transaction.provider_event_id = event.event_id
        db.session.commit()
        return data_response({"processed": True, "transactionId": transaction.id if transaction else None})

    return data_response({"processed": False, "reason": "unknown_reference"}, 202)
