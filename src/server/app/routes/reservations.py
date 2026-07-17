from __future__ import annotations

from flask import Blueprint

from app.errors import ResourceNotFound
from app.extensions import db
from app.models import Reservation
from app.models.base import utc_now
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import ReservationCreateSchema
from app.services.workflows import cancel_reservation, create_reservation, get_or_404

bp = Blueprint("reservations", __name__, url_prefix="")


def serialize_reservation(reservation: Reservation) -> dict:
    return {
        "id": reservation.id,
        "lotId": reservation.lot_id,
        "collectorId": reservation.collector_id,
        "ownerId": reservation.owner_id,
        "status": reservation.status,
        "requestedDate": reservation.requested_date,
        "requestedWindow": reservation.requested_window,
    }


@bp.get("/reservations")
def list_reservations():
    user = current_user()
    query = Reservation.query
    if user.role == "collector":
        query = query.filter_by(collector_id=user.id)
    elif user.role == "owner":
        query = query.filter_by(owner_id=user.id)
    return paginated_response(query.order_by(Reservation.created_at.desc()), serialize_reservation)


@bp.post("/lots/<lot_id>/reservations")
def reserve_lot(lot_id: str):
    user = current_user()
    payload = load_payload(ReservationCreateSchema())
    reservation = create_reservation(user, lot_id, payload)
    return data_response(serialize_reservation(reservation), 201)


@bp.get("/reservations/<reservation_id>")
def get_reservation(reservation_id: str):
    user = current_user()
    reservation = get_or_404(Reservation, reservation_id, "The requested reservation was not found.")
    if user.id not in {reservation.collector_id, reservation.owner_id}:
        raise ResourceNotFound("The requested reservation was not found.")
    return data_response(serialize_reservation(reservation))


@bp.post("/reservations/<reservation_id>/confirm")
def confirm_reservation(reservation_id: str):
    user = current_user()
    reservation = get_or_404(Reservation, reservation_id, "The requested reservation was not found.")
    if reservation.owner_id != user.id:
        raise ResourceNotFound("The requested reservation was not found.")
    reservation.status = "confirmed"
    reservation.confirmed_at = utc_now()
    reservation.lot.status = "reserved"
    for pickup in reservation.pickups:
        pickup.status = "scheduled"
        pickup.progress_percent = max(pickup.progress_percent, 25)
    db.session.commit()
    return data_response(serialize_reservation(reservation))


@bp.post("/reservations/<reservation_id>/cancel")
def cancel(reservation_id: str):
    user = current_user()
    reservation = cancel_reservation(user, reservation_id)
    return data_response(serialize_reservation(reservation))
