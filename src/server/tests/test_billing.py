from __future__ import annotations

from app.extensions import db
from app.models import ListingPayment, PlasticLot, SellerSubscription
from app.services.listing_payments import confirm_listing_payment, fail_listing_payment
from app.services.subscriptions import (
    activate_subscription,
    cancel_subscription,
    create_pending_subscription,
    expire_subscription,
    get_active_subscription,
)


def expire_demo_pro(owner_id: str):
    for subscription in SellerSubscription.query.filter_by(seller_id=owner_id):
        expire_subscription(subscription)
    db.session.commit()


def test_load_available_packages(client, owner_token, auth_header):
    response = client.get("/api/v1/packages", headers=auth_header(owner_token))
    assert response.status_code == 200
    codes = {package["code"] for package in response.get_json()["data"]}
    assert {"ZYTRON_PRO", "ZYTRON_FLEX"} <= codes


def test_pending_activate_cancel_and_expire_pro_subscription(client, owner_token, auth_header, app):
    with app.app_context():
        owner = PlasticLot.query.filter_by(id="lot-uom-pp").first().owner
        expire_demo_pro(owner.id)
        subscription = create_pending_subscription(owner)
        assert subscription.status == "pending"
        activate_subscription(subscription, provider_subscription_id="mock-sub-new")
        assert get_active_subscription(owner).id == subscription.id
        cancel_subscription(subscription)
        assert subscription.cancel_at_period_end is True
        expire_subscription(subscription)
        assert subscription.status == "expired"

    checkout = client.post("/api/v1/seller/subscription/checkout", headers=auth_header(owner_token))
    assert checkout.status_code == 201
    assert checkout.get_json()["data"]["subscription"]["status"] == "pending"


def test_publish_with_active_pro_and_buyer_access(client, owner_token, collector_token, auth_header):
    draft = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "material": "PP",
            "quantity_kg": 10,
            "pricePerKg": 100,
            "title": "PRO publish lot",
        },
    )
    lot_id = draft.get_json()["data"]["id"]

    published = client.post(f"/api/v1/lots/{lot_id}/publish", headers=auth_header(owner_token))
    assert published.status_code == 200
    assert published.get_json()["data"]["status"] == "published"

    marketplace = client.get("/api/v1/lots", headers=auth_header(collector_token))
    assert any(lot["id"] == lot_id for lot in marketplace.get_json()["data"])


def test_block_publish_without_pro_then_publish_after_flex_payment(client, owner_token, auth_header, app):
    with app.app_context():
        owner_id = PlasticLot.query.filter_by(id="lot-uom-pp").first().owner_id
        expire_demo_pro(owner_id)

    draft = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "material": "HDPE",
            "quantity_kg": 8,
            "pricePerKg": 120,
            "title": "FLEX publish lot",
        },
    )
    lot_id = draft.get_json()["data"]["id"]
    blocked = client.post(f"/api/v1/lots/{lot_id}/publish", headers=auth_header(owner_token))
    assert blocked.status_code == 402
    assert blocked.get_json()["data"]["requiresPayment"] is True

    checkout = client.post(f"/api/v1/lots/{lot_id}/payment/checkout", headers=auth_header(owner_token))
    assert checkout.status_code == 201
    payment_id = checkout.get_json()["data"]["payment"]["id"]

    with app.app_context():
        payment = db.session.get(ListingPayment, payment_id)
        confirm_listing_payment(payment, "mock-flex-paid")
        db.session.commit()
        lot = db.session.get(PlasticLot, lot_id)
        assert lot.status == "published"
        assert lot.publication_source == "flex_payment"


def test_failed_flex_payment_preserves_draft(client, owner_token, auth_header, app):
    with app.app_context():
        owner_id = PlasticLot.query.filter_by(id="lot-uom-pp").first().owner_id
        expire_demo_pro(owner_id)

    draft = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "material": "PET",
            "quantity_kg": 7,
            "pricePerKg": 90,
            "title": "Failed FLEX lot",
        },
    )
    lot_id = draft.get_json()["data"]["id"]
    checkout = client.post(f"/api/v1/lots/{lot_id}/payment/checkout", headers=auth_header(owner_token))
    payment_id = checkout.get_json()["data"]["payment"]["id"]

    with app.app_context():
        payment = db.session.get(ListingPayment, payment_id)
        fail_listing_payment(payment)
        db.session.commit()
        lot = db.session.get(PlasticLot, lot_id)
        assert lot.status == "draft"


def test_duplicate_flex_confirmation_is_idempotent(client, owner_token, auth_header, app):
    draft = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "material": "PP",
            "quantity_kg": 6,
            "pricePerKg": 100,
            "title": "Duplicate payment lot",
        },
    )
    lot_id = draft.get_json()["data"]["id"]
    checkout = client.post(f"/api/v1/lots/{lot_id}/payment/checkout", headers=auth_header(owner_token))
    payment_id = checkout.get_json()["data"]["payment"]["id"]

    with app.app_context():
        payment = db.session.get(ListingPayment, payment_id)
        confirm_listing_payment(payment, "mock-duplicate")
        confirm_listing_payment(payment, "mock-duplicate")
        db.session.commit()
        assert ListingPayment.query.filter_by(listing_id=lot_id, status="paid").count() == 1


def test_seller_billing_history_and_unauthorized_access(client, owner_token, collector_token, auth_header):
    billing = client.get("/api/v1/seller/billing", headers=auth_header(owner_token))
    assert billing.status_code == 200
    assert "subscriptionHistory" in billing.get_json()["data"]

    unauthorized = client.get("/api/v1/seller/billing", headers=auth_header(collector_token))
    assert unauthorized.status_code == 403
