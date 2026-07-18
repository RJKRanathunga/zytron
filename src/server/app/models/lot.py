from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class PlasticLot(TimestampMixin, db.Model):
    __tablename__ = "plastic_lots"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("lot"))
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    collection_point_id = db.Column(db.String(64), db.ForeignKey("collection_points.id"), nullable=False, index=True)
    material_id = db.Column(db.String(64), db.ForeignKey("plastic_materials.id"), nullable=False, index=True)
    source_compartment_id = db.Column(db.String(64), db.ForeignKey("bin_compartments.id"), index=True)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text)
    estimated_weight_kg = db.Column(db.Numeric(10, 2), nullable=False)
    minimum_weight_kg = db.Column(db.Numeric(10, 2), nullable=False, default=1)
    price_per_kg = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(8), default="LKR", nullable=False)
    quality_grade = db.Column(db.String(120), default="Verified sorted plastic", nullable=False)
    availability_start = db.Column(db.DateTime(timezone=True))
    availability_end = db.Column(db.DateTime(timezone=True))
    status = db.Column(db.String(32), nullable=False, default="available", index=True)
    published_at = db.Column(db.DateTime(timezone=True))
    expires_at = db.Column(db.DateTime(timezone=True))
    payment_required = db.Column(db.Boolean, default=False, nullable=False)
    publication_source = db.Column(db.String(32))
    reserved_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))
    views = db.Column(db.Integer, default=0, nullable=False)
    fill_level = db.Column(db.Integer, default=80, nullable=False)
    demand_score = db.Column(db.Integer, default=80, nullable=False)

    owner = db.relationship("User", foreign_keys=[owner_id])
    collection_point = db.relationship("CollectionPoint", back_populates="lots")
    material = db.relationship("PlasticMaterial")
    source_compartment = db.relationship("BinCompartment", back_populates="lots")
    offers = db.relationship("CollectorOffer", back_populates="lot")
    reservations = db.relationship("Reservation", back_populates="lot")
    pickups = db.relationship("Pickup", back_populates="lot")
    listing_payments = db.relationship("ListingPayment", back_populates="listing")


class CollectorOffer(TimestampMixin, db.Model):
    __tablename__ = "collector_offers"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("offer"))
    lot_id = db.Column(db.String(64), db.ForeignKey("plastic_lots.id"), nullable=False, index=True)
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    offered_price_per_kg = db.Column(db.Numeric(10, 2), nullable=False)
    proposed_pickup_at = db.Column(db.DateTime(timezone=True))
    pickup_window = db.Column(db.String(120))
    message = db.Column(db.Text)
    status = db.Column(db.String(32), nullable=False, default="pending", index=True)
    responded_at = db.Column(db.DateTime(timezone=True))

    lot = db.relationship("PlasticLot", back_populates="offers")
    collector = db.relationship("User", back_populates="collector_offers", foreign_keys=[collector_id])


class Reservation(TimestampMixin, db.Model):
    __tablename__ = "reservations"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("reservation"))
    lot_id = db.Column(db.String(64), db.ForeignKey("plastic_lots.id"), nullable=False, index=True)
    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    owner_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default="pending", index=True)
    expires_at = db.Column(db.DateTime(timezone=True))
    cancelled_at = db.Column(db.DateTime(timezone=True))
    confirmed_at = db.Column(db.DateTime(timezone=True))
    requested_date = db.Column(db.String(32))
    requested_window = db.Column(db.String(120))

    lot = db.relationship("PlasticLot", back_populates="reservations")
    collector = db.relationship("User", back_populates="collector_reservations", foreign_keys=[collector_id])
    owner = db.relationship("User", back_populates="owner_reservations", foreign_keys=[owner_id])
    pickups = db.relationship("Pickup", back_populates="reservation")
