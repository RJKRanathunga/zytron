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
    point = get_or_404(CollectionPoint, payload.get("collection_point_id", ""), "The requested collection point was not found.")
    if point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    smart_bin = SmartBin(
        collection_point=point,
        device_code=payload.get("device_code") or payload.get("deviceCode"),
        name=payload.get("name") or payload.get("label") or "Smart Bin",
        model=payload.get("model") or "PolyLoop S1",
        status=payload.get("status") or "online",
        location_label=payload.get("location_label") or payload.get("location") or point.name,
    )
    if not smart_bin.device_code:
        raise ApiError("validation_error", "A device code is required.", 400, {"device_code": ["Missing data for required field."]})
    db.session.add(smart_bin)
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
def update_bin(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    ensure_bin_owner(user, smart_bin)
    payload = request.get_json() or {}
    for key in ["name", "model", "status", "firmware_version", "location_label", "battery_percent", "camera_status", "weight_sensor_status"]:
        if key in payload:
            setattr(smart_bin, key, payload[key])
    db.session.commit()
    return data_response(bin_for_owner(smart_bin))


@bp.delete("/<bin_id>")
def delete_bin(bin_id: str):
    user = current_user()
    smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
    ensure_bin_owner(user, smart_bin)
    smart_bin.status = "disabled"
    db.session.commit()
    return data_response({"deleted": True})


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
