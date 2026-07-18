from __future__ import annotations

from sqlalchemy import func

from flask import Blueprint

from app.errors import ApiError, Conflict, ResourceNotFound
from app.extensions import db
from app.models import Dustbin, PlasticLot
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import DustbinSchema
from app.services.serializers import dustbin_for_owner
from app.services.workflows import ensure_owner, material_from_code_or_id

bp = Blueprint("owner_dustbins", __name__, url_prefix="/owner/dustbins")


ACTIVE_LOT_STATUSES = {"draft", "available", "published", "reserved", "pickup_scheduled", "payment_pending"}


def ensure_dustbin_owner(dustbin_id: str) -> tuple[object, Dustbin]:
    user = current_user()
    ensure_owner(user)
    dustbin = db.session.get(Dustbin, dustbin_id)
    if not dustbin or dustbin.owner_id != user.id:
        raise ResourceNotFound("The requested dustbin was not found.")
    return user, dustbin


def normalize_payload(payload: dict) -> dict:
    material_value = payload.get("supported_plastic_type") or payload.get("supportedPlasticType")
    material = material_from_code_or_id(material_value)
    if not material:
        raise ApiError(
            "validation_error",
            "Supported plastic type must match a platform plastic classification.",
            400,
            {"supportedPlasticType": ["Unknown plastic type."]},
        )
    active_value = payload.get("isActive") if payload.get("isActive") is not None else payload.get("is_active", True)
    return {
        "name": payload["name"].strip(),
        "code": payload["code"].strip(),
        "location_address": (payload.get("location_address") or payload.get("locationAddress") or payload.get("location") or "").strip(),
        "latitude": payload["latitude"],
        "longitude": payload["longitude"],
        "supported_plastic_type": material.code,
        "description": (payload.get("description") or "").strip(),
        "is_active": bool(active_value),
    }


def validate_unique_code(owner_id: str, code: str, dustbin_id: str | None = None) -> None:
    query = Dustbin.query.filter(
        Dustbin.owner_id == owner_id,
        func.lower(Dustbin.code) == code.lower(),
    )
    if dustbin_id:
        query = query.filter(Dustbin.id != dustbin_id)
    if query.first():
        raise Conflict("dustbin_code_exists", "A dustbin with this code already exists for your owner account.")


@bp.get("")
def list_dustbins():
    user = current_user()
    ensure_owner(user)
    query = Dustbin.query.filter_by(owner_id=user.id).order_by(Dustbin.created_at.desc())
    return paginated_response(query, dustbin_for_owner, default_per_page=100)


@bp.post("")
def create_dustbin():
    user = current_user()
    ensure_owner(user)
    payload = normalize_payload(load_payload(DustbinSchema()))
    validate_unique_code(user.id, payload["code"])
    dustbin = Dustbin(owner=user, **payload)
    db.session.add(dustbin)
    db.session.commit()
    return data_response(dustbin_for_owner(dustbin), 201)


@bp.get("/<dustbin_id>")
def get_dustbin(dustbin_id: str):
    _user, dustbin = ensure_dustbin_owner(dustbin_id)
    return data_response(dustbin_for_owner(dustbin))


@bp.put("/<dustbin_id>")
@bp.patch("/<dustbin_id>")
def update_dustbin(dustbin_id: str):
    user, dustbin = ensure_dustbin_owner(dustbin_id)
    payload = normalize_payload(load_payload(DustbinSchema()))
    validate_unique_code(user.id, payload["code"], dustbin.id)
    for key, value in payload.items():
        setattr(dustbin, key, value)
    db.session.commit()
    return data_response(dustbin_for_owner(dustbin))


@bp.delete("/<dustbin_id>")
def delete_dustbin(dustbin_id: str):
    _user, dustbin = ensure_dustbin_owner(dustbin_id)
    active_lot = PlasticLot.query.filter(
        PlasticLot.dustbin_id == dustbin.id,
        PlasticLot.status.in_(ACTIVE_LOT_STATUSES),
    ).first()
    if active_lot:
        dustbin.is_active = False
        db.session.commit()
        return data_response(
            {
                "deleted": False,
                "inactive": True,
                "message": "This dustbin is linked to active lot records and was marked inactive instead.",
                "dustbin": dustbin_for_owner(dustbin),
            }
        )

    db.session.delete(dustbin)
    db.session.commit()
    return data_response({"deleted": True})
