from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from app.errors import ApiError, Conflict, InvalidState
from app.extensions import db
from app.models import ListingPayment, Package, PaymentTransaction, PlasticLot, SellerSubscription, User
from app.models.base import utc_now

PRO_CODE = "ZYTRON_PRO"
FLEX_CODE = "ZYTRON_FLEX"
ACTIVE_SUBSCRIPTION_STATUSES = {"active"}
PUBLISHED_LOT_STATUSES = {"available", "published", "reserved", "pickup_scheduled", "completed", "collected", "sold"}


def get_package(code: str) -> Package:
    package = Package.query.filter_by(code=code, is_active=True).first()
    if not package:
        raise ApiError("package_not_available", "The requested package is not available.", 404)
    return package


def available_packages() -> list[Package]:
    return Package.query.filter_by(is_active=True).order_by(Package.price.desc()).all()


def get_seller_package(seller: User) -> Package | None:
    subscription = get_active_subscription(seller)
    return subscription.package if subscription else None


def get_active_subscription(seller: User) -> SellerSubscription | None:
    now = utc_now()
    return (
        SellerSubscription.query.join(Package)
        .filter(
            SellerSubscription.seller_id == seller.id,
            SellerSubscription.status.in_(ACTIVE_SUBSCRIPTION_STATUSES),
            Package.code == PRO_CODE,
            (SellerSubscription.current_period_end.is_(None)) | (SellerSubscription.current_period_end > now),
        )
        .order_by(SellerSubscription.current_period_end.desc())
        .first()
    )


def can_publish_listing(seller: User, listing: PlasticLot | None = None) -> dict:
    subscription = get_active_subscription(seller)
    if subscription:
        package = subscription.package
        if package.listing_limit is not None:
            published_count = PlasticLot.query.filter(
                PlasticLot.owner_id == seller.id,
                PlasticLot.status.in_(["available", "published", "reserved", "pickup_scheduled"]),
            ).count()
            if published_count >= package.listing_limit:
                return {"allowed": False, "reason": "listing_limit_reached", "package": package, "subscription": subscription}
        return {"allowed": True, "source": "pro_subscription", "package": package, "subscription": subscription}

    if listing:
        paid = ListingPayment.query.filter_by(seller_id=seller.id, listing_id=listing.id, status="paid").first()
        if paid:
            return {"allowed": True, "source": "flex_payment", "package": paid.package, "listing_payment": paid}

    return {"allowed": False, "reason": "payment_required", "package": get_package(FLEX_CODE)}


def create_pending_subscription(seller: User, provider: str = "mock") -> SellerSubscription:
    package = get_package(PRO_CODE)
    existing = get_active_subscription(seller)
    if existing:
        return existing
    pending = SellerSubscription.query.filter_by(seller_id=seller.id, package_id=package.id, status="pending", provider=provider).first()
    if pending:
        return pending
    subscription = SellerSubscription(seller=seller, package=package, status="pending", provider=provider)
    db.session.add(subscription)
    db.session.flush()
    return subscription


def activate_subscription(
    subscription: SellerSubscription,
    *,
    provider_subscription_id: str | None = None,
    provider_customer_id: str | None = None,
    period_days: int = 30,
) -> SellerSubscription:
    now = utc_now()
    subscription.status = "active"
    subscription.started_at = subscription.started_at or now
    subscription.current_period_start = now
    subscription.current_period_end = now + timedelta(days=period_days)
    subscription.cancel_at_period_end = False
    subscription.cancelled_at = None
    subscription.provider_subscription_id = provider_subscription_id or subscription.provider_subscription_id
    subscription.provider_customer_id = provider_customer_id or subscription.provider_customer_id
    db.session.flush()
    return subscription


def cancel_subscription(subscription: SellerSubscription) -> SellerSubscription:
    if subscription.status not in {"active", "past_due", "pending"}:
        raise InvalidState("This subscription cannot be cancelled.")
    now = utc_now()
    if subscription.status == "pending":
        subscription.status = "cancelled"
        subscription.cancelled_at = now
    else:
        subscription.cancel_at_period_end = True
        subscription.cancelled_at = now
    db.session.flush()
    return subscription


def expire_subscription(subscription: SellerSubscription) -> SellerSubscription:
    if subscription.status in {"cancelled", "expired"}:
        return subscription
    subscription.status = "expired"
    db.session.flush()
    return subscription


def mark_subscription_past_due(subscription: SellerSubscription) -> SellerSubscription:
    if subscription.status not in {"cancelled", "expired"}:
        subscription.status = "past_due"
    db.session.flush()
    return subscription


def record_subscription_payment(subscription: SellerSubscription, status: str = "paid", provider_reference: str | None = None, metadata: dict | None = None) -> PaymentTransaction:
    transaction = PaymentTransaction.query.filter_by(subscription_id=subscription.id, provider_reference=provider_reference).first() if provider_reference else None
    if transaction:
        transaction.status = status
        transaction.metadata_json = {**(transaction.metadata_json or {}), **(metadata or {})}
        db.session.flush()
        return transaction
    transaction = PaymentTransaction(
        seller_id=subscription.seller_id,
        subscription=subscription,
        transaction_type="subscription_payment" if not subscription.started_at else "subscription_renewal",
        amount=subscription.package.price,
        currency=subscription.package.currency,
        status=status,
        provider=subscription.provider,
        provider_reference=provider_reference,
        metadata_json=metadata or {},
    )
    db.session.add(transaction)
    db.session.flush()
    return transaction


def get_subscription_history(seller: User) -> list[SellerSubscription]:
    return SellerSubscription.query.filter_by(seller_id=seller.id).order_by(SellerSubscription.created_at.desc()).all()


def billing_summary(seller: User) -> dict:
    active = get_active_subscription(seller)
    package = active.package if active else get_package(FLEX_CODE)
    return {
        "currentPackage": package,
        "activeSubscription": active,
        "publishedListingCount": PlasticLot.query.filter(PlasticLot.owner_id == seller.id, PlasticLot.status.in_(["available", "published"])).count(),
        "draftListingCount": PlasticLot.query.filter_by(owner_id=seller.id, status="draft").count(),
        "pendingPaymentCount": ListingPayment.query.filter_by(seller_id=seller.id, status="pending").count(),
        "subscriptionHistory": get_subscription_history(seller),
        "paymentHistory": PaymentTransaction.query.filter_by(seller_id=seller.id).order_by(PaymentTransaction.created_at.desc()).all(),
        "listingPayments": ListingPayment.query.filter_by(seller_id=seller.id).order_by(ListingPayment.created_at.desc()).all(),
    }
