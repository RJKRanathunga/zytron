from __future__ import annotations

from app.errors import Conflict, InvalidState, ResourceNotFound
from app.extensions import db
from app.models import ListingPayment, PaymentTransaction, PlasticLot, User
from app.models.base import utc_now
from app.services.subscriptions import FLEX_CODE, can_publish_listing, get_package
from app.services.workflows import create_notification, notify_matching_demand_alerts


def get_listing_payment(seller: User, listing: PlasticLot) -> ListingPayment | None:
    return (
        ListingPayment.query.filter_by(seller_id=seller.id, listing_id=listing.id)
        .order_by(ListingPayment.created_at.desc())
        .first()
    )


def create_listing_payment(seller: User, listing: PlasticLot, provider: str = "mock") -> ListingPayment:
    if listing.owner_id != seller.id:
        raise ResourceNotFound("The requested lot was not found.")
    if listing.status in {"available", "published", "reserved", "pickup_scheduled", "completed", "collected", "sold"}:
        return get_listing_payment(seller, listing) or _new_listing_payment(seller, listing, provider)
    paid = ListingPayment.query.filter_by(seller_id=seller.id, listing_id=listing.id, status="paid").first()
    if paid:
        return paid
    pending = ListingPayment.query.filter(
        ListingPayment.seller_id == seller.id,
        ListingPayment.listing_id == listing.id,
        ListingPayment.status.in_(["pending", "processing"]),
    ).first()
    if pending:
        return pending
    payment = _new_listing_payment(seller, listing, provider)
    listing.status = "payment_pending"
    listing.payment_required = True
    db.session.flush()
    return payment


def _new_listing_payment(seller: User, listing: PlasticLot, provider: str) -> ListingPayment:
    package = get_package(FLEX_CODE)
    payment = ListingPayment(
        seller=seller,
        listing=listing,
        package=package,
        amount=package.price,
        currency=package.currency,
        status="pending",
        provider=provider,
    )
    db.session.add(payment)
    db.session.flush()
    return payment


def mark_listing_payment_processing(payment: ListingPayment, provider_payment_id: str | None = None) -> ListingPayment:
    if payment.status == "paid":
        return payment
    payment.status = "processing"
    payment.provider_payment_id = provider_payment_id or payment.provider_payment_id
    db.session.flush()
    return payment


def confirm_listing_payment(payment: ListingPayment, provider_payment_id: str | None = None, metadata: dict | None = None) -> ListingPayment:
    if payment.status == "paid":
        publish_paid_listing(payment)
        return payment
    payment.status = "paid"
    payment.provider_payment_id = provider_payment_id or payment.provider_payment_id
    payment.paid_at = payment.paid_at or utc_now()
    transaction = PaymentTransaction.query.filter_by(listing_payment_id=payment.id, transaction_type="listing_payment").first()
    if not transaction:
        transaction = PaymentTransaction(
            seller_id=payment.seller_id,
            listing_payment=payment,
            transaction_type="listing_payment",
            amount=payment.amount,
            currency=payment.currency,
            status="paid",
            provider=payment.provider,
            provider_reference=payment.provider_payment_id,
            metadata_json=metadata or {},
        )
        db.session.add(transaction)
    else:
        transaction.status = "paid"
        transaction.provider_reference = payment.provider_payment_id or transaction.provider_reference
        transaction.metadata_json = {**(transaction.metadata_json or {}), **(metadata or {})}
    publish_paid_listing(payment)
    db.session.flush()
    return payment


def fail_listing_payment(payment: ListingPayment, status: str = "failed") -> ListingPayment:
    if payment.status == "paid":
        raise Conflict("payment_already_paid", "This listing payment has already been confirmed.")
    payment.status = status
    if payment.listing.status == "payment_pending":
        payment.listing.status = "draft"
        payment.listing.payment_required = True
    db.session.flush()
    return payment


def publish_paid_listing(payment: ListingPayment) -> PlasticLot:
    listing = payment.listing
    if payment.status != "paid":
        raise InvalidState("The listing payment has not been confirmed.")
    if listing.status in {"available", "published", "reserved", "pickup_scheduled", "completed", "collected", "sold"}:
        return listing
    eligibility = can_publish_listing(payment.seller, listing)
    if not eligibility["allowed"]:
        raise InvalidState("This listing is not eligible for publication.")
    listing.status = "published"
    listing.payment_required = False
    listing.publication_source = "flex_payment"
    listing.published_at = listing.published_at or utc_now()
    notify_matching_demand_alerts(listing)
    create_notification(payment.seller_id, "payment", "FLEX payment confirmed", f"{listing.title} is now visible to collectors.", "lot", listing.id)
    db.session.flush()
    return listing


def get_seller_payment_history(seller: User) -> list[ListingPayment]:
    return ListingPayment.query.filter_by(seller_id=seller.id).order_by(ListingPayment.created_at.desc()).all()
