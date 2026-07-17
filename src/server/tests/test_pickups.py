from __future__ import annotations

from decimal import Decimal

from app.extensions import db
from app.models import BinCompartment, Pickup, Transaction


def test_verify_complete_pickup_calculates_transaction_and_inventory(client, collector_token, auth_header, app):
    verified = client.post(
        "/api/v1/pickups/pickup-greennova/verify-weight",
        headers=auth_header(collector_token),
        json={"verifiedWeightKg": 10},
    )
    assert verified.status_code == 200

    completed = client.post("/api/v1/pickups/pickup-greennova/complete", headers=auth_header(collector_token))
    assert completed.status_code == 200
    assert completed.get_json()["data"]["status"] == "completed"

    with app.app_context():
        pickup = db.session.get(Pickup, "pickup-greennova")
        transaction = Transaction.query.filter_by(pickup_id="pickup-greennova").first()
        compartment = db.session.get(BinCompartment, "comp-b01-pp")
        assert pickup.total_amount == Decimal("1020.00")
        assert transaction.payment_status == "paid"
        assert compartment.current_weight_kg == Decimal("7.80")

    duplicate = client.post("/api/v1/pickups/pickup-greennova/complete", headers=auth_header(collector_token))
    assert duplicate.status_code == 422


def test_schedule_and_cancel_pickup(client, owner_token, auth_header):
    scheduled = client.post(
        "/api/v1/pickups/pickup-uom-pp/schedule",
        headers=auth_header(owner_token),
        json={"pickupDate": "Sat 18 Jul", "timeWindow": "9:00 AM-11:00 AM"},
    )
    assert scheduled.status_code == 200
    assert scheduled.get_json()["data"]["status"] == "scheduled"

    cancelled = client.post("/api/v1/pickups/pickup-uom-pp/cancel", headers=auth_header(owner_token))
    assert cancelled.status_code == 200
    assert cancelled.get_json()["data"]["status"] == "cancelled"
