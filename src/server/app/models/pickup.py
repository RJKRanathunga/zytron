from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class Pickup(TimestampMixin, db.Model):
    __tablename__ = "pickups"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("pickup"))
    lot_id = db.Column(db.String(64), db.ForeignKey("plastic_lots.id"), nullable=False, index=True)
    reservation_id = db.Column(db.String(64), db.ForeignKey("reservations.id"), index=True)
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    collection_point_id = db.Column(db.String(64), db.ForeignKey("collection_points.id"), nullable=False, index=True)
    scheduled_start = db.Column(db.DateTime(timezone=True))
    scheduled_end = db.Column(db.DateTime(timezone=True))
    date_label = db.Column(db.String(64))
    time_window = db.Column(db.String(120))
    actual_arrival_at = db.Column(db.DateTime(timezone=True))
    actual_completion_at = db.Column(db.DateTime(timezone=True))
    estimated_weight_kg = db.Column(db.Numeric(10, 2), nullable=False)
    verified_weight_kg = db.Column(db.Numeric(10, 2))
    price_per_kg = db.Column(db.Numeric(10, 2), nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(8), default="LKR", nullable=False)
    status = db.Column(db.String(32), nullable=False, default="requested", index=True)
    progress_percent = db.Column(db.Integer, default=10, nullable=False)
    qr_code = db.Column(db.String(80), unique=True, nullable=False)
    owner_notes = db.Column(db.Text)
    collector_notes = db.Column(db.Text)

    lot = db.relationship("PlasticLot", back_populates="pickups")
    reservation = db.relationship("Reservation", back_populates="pickups")
    collector = db.relationship("User", foreign_keys=[collector_id])
    owner = db.relationship("User", foreign_keys=[owner_id])
    collection_point = db.relationship("CollectionPoint")
    transactions = db.relationship("Transaction", back_populates="pickup")


class RoutePlan(TimestampMixin, db.Model):
    __tablename__ = "route_plans"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("route"))
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    route_date = db.Column(db.String(32))
    status = db.Column(db.String(32), nullable=False, default="draft", index=True)
    estimated_distance_km = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    estimated_duration_minutes = db.Column(db.Integer, default=0, nullable=False)
    estimated_total_weight_kg = db.Column(db.Numeric(10, 2), default=0, nullable=False)
    estimated_total_cost = db.Column(db.Numeric(12, 2), default=0, nullable=False)

    collector = db.relationship("User", foreign_keys=[collector_id])
    stops = db.relationship("RouteStop", back_populates="route_plan", cascade="all, delete-orphan", order_by="RouteStop.stop_order")


class RouteStop(db.Model):
    __tablename__ = "route_stops"
    __table_args__ = (db.UniqueConstraint("route_plan_id", "stop_order", name="uq_route_stop_order"),)

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("stop"))
    route_plan_id = db.Column(db.String(64), db.ForeignKey("route_plans.id"), nullable=False, index=True)
    pickup_id = db.Column(db.String(64), db.ForeignKey("pickups.id"), index=True)
    lot_id = db.Column(db.String(64), db.ForeignKey("plastic_lots.id"), nullable=False, index=True)
    collection_point_id = db.Column(db.String(64), db.ForeignKey("collection_points.id"), nullable=False, index=True)
    stop_order = db.Column(db.Integer, nullable=False)
    estimated_arrival_at = db.Column(db.String(64))
    status = db.Column(db.String(32), nullable=False, default="planned")
    notes = db.Column(db.Text)

    route_plan = db.relationship("RoutePlan", back_populates="stops")
    pickup = db.relationship("Pickup")
    lot = db.relationship("PlasticLot")
    collection_point = db.relationship("CollectionPoint")
