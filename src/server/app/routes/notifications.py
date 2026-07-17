from __future__ import annotations

from flask import Blueprint

from app.errors import ResourceNotFound
from app.extensions import db
from app.models import Notification
from app.permissions import current_user
from app.routes.helpers import data_response, paginated_response
from app.services.serializers import notification_for_user
from app.services.workflows import get_or_404, mark_all_notifications_read, mark_notification_read

bp = Blueprint("notifications", __name__, url_prefix="/notifications")


@bp.get("")
def list_notifications():
    user = current_user()
    query = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc())
    return paginated_response(query, lambda note: notification_for_user(note, user.role), default_per_page=50)


@bp.get("/unread-count")
def unread_count():
    user = current_user()
    count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return data_response({"count": count})


@bp.post("/<notification_id>/read")
def read(notification_id: str):
    user = current_user()
    note = mark_notification_read(user, notification_id)
    return data_response(notification_for_user(note, user.role))


@bp.post("/read-all")
def read_all():
    user = current_user()
    mark_all_notifications_read(user)
    return data_response({"read": True})


@bp.delete("/<notification_id>")
def delete_notification(notification_id: str):
    user = current_user()
    note = get_or_404(Notification, notification_id, "The requested notification was not found.")
    if note.user_id != user.id:
        raise ResourceNotFound("The requested notification was not found.")
    db.session.delete(note)
    db.session.commit()
    return data_response({"deleted": True})
