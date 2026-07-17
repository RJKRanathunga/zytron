from __future__ import annotations

from flask import Blueprint, request

from app.errors import ApiError, ResourceNotFound
from app.models import Pickup, PlasticLot
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import PickupScheduleSchema, PickupWeightSchema
from app.services.serializers import pickup_for_collector, pickup_for_owner
from app.services.workflows import (
    cancel_pickup,
    complete_pickup,
    create_or_update_pickup,
    ensure_pickup_participant,
    get_or_404,
    schedule_pickup,
    update_pickup_progress,
    verify_pickup_weight,
)

bp = Blueprint("pickups", __name__, url_prefix="/pickups")


def serialize_for(user, pickup: Pickup) -> dict:
    return pickup_for_owner(pickup) if user.role == "owner" else pickup_for_collector(pickup)


@bp.get("")
def list_pickups():
    user = current_user()
    query = Pickup.query
    if user.role == "owner":
        query = query.filter_by(owner_id=user.id)
    elif user.role == "collector":
        query = query.filter_by(collector_id=user.id)
    status = request.args.get("status")
    if status:
        query = query.filter(Pickup.status == status)
    return paginated_response(query.order_by(Pickup.created_at.desc()), lambda pickup: serialize_for(user, pickup), default_per_page=50)


@bp.post("")
def create_pickup():
    user = current_user()
    payload = request.get_json() or {}
    lot = get_or_404(PlasticLot, payload.get("lot_id") or payload.get("lotId") or "", "The requested lot was not found.")
    if user.role == "owner" and lot.owner_id != user.id:
        raise ResourceNotFound("The requested lot was not found.")
    collector = user if user.role == "collector" else None
    if collector is None:
        raise ApiError("validation_error", "Collector ID is required for owner-created pickups.", 400)
    pickup = create_or_update_pickup(
        lot=lot,
        collector=collector,
        reservation=None,
        date_label=payload.get("date") or payload.get("pickupDate") or "Scheduled",
        time_window=payload.get("timeWindow") or "Flexible pickup",
        status="requested",
    )
    from app.extensions import db

    db.session.commit()
    return data_response(serialize_for(user, pickup), 201)


@bp.get("/<pickup_id>")
def get_pickup(pickup_id: str):
    user = current_user()
    pickup = get_or_404(Pickup, pickup_id, "The requested pickup was not found.")
    ensure_pickup_participant(user, pickup)
    return data_response(serialize_for(user, pickup))


@bp.patch("/<pickup_id>")
def patch_pickup(pickup_id: str):
    user = current_user()
    pickup = update_pickup_progress(user, pickup_id)
    return data_response(serialize_for(user, pickup))


@bp.post("/<pickup_id>/schedule")
def schedule(pickup_id: str):
    user = current_user()
    payload = load_payload(PickupScheduleSchema())
    pickup = schedule_pickup(user, pickup_id, payload)
    return data_response(serialize_for(user, pickup))


@bp.post("/<pickup_id>/start-route")
def start_route(pickup_id: str):
    user = current_user()
    pickup = update_pickup_progress(user, pickup_id)
    return data_response(serialize_for(user, pickup))


@bp.post("/<pickup_id>/check-in")
def check_in(pickup_id: str):
    user = current_user()
    pickup = update_pickup_progress(user, pickup_id)
    return data_response(serialize_for(user, pickup))


@bp.post("/<pickup_id>/verify-weight")
def verify_weight(pickup_id: str):
    user = current_user()
    payload = load_payload(PickupWeightSchema())
    pickup = verify_pickup_weight(user, pickup_id, payload)
    return data_response(serialize_for(user, pickup))


@bp.post("/<pickup_id>/complete")
def complete(pickup_id: str):
    user = current_user()
    pickup = complete_pickup(user, pickup_id)
    return data_response(serialize_for(user, pickup))


@bp.post("/<pickup_id>/cancel")
def cancel(pickup_id: str):
    user = current_user()
    pickup = cancel_pickup(user, pickup_id)
    return data_response(serialize_for(user, pickup))
