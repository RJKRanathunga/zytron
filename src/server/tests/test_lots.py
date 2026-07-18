from __future__ import annotations

from decimal import Decimal

from app.extensions import db
from app.models import LotPlasticItem, PlasticLot


def test_create_draft_publish_filter_and_withdraw_lot(client, owner_token, collector_token, auth_header, app):
    draft = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "plasticItems": [{"plasticType": "PP", "weight": 12, "weightUnit": "kg"}],
            "pricePerKg": 100,
            "title": "Draft PP lot",
        },
    )
    assert draft.status_code == 201, draft.get_json()
    assert draft.get_json()["data"]["status"] == "draft"
    assert draft.get_json()["data"]["quantityKg"] == 12.0
    assert draft.get_json()["data"]["plasticItems"][0]["plasticType"] == "PP"
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


def test_create_lot_with_multiple_manual_weights_calculates_total(client, owner_token, collector_token, auth_header, app):
    response = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "collection_point_id": "point-uom",
            "plasticItems": [
                {"plasticType": "PET", "weight": "25", "weightUnit": "kg"},
                {"plasticType": "HDPE", "weight": "12.5", "weightUnit": "kg"},
                {"plasticType": "PP", "weight": "8", "weightUnit": "kg"},
            ],
            "pricePerKg": 100,
            "title": "Mixed plastic lot",
        },
    )
    assert response.status_code == 201, response.get_json()
    lot = response.get_json()["data"]["lot"]
    lot_id = lot["id"]
    assert lot["quantityKg"] == 45.5
    assert [item["plasticType"] for item in lot["plasticItems"]] == ["PET", "HDPE", "PP"]

    with app.app_context():
        stored = db.session.get(PlasticLot, lot_id)
        assert stored.estimated_weight_kg == Decimal("45.50")
        assert LotPlasticItem.query.filter_by(lot_id=lot_id).count() == 3

    marketplace = client.get("/api/v1/lots?material=HDPE&minimum_weight=40", headers=auth_header(collector_token))
    assert marketplace.status_code == 200
    assert any(item["id"] == lot_id and item["totalWeightKg"] == 45.5 for item in marketplace.get_json()["data"])


def test_update_lot_replaces_manual_plastic_items(client, owner_token, auth_header, app):
    draft = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "plasticItems": [
                {"plasticType": "PET", "weight": 10, "weightUnit": "kg"},
                {"plasticType": "HDPE", "weight": 5, "weightUnit": "kg"},
            ],
            "pricePerKg": 90,
            "title": "Editable mixed lot",
        },
    )
    lot_id = draft.get_json()["data"]["id"]

    updated = client.patch(
        f"/api/v1/lots/{lot_id}",
        headers=auth_header(owner_token),
        json={"plasticItems": [{"plasticType": "PET", "weight": "12.75", "weightUnit": "kg"}]},
    )
    assert updated.status_code == 200, updated.get_json()
    assert updated.get_json()["data"]["quantityKg"] == 12.75
    assert len(updated.get_json()["data"]["plasticItems"]) == 1

    with app.app_context():
        stored = db.session.get(PlasticLot, lot_id)
        assert stored.estimated_weight_kg == Decimal("12.75")
        assert [(item.plastic_type, item.weight) for item in stored.plastic_items] == [("PET", Decimal("12.75"))]


def test_reject_duplicate_and_invalid_manual_weights(client, owner_token, auth_header):
    duplicate = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "plasticItems": [
                {"plasticType": "PP", "weight": 2, "weightUnit": "kg"},
                {"plasticType": "PP", "weight": 3, "weightUnit": "kg"},
            ],
            "pricePerKg": 100,
        },
    )
    assert duplicate.status_code == 400
    assert "Duplicate plastic types" in duplicate.get_json()["error"]["message"]

    zero = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "plasticItems": [{"plasticType": "PET", "weight": 0, "weightUnit": "kg"}],
            "pricePerKg": 100,
        },
    )
    assert zero.status_code == 400

    too_precise = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "plasticItems": [{"plasticType": "PET", "weight": "1.234", "weightUnit": "kg"}],
            "pricePerKg": 100,
        },
    )
    assert too_precise.status_code == 400


def test_reject_invalid_price_and_invalid_withdraw_transition(client, owner_token, auth_header):
    invalid = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={"binId": "bin-a-01", "plasticItems": [{"plasticType": "PET", "weight": 1, "weightUnit": "kg"}], "pricePerKg": -1, "pickupWindow": "Tomorrow"},
    )
    assert invalid.status_code == 400

    reserved = client.post("/api/v1/lots/lot-uom-pp-reserved/withdraw", headers=auth_header(owner_token))
    assert reserved.status_code == 422


def test_owner_publish_from_bin_not_available_to_collector_role(client, collector_token, auth_header):
    response = client.post(
        "/api/v1/lots",
        headers=auth_header(collector_token),
        json={"binId": "bin-a-03", "plasticItems": [{"plasticType": "PP", "weight": 10, "weightUnit": "kg"}], "pricePerKg": 106, "pickupWindow": "Tomorrow"},
    )
    assert response.status_code == 403


def test_bin_publish_requires_manual_weight_items(client, owner_token, auth_header):
    response = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={"binId": "bin-a-01", "pricePerKg": 106, "pickupWindow": "Tomorrow"},
    )
    assert response.status_code == 400
    assert "plastic type" in response.get_json()["error"]["message"]
