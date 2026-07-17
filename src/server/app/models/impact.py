from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class ImpactSnapshot(TimestampMixin, db.Model):
    __tablename__ = "impact_snapshots"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("impact"))
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), index=True)
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), index=True)
    period = db.Column(db.String(32), nullable=False, default="month")
    total_plastic_collected_kg = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total_completed_pickups = db.Column(db.Integer, nullable=False, default=0)
    estimated_landfill_diversion_kg = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    estimated_co2_savings_kg = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    community_participants = db.Column(db.Integer, nullable=False, default=0)
