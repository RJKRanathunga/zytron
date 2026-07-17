from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id, utc_now


class MessageThread(TimestampMixin, db.Model):
    __tablename__ = "message_threads"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("thread"))
    lot_id = db.Column(db.String(64), db.ForeignKey("plastic_lots.id"), index=True)
    pickup_id = db.Column(db.String(64), db.ForeignKey("pickups.id"), index=True)
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)

    lot = db.relationship("PlasticLot")
    pickup = db.relationship("Pickup")
    owner = db.relationship("User", foreign_keys=[owner_id])
    collector = db.relationship("User", foreign_keys=[collector_id])
    messages = db.relationship("Message", back_populates="thread", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("msg"))
    thread_id = db.Column(db.String(64), db.ForeignKey("message_threads.id"), nullable=False, index=True)
    sender_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    body = db.Column(db.String(1000), nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    read_at = db.Column(db.DateTime(timezone=True))

    thread = db.relationship("MessageThread", back_populates="messages")
    sender = db.relationship("User", foreign_keys=[sender_id])
    recipient = db.relationship("User", foreign_keys=[recipient_id])
