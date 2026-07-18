from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id, utc_now


class SmartBin(TimestampMixin, db.Model):
    __tablename__ = "smart_bins"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("bin"))
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    collection_point_id = db.Column(db.String(64), db.ForeignKey("collection_points.id"), index=True)
    device_code = db.Column(db.String(80), unique=True, nullable=False, index=True)
    device_secret = db.Column(db.String(255))
    name = db.Column(db.String(120), nullable=False)
    model = db.Column(db.String(80))
    status = db.Column(db.String(32), nullable=False, default="online", index=True)
    firmware_version = db.Column(db.String(40))
    last_seen_at = db.Column(db.DateTime(timezone=True), default=utc_now)
    installed_at = db.Column(db.DateTime(timezone=True), default=utc_now)
    last_maintenance_at = db.Column(db.DateTime(timezone=True))
    next_maintenance_at = db.Column(db.DateTime(timezone=True))
    location_label = db.Column(db.String(120))
    battery_percent = db.Column(db.Integer, default=88, nullable=False)
    camera_status = db.Column(db.String(80), default="Online", nullable=False)
    weight_sensor_status = db.Column(db.String(80), default="Online", nullable=False)

    owner = db.relationship("User")
    collection_point = db.relationship("CollectionPoint", back_populates="smart_bins")
    compartments = db.relationship("BinCompartment", back_populates="smart_bin", cascade="all, delete-orphan")
    alerts = db.relationship("DeviceAlert", back_populates="smart_bin", cascade="all, delete-orphan")


class BinCompartment(db.Model):
    __tablename__ = "bin_compartments"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("comp"))
    smart_bin_id = db.Column(db.String(64), db.ForeignKey("smart_bins.id"), nullable=False, index=True)
    material_id = db.Column(db.String(64), db.ForeignKey("plastic_materials.id"), nullable=False, index=True)
    capacity_kg = db.Column(db.Numeric(10, 2), nullable=False)
    current_weight_kg = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    fill_percentage = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    threshold_percentage = db.Column(db.Numeric(5, 2), nullable=False, default=80)
    status = db.Column(db.String(32), nullable=False, default="growing", index=True)
    last_updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    smart_bin = db.relationship("SmartBin", back_populates="compartments")
    material = db.relationship("PlasticMaterial")
    lots = db.relationship("PlasticLot", back_populates="source_compartment")


class DeviceAlert(db.Model):
    __tablename__ = "device_alerts"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("alert"))
    smart_bin_id = db.Column(db.String(64), db.ForeignKey("smart_bins.id"), nullable=False, index=True)
    severity = db.Column(db.String(32), nullable=False, default="info", index=True)
    alert_type = db.Column(db.String(80), nullable=False, default="device")
    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_resolved = db.Column(db.Boolean, default=False, nullable=False)
    resolved_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    smart_bin = db.relationship("SmartBin", back_populates="alerts")
