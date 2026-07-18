from __future__ import annotations

from flask import Blueprint

from app.extensions import db
from app.permissions import current_user
from app.routes.helpers import data_response
from app.services.payment_provider import checkout_payload, get_payment_provider
from app.services.serializers import billing_record, package_record, payment_transaction_record, subscription_record
from app.services.subscriptions import (
    available_packages,
    billing_summary,
    cancel_subscription,
    create_pending_subscription,
    get_active_subscription,
)
from app.services.workflows import ensure_owner

bp = Blueprint("billing", __name__)


@bp.get("/packages")
def list_packages():
    return data_response([package_record(package) for package in available_packages()])


@bp.get("/seller/billing")
def get_seller_billing():
    user = current_user()
    ensure_owner(user)
    return data_response(billing_record(billing_summary(user)))


@bp.get("/seller/subscription")
def get_seller_subscription():
    user = current_user()
    ensure_owner(user)
    return data_response({"subscription": subscription_record(get_active_subscription(user))})


@bp.post("/seller/subscription/checkout")
def create_subscription_checkout():
    user = current_user()
    ensure_owner(user)
    subscription = create_pending_subscription(user)
    provider = get_payment_provider(subscription.provider)
    checkout = provider.create_subscription_checkout(
        {
            **checkout_payload(
                seller_id=user.id,
                package_code=subscription.package.code,
                amount=subscription.package.price,
                currency=subscription.package.currency,
                resource_id=subscription.id,
            ),
            "subscription_id": subscription.id,
        }
    )
    subscription.provider = checkout.provider
    subscription.provider_subscription_id = checkout.provider_reference
    db.session.commit()
    return data_response({"checkoutUrl": checkout.checkout_url, "subscription": subscription_record(subscription)}, 201)


@bp.post("/seller/subscription/cancel")
def cancel_seller_subscription():
    user = current_user()
    ensure_owner(user)
    subscription = get_active_subscription(user)
    if not subscription:
        return data_response({"subscription": None})
    provider = get_payment_provider(subscription.provider)
    if subscription.provider_subscription_id:
        provider.cancel_subscription(subscription.provider_subscription_id)
    cancel_subscription(subscription)
    db.session.commit()
    return data_response({"subscription": subscription_record(subscription)})


@bp.get("/seller/payments")
def get_seller_payments():
    user = current_user()
    ensure_owner(user)
    summary = billing_summary(user)
    return data_response(
        {
            "listingPayments": billing_record(summary)["listingPayments"],
            "paymentHistory": [payment_transaction_record(item) for item in summary["paymentHistory"]],
        }
    )
