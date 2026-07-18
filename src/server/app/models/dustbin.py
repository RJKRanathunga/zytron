from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class Dustbin(TimestampMixin, db.Model):
    __tablename__ = "dustbins"
    __table_args__ = (
        db.UniqueConstraint("owner_id", "code", name="uq_dustbins_owner_code"),
    )

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("dustbin"))
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(80), nullable=False, index=True)
    location_address = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Numeric(10, 7), nullable=False)
    longitude = db.Column(db.Numeric(10, 7), nullable=False)
    supported_plastic_type = db.Column(db.String(32), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)

    owner = db.relationship("User", back_populates="dustbins", foreign_keys=[owner_id])
    lots = db.relationship("PlasticLot", back_populates="dustbin")
