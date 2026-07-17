from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class Transaction(TimestampMixin, db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("txn"))
    pickup_id = db.Column(db.String(64), db.ForeignKey("pickups.id"), index=True)
    lot_id = db.Column(db.String(64), db.ForeignKey("plastic_lots.id"), nullable=False, index=True)
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    transaction_type = db.Column(db.String(32), nullable=False, default="purchase")
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)
    platform_fee = db.Column(db.Numeric(12, 2), default=0, nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(8), default="LKR", nullable=False)
    payment_method = db.Column(db.String(80), default="Wallet hold", nullable=False)
    payment_reference = db.Column(db.String(120))
    payment_status = db.Column(db.String(32), default="pending", nullable=False, index=True)
    paid_at = db.Column(db.DateTime(timezone=True))
    title = db.Column(db.String(180), nullable=False)

    pickup = db.relationship("Pickup", back_populates="transactions")
    lot = db.relationship("PlasticLot")
    collector = db.relationship("User", foreign_keys=[collector_id])
    owner = db.relationship("User", foreign_keys=[owner_id])
