from __future__ import annotations

from decimal import Decimal

from flask import Blueprint, request

from app.errors import ApiError, ResourceNotFound
from app.extensions import db
from app.models import BinCompartment, CollectionPoint, DeviceAlert, PlasticMaterial, SmartBin
from app.models.base import utc_now
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.services.serializers import bin_for_owner
from app.services.workflows import ensure_owner, get_or_404

bp = Blueprint("bins", __name__, url_prefix="/bins")


def ensure_bin_owner(user, smart_bin: SmartBin):
    ensure_owner(user)
    if smart_bin.collection_point.owner_id != user.id:
        raise ResourceNotFound("The requested bin was not found.")


def material_values(payload: dict) -> list[str]:
    values = (
        payload.get("supportedMaterials")
        or payload.get("supported_materials")
        or payload.get("plasticTypes")
        or payload.get("plastic_types")
        or payload.get("materials")
        or []
    )
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        raise ApiError("validation_error", "supportedMaterials must be a list.", 400, {"supportedMaterials": ["Must be a list."]})
    return [str(value).strip().upper() for value in values if str(value).strip()]


def load_supported_materials(payload: dict) -> list[PlasticMaterial]:
    values = material_values(payload)
    if not values:
        raise ApiError(
            "validation_error",
            "At least one supported plastic type is required.",
            400,
            {"supportedMaterials": ["Select at least one plastic type."]},
        )
    materials: list[PlasticMaterial] = []
    seen: set[str] = set()
    for value in values:
        material = PlasticMaterial.query.filter((PlasticMaterial.code == value) | (PlasticMaterial.id == value)).first()
        if not material:
            raise ApiError("validation_error", "Unknown plastic type.", 400, {"supportedMaterials": [f"{value} is not supported."]})
        if material.code not in seen:
            seen.add(material.code)
            materials.append(material)
    return materials


def sync_compartments(smart_bin: SmartBin, materials: list[PlasticMaterial], capacity_kg: Decimal | None = None):
    capacity = capacity_kg or Decimal("100")
    existing_by_code = {compartment.material.code: compartment for compartment in smart_bin.compartments if compartment.material}
    wanted_codes = {material.code for material in materials}
    for material in materials:
        if material.code not in existing_by_code:
            smart_bin.compartments.append(
                BinCompartment(
                    material=material,
                    capacity_kg=capacity,
                    current_weight_kg=Decimal("0"),
                    fill_percentage=Decimal("0"),
                    threshold_percentage=Decimal("80"),
                    status="growing",
                )
            )
    for compartment in list(smart_bin.compartments):
        if compartment.material and compartment.material.code not in wanted_codes:
            if any(lot.status in {"available", "published", "reserved", "pickup_scheduled"} for lot in compartment.lots):
                continue
            db.session.delete(compartment)


def normalize_bin_status(value: str | None) -> str:
    status = (value or "online").strip().lower()
    if status == "active":
        return "online"
    if status == "inactive":
        return "disabled"
    if status not in {"online", "offline", "maintenance", "warning", "disabled"}:
        raise ApiError("validation_error", "Unknown smart bin status.", 400, {"status": ["Choose a valid status."]})
    return status


@bp.get("")
def list_bins():
    user = current_user()
    query = SmartBin.query.join(CollectionPoint)
    if user.role == "owner":
        query = query.filter(CollectionPoint.owner_id == user.id)
    status = request.args.get("status")
    if status:
        query = query.filter(SmartBin.status == status)
    return paginated_response(query.order_by(SmartBin.name), bin_for_owner, default_per_page=50)


@bp.post("")
def create_bin():
    user = current_user()
    ensure_owner(user)
    payload = request.get_json() or {}
    point_id = payload.get("collection_point_id") or payload.get("collectionPointId")
    point = get_or_404(CollectionPoint, point_id or "", "The requested collection point was not found.")
    if point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    materials = load_supported_materials(payload)
    smart_bin = SmartBin(
        collection_point=point,
        device_code=payload.get("device_code") or payload.get("deviceCode"),
        name=payload.get("name") or payload.get("label") or "Smart Bin",
        model=payload.get("model") or "PolyLoop S1",
        status=normalize_bin_status(payload.get("status")),
        location_label=payload.get("location_label") or payload.get("locationLabel") or payload.get("location") or point.name,
        battery_percent=payload.get("battery_percent") or payload.get("batteryPercent") or 88,
        camera_status=payload.get("camera_status") or payload.get("cameraStatus") or "Manual entry",
        weight_sensor_status=payload.get("weight_sensor_status") or payload.get("weightSensorStatus") or "Manual entry",
    )
    if not smart_bin.device_code:
        raise ApiError("validation_error", "A device code is required.", 400, {"device_code": ["Missing data for required field."]})
    db.session.add(smart_bin)
    sync_compartments(smart_bin, materials)
    db.session.commit()
    return data_response(bin_for_owner(smart_bin), 201)


@bp.get("/<bin_id>")
def get_bin(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    if user.role == "owner" and smart_bin.collection_point.owner_id != user.id:
        raise ResourceNotFound("The requested bin was not found.")
    return data_response(bin_for_owner(smart_bin))


@bp.patch("/<bin_id>")
@bp.put("/<bin_id>")
def update_bin(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    ensure_bin_owner(user, smart_bin)
    payload = request.get_json() or {}
    alias_map = {
        "label": "name",
        "location": "location_label",
        "locationLabel": "location_label",
        "deviceCode": "device_code",
        "batteryPercent": "battery_percent",
        "cameraStatus": "camera_status",
        "weightSensorStatus": "weight_sensor_status",
    }
    for source, target in alias_map.items():
        if source in payload:
            payload[target] = payload[source]
    if "status" in payload:
        payload["status"] = normalize_bin_status(payload.get("status"))
    for key in ["name", "device_code", "model", "status", "firmware_version", "location_label", "battery_percent", "camera_status", "weight_sensor_status"]:
        if key in payload:
            setattr(smart_bin, key, payload[key])
    if any(key in payload for key in ["supportedMaterials", "supported_materials", "plasticTypes", "plastic_types", "materials"]):
        sync_compartments(smart_bin, load_supported_materials(payload))
    db.session.commit()
    return data_response(bin_for_owner(smart_bin))


@bp.delete("/<bin_id>")
def delete_bin(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    ensure_bin_owner(user, smart_bin)
    smart_bin.status = "disabled"
    db.session.commit()
    return data_response({"deleted": False, "inactive": True, "message": "Smart bin was marked inactive."})


@bp.get("/<bin_id>/compartments")
def compartments(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    if user.role == "owner" and smart_bin.collection_point.owner_id != user.id:
        raise ResourceNotFound("The requested bin was not found.")
    return data_response(bin_for_owner(smart_bin)["compartments"])


@bp.patch("/<bin_id>/compartments/<compartment_id>")
def update_compartment(bin_id: str, compartment_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    ensure_bin_owner(user, smart_bin)
    compartment = BinCompartment.query.filter_by(id=compartment_id, smart_bin_id=smart_bin.id).first()
    if not compartment:
        raise ResourceNotFound("The requested compartment was not found.")
    payload = request.get_json() or {}
    if payload.get("material") or payload.get("material_id"):
        material = PlasticMaterial.query.filter(
            (PlasticMaterial.code == str(payload.get("material")).upper()) | (PlasticMaterial.id == payload.get("material_id"))
        ).first()
        if not material:
            raise ApiError("validation_error", "Unknown material.", 400, {"material": ["Unknown material."]})
        compartment.material = material
    if payload.get("current_weight_kg") is not None:
        compartment.current_weight_kg = max(Decimal("0"), Decimal(str(payload["current_weight_kg"])))
    if payload.get("fill_percentage") is not None:
        compartment.fill_percentage = max(Decimal("0"), min(Decimal("100"), Decimal(str(payload["fill_percentage"]))))
    if payload.get("status"):
        compartment.status = payload["status"]
    compartment.last_updated_at = utc_now()
    db.session.commit()
    return data_response(bin_for_owner(smart_bin)["compartments"])


@bp.get("/<bin_id>/alerts")
def bin_alerts(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    if user.role == "owner" and smart_bin.collection_point.owner_id != user.id:
        raise ResourceNotFound("The requested bin was not found.")
    return data_response(
        [
            {
                "id": alert.id,
                "binId": alert.smart_bin_id,
                "title": alert.title,
                "severity": alert.severity,
                "detail": alert.message,
                "isResolved": alert.is_resolved,
            }
            for alert in smart_bin.alerts
        ]
    )


@bp.post("/<bin_id>/alerts")
def create_alert(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    ensure_bin_owner(user, smart_bin)
    payload = load_payload(type("AlertSchema", (), {"load": lambda self, data: data})())
    alert = DeviceAlert(
        smart_bin=smart_bin,
        severity=payload.get("severity", "info"),
        alert_type=payload.get("alert_type", "manual"),
        title=payload.get("title", "Device alert"),
        message=payload.get("message") or payload.get("detail") or "",
    )
    db.session.add(alert)
    db.session.commit()
    return data_response({"id": alert.id}, 201)


@bp.patch("/<bin_id>/alerts/<alert_id>/resolve")
def resolve_alert(bin_id: str, alert_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    ensure_bin_owner(user, smart_bin)
    alert = DeviceAlert.query.filter_by(id=alert_id, smart_bin_id=smart_bin.id).first()
    if not alert:
        raise ResourceNotFound("The requested alert was not found.")
    alert.is_resolved = True
    alert.resolved_at = utc_now()
    db.session.commit()
    return data_response({"resolved": True})
