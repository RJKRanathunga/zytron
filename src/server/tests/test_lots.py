from __future__ import annotations

from app.extensions import db
from app.models import PlasticLot


def test_create_draft_publish_filter_and_withdraw_lot(client, owner_token, collector_token, auth_header, app):
    draft = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "material": "PP",
            "quantity_kg": 12,
            "pricePerKg": 100,
            "title": "Draft PP lot",
        },
    )
    assert draft.status_code == 201, draft.get_json()
    assert draft.get_json()["data"]["status"] == "draft"
    lot_id = draft.get_json()["data"]["id"]

    published = client.post(f"/api/v1/lots/{lot_id}/publish", headers=auth_header(owner_token))
    assert published.status_code == 200

    marketplace = client.get("/api/v1/lots?material=PP&minimum_weight=10", headers=auth_header(collector_token))
    assert marketplace.status_code == 200
    assert any(lot["id"] == lot_id for lot in marketplace.get_json()["data"])

    withdrawn = client.post(f"/api/v1/lots/{lot_id}/withdraw", headers=auth_header(owner_token))
    assert withdrawn.status_code == 200
    with app.app_context():
        assert db.session.get(PlasticLot, lot_id).status == "withdrawn"


def test_reject_invalid_price_and_invalid_withdraw_transition(client, owner_token, auth_header):
    invalid = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={"binId": "bin-a-01", "pricePerKg": -1, "pickupWindow": "Tomorrow"},
    )
    assert invalid.status_code == 400

    reserved = client.post("/api/v1/lots/lot-uom-pp-reserved/withdraw", headers=auth_header(owner_token))
    assert reserved.status_code == 422


def test_owner_publish_from_bin_not_available_to_collector_role(client, collector_token, auth_header):
    response = client.post(
        "/api/v1/lots",
        headers=auth_header(collector_token),
        json={"binId": "bin-a-03", "pricePerKg": 106, "pickupWindow": "Tomorrow"},
    )
    assert response.status_code == 403
