from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class DemandAlert(TimestampMixin, db.Model):
    __tablename__ = "demand_alerts"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("demand"))
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    material_id = db.Column(db.String(64), db.ForeignKey("plastic_materials.id"), index=True)
    minimum_weight_kg = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    maximum_distance_km = db.Column(db.Numeric(10, 2), nullable=False, default=15)
    maximum_price_per_kg = db.Column(db.Numeric(10, 2))
    district = db.Column(db.String(80))
    ready_window = db.Column(db.String(120), default="Ready within 48 hours")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_triggered_at = db.Column(db.DateTime(timezone=True))

    collector = db.relationship("User", back_populates="demand_alerts")
    material = db.relationship("PlasticMaterial")
