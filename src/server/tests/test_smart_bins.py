from __future__ import annotations

from decimal import Decimal

from app.extensions import db
from app.models import BinCompartment, CollectionPoint, Organization, PlasticLot, SmartBin, User


def test_owner_can_add_list_view_and_edit_smart_bin(client, owner_token, auth_header, app):
    created = client.post(
        "/api/v1/bins",
        headers=auth_header(owner_token),
        json={
            "label": "Library Smart Bin",
            "deviceCode": "LIB-SB-001",
            "location": "Library lobby",
            "model": "Manual Smart Bin",
            "status": "online",
            "supportedMaterials": ["PET", "HDPE"],
        },
    )

    assert created.status_code == 201, created.get_json()
    smart_bin = created.get_json()["data"]
    assert smart_bin["label"] == "Library Smart Bin"
    assert smart_bin["deviceCode"] == "LIB-SB-001"
    assert smart_bin["supportedMaterials"] == ["PET", "HDPE"]
    assert {compartment["material"] for compartment in smart_bin["compartments"]} == {"PET", "HDPE"}

    listed = client.get("/api/v1/bins?per_page=100", headers=auth_header(owner_token))
    assert listed.status_code == 200
    assert any(item["id"] == smart_bin["id"] for item in listed.get_json()["data"])

    detail = client.get(f"/api/v1/bins/{smart_bin['id']}", headers=auth_header(owner_token))
    assert detail.status_code == 200
    assert detail.get_json()["data"]["id"] == smart_bin["id"]

    updated = client.put(
        f"/api/v1/bins/{smart_bin['id']}",
        headers=auth_header(owner_token),
        json={
            "label": "Library Smart Bin East",
            "deviceCode": "LIB-SB-001",
            "location": "Library east lobby",
            "model": "Manual Smart Bin",
            "status": "inactive",
            "supportedMaterials": ["PET", "PP"],
        },
    )

    assert updated.status_code == 200, updated.get_json()
    edited = updated.get_json()["data"]
    assert edited["label"] == "Library Smart Bin East"
    assert edited["status"] == "inactive"
    assert edited["supportedMaterials"] == ["PET", "PP"]
    assert {compartment["material"] for compartment in edited["compartments"]} == {"PET", "PP"}


def test_remove_smart_bin_marks_inactive_and_keeps_linked_lots(client, owner_token, auth_header, app):
    response = client.delete("/api/v1/bins/bin-a-03", headers=auth_header(owner_token))

    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"]["inactive"] is True
    with app.app_context():
        smart_bin = db.session.get(SmartBin, "bin-a-03")
        lot = db.session.get(PlasticLot, "lot-uom-pp")
        assert smart_bin.status == "disabled"
        assert lot.source_compartment.smart_bin_id == "bin-a-03"

    detail = client.get("/api/v1/bins/bin-a-03", headers=auth_header(owner_token))
    assert detail.status_code == 200
    assert detail.get_json()["data"]["status"] == "inactive"


def test_smart_bin_owner_authorization(client, owner_token, collector_token, auth_header, app):
    with app.app_context():
        org = Organization(id="org-other-owner", name="Other Owner", organization_type="owner")
        owner = User(
            id="owner-other",
            email="other.owner@polyloop.demo",
            firebase_uid="test-other.owner@polyloop.demo",
            first_name="Other",
            last_name="Owner",
            role="owner",
            organization=org,
        )
        point = CollectionPoint(
            id="point-other-owner",
            owner=owner,
            organization=org,
            name="Other Collection Point",
            address="Other Road",
            district="Moratuwa",
            latitude=Decimal("6.7000000"),
            longitude=Decimal("79.9000000"),
        )
        smart_bin = SmartBin(
            id="bin-other-owner",
            owner=owner,
            collection_point=point,
            device_code="OTHER-SB-001",
            name="Other Smart Bin",
            location_label="Other lobby",
            status="online",
            battery_percent=80,
            camera_status="Manual entry",
            weight_sensor_status="Manual entry",
        )
        compartment = BinCompartment(
            id="comp-other-owner-pet",
            smart_bin=smart_bin,
            material_id="mat-pet",
            capacity_kg=Decimal("100"),
            current_weight_kg=Decimal("0"),
            fill_percentage=Decimal("0"),
            threshold_percentage=Decimal("80"),
            status="growing",
        )
        db.session.add_all([org, owner, point, smart_bin, compartment])
        db.session.commit()

    forbidden_create = client.post(
        "/api/v1/bins",
        headers=auth_header(collector_token),
        json={
            "label": "Collector Bin",
            "deviceCode": "COLLECTOR-SB-001",
            "location": "Collector location",
            "supportedMaterials": ["PET"],
        },
    )
    assert forbidden_create.status_code == 403

    hidden = client.get("/api/v1/bins/bin-other-owner", headers=auth_header(owner_token))
    assert hidden.status_code == 404

    forbidden_update = client.patch(
        "/api/v1/bins/bin-other-owner",
        headers=auth_header(owner_token),
        json={"label": "Should Not Update", "supportedMaterials": ["PET"]},
    )
    assert forbidden_update.status_code == 404

    forbidden_delete = client.delete("/api/v1/bins/bin-other-owner", headers=auth_header(owner_token))
    assert forbidden_delete.status_code == 404


def test_publish_lot_from_smart_bin_uses_manual_weights_and_links_bin(client, owner_token, auth_header, app):
    created = client.post(
        "/api/v1/bins",
        headers=auth_header(owner_token),
        json={
            "label": "Manual Publish Smart Bin",
            "deviceCode": "MANUAL-SB-001",
            "location": "Materials counter",
            "supportedMaterials": ["PET", "HDPE"],
        },
    )
    assert created.status_code == 201, created.get_json()
    bin_id = created.get_json()["data"]["id"]

    published = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "binId": bin_id,
            "plasticItems": [
                {"plasticType": "PET", "weight": "7.25", "weightUnit": "kg"},
                {"plasticType": "HDPE", "weight": "3.50", "weightUnit": "kg"},
            ],
            "pricePerKg": 120,
            "pickupWindow": "Any weekday, 8:00 AM-5:00 PM",
        },
    )

    assert published.status_code == 201, published.get_json()
    lot = published.get_json()["data"]["lot"]
    assert lot["binId"] == bin_id
    assert lot["quantityKg"] == 10.75
    assert [item["plasticType"] for item in lot["plasticItems"]] == ["PET", "HDPE"]

    with app.app_context():
        stored_bin = db.session.get(SmartBin, bin_id)
        assert {comp.material.code: comp.current_weight_kg for comp in stored_bin.compartments} == {
            "PET": Decimal("0.00"),
            "HDPE": Decimal("0.00"),
        }
        assert {comp.material.code: comp.status for comp in stored_bin.compartments} == {
            "PET": "growing",
            "HDPE": "growing",
        }


def test_publish_lot_rejects_unsupported_bin_material_and_inactive_bin(client, owner_token, auth_header):
    created = client.post(
        "/api/v1/bins",
        headers=auth_header(owner_token),
        json={
            "label": "PET Only Smart Bin",
            "deviceCode": "PET-ONLY-SB-001",
            "location": "North gate",
            "supportedMaterials": ["PET"],
        },
    )
    assert created.status_code == 201, created.get_json()
    bin_id = created.get_json()["data"]["id"]

    unsupported = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "binId": bin_id,
            "plasticItems": [{"plasticType": "PP", "weight": "2", "weightUnit": "kg"}],
            "pricePerKg": 100,
        },
    )
    assert unsupported.status_code == 400
    assert "not available" in unsupported.get_json()["error"]["message"]

    removed = client.delete(f"/api/v1/bins/{bin_id}", headers=auth_header(owner_token))
    assert removed.status_code == 200

    inactive = client.post(
        "/api/v1/lots",
        headers=auth_header(owner_token),
        json={
            "binId": bin_id,
            "plasticItems": [{"plasticType": "PET", "weight": "2", "weightUnit": "kg"}],
            "pricePerKg": 100,
        },
    )
    assert inactive.status_code == 422
    assert "Activate this smart bin" in inactive.get_json()["error"]["message"]
