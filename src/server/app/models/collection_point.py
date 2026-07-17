from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class CollectionPoint(TimestampMixin, db.Model):
    __tablename__ = "collection_points"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("point"))
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    organization_id = db.Column(db.String(64), db.ForeignKey("organizations.id"), index=True)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(80))
    district = db.Column(db.String(80), index=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=False)
    longitude = db.Column(db.Numeric(10, 7), nullable=False)
    opening_hours = db.Column(db.String(120))
    access_instructions = db.Column(db.Text)
    contact_phone = db.Column(db.String(40))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=True, nullable=False)
    reliability_score = db.Column(db.Integer, default=90, nullable=False)
    rating = db.Column(db.Numeric(3, 2), default=4.7, nullable=False)
    handovers = db.Column(db.Integer, default=0, nullable=False)

    owner = db.relationship("User", back_populates="owned_collection_points", foreign_keys=[owner_id])
    organization = db.relationship("Organization")
    smart_bins = db.relationship("SmartBin", back_populates="collection_point")
    lots = db.relationship("PlasticLot", back_populates="collection_point")
