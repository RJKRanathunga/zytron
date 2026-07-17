from __future__ import annotations

from app.extensions import db
from app.models import CollectorOffer, Reservation


def test_accept_offer_rejects_competing_offers(client, owner_token, auth_header, app):
    response = client.post(
        "/api/v1/offers/offer-greennova/accept",
        headers=auth_header(owner_token),
        json={"pickupDate": "Sat 18 Jul", "timeWindow": "9:00 AM-11:00 AM"},
    )
    assert response.status_code == 200, response.get_json()
    with app.app_context():
        assert db.session.get(CollectorOffer, "offer-greennova").status == "accepted"
        assert db.session.get(CollectorOffer, "offer-katubedda").status == "rejected"
        assert Reservation.query.filter_by(lot_id="lot-uom-pp", collector_id="collector-demo", status="confirmed").first()


def test_reserve_available_lot_prevents_double_reservation_and_cancels(client, collector_token, second_collector_token, auth_header, app):
    first = client.post(
        "/api/v1/lots/lot-dehiwala-hdpe/reservations",
        headers=auth_header(collector_token),
        json={"date": "Mon 20 Jul", "timeWindow": "10:00 AM-11:00 AM"},
    )
    assert first.status_code == 201, first.get_json()
    reservation_id = first.get_json()["data"]["id"]

    second = client.post(
        "/api/v1/lots/lot-dehiwala-hdpe/reservations",
        headers=auth_header(second_collector_token),
        json={"date": "Mon 20 Jul", "timeWindow": "1:00 PM-2:00 PM"},
    )
    assert second.status_code == 409

    cancelled = client.post(f"/api/v1/reservations/{reservation_id}/cancel", headers=auth_header(collector_token))
    assert cancelled.status_code == 200
    with app.app_context():
        assert db.session.get(Reservation, reservation_id).status == "cancelled"


def test_submit_and_reject_offer(client, collector_token, owner_token, auth_header):
    created = client.post(
        "/api/v1/lots/lot-kesbewa-pp/offers",
        headers=auth_header(collector_token),
        json={"pricePerKg": 100, "pickupWindow": "Tomorrow", "message": "Can collect."},
    )
    assert created.status_code == 201, created.get_json()
    offer_id = created.get_json()["data"]["id"]

    rejected = client.post(f"/api/v1/offers/{offer_id}/reject", headers=auth_header(owner_token))
    assert rejected.status_code == 200
    assert rejected.get_json()["data"]["status"] == "rejected"
