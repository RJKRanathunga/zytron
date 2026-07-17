from __future__ import annotations

from app.extensions import db
from app.models.base import new_id, utc_now


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("note"))
    user_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(64), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.Text, nullable=False)
    resource_type = db.Column(db.String(64))
    resource_id = db.Column(db.String(64))
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    read_at = db.Column(db.DateTime(timezone=True))

    user = db.relationship("User", back_populates="notifications")
