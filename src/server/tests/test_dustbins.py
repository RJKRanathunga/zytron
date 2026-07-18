from __future__ import annotations

from app.extensions import db
from app.models import Dustbin, PlasticLot


def dustbin_payload(**overrides):
    payload = {
        "name": "Main Gate PET Dustbin",
        "code": "DB-PET-001",
        "locationAddress": "Main gate, University of Moratuwa",
        "latitude": "6.7969000",
        "longitude": "79.9008000",
        "supportedPlasticType": "PET",
        "description": "Owner managed bottle dustbin.",
        "isActive": True,
    }
    payload.update(overrides)
    return payload


def create_dustbin(client, owner_token, auth_header, **overrides):
    response = client.post("/api/v1/owner/dustbins", headers=auth_header(owner_token), json=dustbin_payload(**overrides))
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def test_owner_can_add_list_view_edit_and_remove_dustbin(client, owner_token, auth_header, app):
    created = create_dustbin(client, owner_token, auth_header)
    assert created["name"] == "Main Gate PET Dustbin"
    assert created["code"] == "DB-PET-001"
    assert created["supportedPlasticType"] == "PET"
    assert created["isActive"] is True
    assert created["createdAt"]
    assert created["updatedAt"]

    listing = client.get("/api/v1/owner/dustbins", headers=auth_header(owner_token))
    assert listing.status_code == 200
    assert any(item["id"] == created["id"] for item in listing.get_json()["data"])

    detail = client.get(f"/api/v1/owner/dustbins/{created['id']}", headers=auth_header(owner_token))
    assert detail.status_code == 200
    assert detail.get_json()["data"]["locationAddress"] == "Main gate, University of Moratuwa"

    updated = client.put(
        f"/api/v1/owner/dustbins/{created['id']}",
        headers=auth_header(owner_token),
        json=dustbin_payload(name="Canteen HDPE Dustbin", code="DB-HDPE-002", supportedPlasticType="HDPE", isActive=False),
    )
    assert updated.status_code == 200, updated.get_json()
    assert updated.get_json()["data"]["name"] == "Canteen HDPE Dustbin"
    assert updated.get_json()["data"]["supportedPlasticType"] == "HDPE"
    assert updated.get_json()["data"]["isActive"] is False

    deleted = client.delete(f"/api/v1/owner/dustbins/{created['id']}", headers=auth_header(owner_token))
    assert deleted.status_code == 200, deleted.get_json()
    assert deleted.get_json()["data"]["deleted"] is True
    with app.app_context():
        assert db.session.get(Dustbin, created["id"]) is None


def test_dustbin_routes_are_owner_scoped(client, owner_token, collector_token, auth_header):
    created = create_dustbin(client, owner_token, auth_header, code="DB-AUTH-001")

    collector_list = client.get("/api/v1/owner/dustbins", headers=auth_header(collector_token))
    assert collector_list.status_code == 403

    other_owner_token = "other.owner@example.test"
    login = client.post(
        "/api/v1/auth/login",
        headers=auth_header(other_owner_token),
        json={"first_name": "Other", "last_name": "Owner", "role": "owner", "organization_name": "Other Owner Co"},
    )
    assert login.status_code == 200

    hidden = client.get(f"/api/v1/owner/dustbins/{created['id']}", headers=auth_header(other_owner_token))
    assert hidden.status_code == 404

    rejected_update = client.put(
        f"/api/v1/owner/dustbins/{created['id']}",
        headers=auth_header(other_owner_token),
        json=dustbin_payload(code="DB-AUTH-001"),
    )
    assert rejected_update.status_code == 404


def test_lot_can_link_registered_dustbin_without_auto_weight(client, owner_token, auth_header, app):
    dustbin = create_dustbin(client, owner_token, auth_header, code="DB-LOT-001", supportedPlasticType="PP")

    response = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "dustbinId": dustbin["id"],
            "plasticItems": [{"plasticType": "PP", "weight": "9.75", "weightUnit": "kg"}],
            "pricePerKg": 100,
            "title": "Dustbin linked manual PP lot",
        },
    )
    assert response.status_code == 201, response.get_json()
    lot = response.get_json()["data"]
    assert lot["dustbinId"] == dustbin["id"]
    assert lot["dustbinLabel"] == "Main Gate PET Dustbin"
    assert lot["quantityKg"] == 9.75

    with app.app_context():
        stored = db.session.get(PlasticLot, lot["id"])
        assert stored.dustbin_id == dustbin["id"]
        assert float(stored.estimated_weight_kg) == 9.75


def test_dustbin_delete_marks_inactive_when_linked_to_active_lot(client, owner_token, auth_header, app):
    dustbin = create_dustbin(client, owner_token, auth_header, code="DB-ACTIVE-001", supportedPlasticType="PP")
    lot_response = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "status": "draft",
            "collection_point_id": "point-uom",
            "dustbinId": dustbin["id"],
            "plasticItems": [{"plasticType": "PP", "weight": "4", "weightUnit": "kg"}],
            "pricePerKg": 100,
        },
    )
    assert lot_response.status_code == 201, lot_response.get_json()

    deleted = client.delete(f"/api/v1/owner/dustbins/{dustbin['id']}", headers=auth_header(owner_token))
    assert deleted.status_code == 200, deleted.get_json()
    body = deleted.get_json()["data"]
    assert body["deleted"] is False
    assert body["inactive"] is True
    assert "active lot records" in body["message"]

    with app.app_context():
        stored = db.session.get(Dustbin, dustbin["id"])
        assert stored is not None
        assert stored.is_active is False


def test_dustbin_validation_rejects_duplicate_code_and_invalid_material(client, owner_token, auth_header):
    create_dustbin(client, owner_token, auth_header, code="DB-DUP-001")
    duplicate = client.post("/api/v1/owner/dustbins", headers=auth_header(owner_token), json=dustbin_payload(code="DB-DUP-001"))
    assert duplicate.status_code == 409

    invalid = client.post("/api/v1/owner/dustbins", headers=auth_header(owner_token), json=dustbin_payload(code="DB-BAD-001", supportedPlasticType="GLASS"))
    assert invalid.status_code == 400
