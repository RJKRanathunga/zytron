from __future__ import annotations

from decimal import Decimal

from flask import Blueprint

from app.constants import ALLOWED_PROFILE_FIELDS
from app.extensions import db
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload
from app.schemas import ProfileUpdateSchema
from app.services.workflows import snapshot_for

bp = Blueprint("users", __name__, url_prefix="/users")


def public_profile(user) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "phone": user.phone,
        "role": user.role,
        "avatarUrl": user.avatar_url,
        "baseLocation": user.base_location,
        "vehicleCapacityKg": float(user.vehicle_capacity_kg or Decimal("0")),
        "organization": user.organization.name if user.organization else "",
    }


@bp.get("/me")
def me():
    user = current_user()
    return data_response(public_profile(user))


@bp.patch("/me")
def update_me():
    user = current_user()
    payload = load_payload(ProfileUpdateSchema())
    for key, value in payload.items():
        normalized = {
            "vehicle_capacity_kg": "vehicle_capacity_kg",
        }.get(key, key)
        if normalized in ALLOWED_PROFILE_FIELDS:
            setattr(user, normalized, value)
    db.session.commit()
    return data_response({"profile": public_profile(user), "snapshot": snapshot_for(user)})


@bp.get("/me/preferences")
def preferences():
    current_user()
    return data_response({"theme": "system", "notifications": True})


@bp.patch("/me/preferences")
def update_preferences():
    current_user()
    return data_response({"theme": "system", "notifications": True})


@bp.get("/me/dashboard")
def dashboard():
    user = current_user()
    return data_response(snapshot_for(user))
