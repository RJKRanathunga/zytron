from __future__ import annotations

from flask import Blueprint, request

from app.errors import ApiError, ResourceNotFound
from app.extensions import db
from app.models import Message, MessageThread, Pickup, PlasticLot
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import MessageCreateSchema
from app.services.serializers import thread_for_user
from app.services.workflows import ensure_thread_participant, get_or_404, mark_message_read, send_message, thread_for_lot

bp = Blueprint("messages", __name__, url_prefix="")


def serialize_message(message: Message) -> dict:
    return {
        "id": message.id,
        "threadId": message.thread_id,
        "senderId": message.sender_id,
        "recipientId": message.recipient_id,
        "body": message.body,
        "isRead": message.is_read,
        "createdAt": message.created_at.isoformat(),
    }


@bp.get("/message-threads")
def list_threads():
    user = current_user()
    query = MessageThread.query.filter((MessageThread.owner_id == user.id) | (MessageThread.collector_id == user.id)).order_by(MessageThread.updated_at.desc())
    return paginated_response(query, lambda thread: thread_for_user(thread, user), default_per_page=50)


@bp.post("/message-threads")
def create_thread():
    user = current_user()
    payload = request.get_json() or {}
    lot = None
    pickup = None
    if payload.get("pickup_id") or payload.get("pickupId"):
        pickup = get_or_404(Pickup, payload.get("pickup_id") or payload.get("pickupId"), "The requested pickup was not found.")
        if user.id not in {pickup.owner_id, pickup.collector_id}:
            raise ResourceNotFound("The requested pickup was not found.")
        lot = pickup.lot
        collector_id = pickup.collector_id
    else:
        lot = get_or_404(PlasticLot, payload.get("lot_id") or payload.get("lotId") or "", "The requested lot was not found.")
        if user.role == "owner" and lot.owner_id != user.id:
            raise ResourceNotFound("The requested lot was not found.")
        collector_id = payload.get("collector_id") or payload.get("collectorId") or (user.id if user.role == "collector" else None)
        if not collector_id:
            raise ApiError("validation_error", "collector_id is required.", 400)
    thread = thread_for_lot(lot, collector_id, pickup.id if pickup else None)
    db.session.commit()
    return data_response(thread_for_user(thread, user), 201)


@bp.get("/message-threads/<thread_id>")
def get_thread(thread_id: str):
    user = current_user()
    thread = get_or_404(MessageThread, thread_id, "The requested message thread was not found.")
    ensure_thread_participant(user, thread)
    return data_response(thread_for_user(thread, user))


@bp.get("/message-threads/<thread_id>/messages")
def get_messages(thread_id: str):
    user = current_user()
    thread = get_or_404(MessageThread, thread_id, "The requested message thread was not found.")
    ensure_thread_participant(user, thread)
    for message in thread.messages:
        if message.recipient_id == user.id and not message.is_read:
            message.is_read = True
            from app.models.base import utc_now

            message.read_at = utc_now()
    db.session.commit()
    return data_response([serialize_message(message) for message in thread.messages])


@bp.post("/message-threads/<thread_id>/messages")
def create_message(thread_id: str):
    user = current_user()
    payload = load_payload(MessageCreateSchema())
    body = payload.get("message") or payload.get("body") or ""
    message = send_message(user, thread_id, body)
    return data_response(serialize_message(message), 201)


@bp.post("/messages/<message_id>/read")
def read_message(message_id: str):
    user = current_user()
    message = mark_message_read(user, message_id)
    return data_response(serialize_message(message))
