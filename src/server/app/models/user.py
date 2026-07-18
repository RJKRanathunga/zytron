from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id, utc_now


class Organization(TimestampMixin, db.Model):
    __tablename__ = "organizations"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("org"))
    name = db.Column(db.String(160), nullable=False)
    organization_type = db.Column(db.String(32), nullable=False)
    registration_number = db.Column(db.String(80))
    description = db.Column(db.Text)
    phone = db.Column(db.String(40))
    email = db.Column(db.String(160))
    address = db.Column(db.String(255))
    district = db.Column(db.String(80), index=True)

    users = db.relationship("User", back_populates="organization")


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("usr"))
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    firebase_uid = db.Column(db.String(128), unique=True, index=True)
    password_hash = db.Column(db.String(255))
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    phone = db.Column(db.String(40))
    role = db.Column(db.String(32), nullable=False, index=True)
    avatar_url = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=True, nullable=False)
    last_login_at = db.Column(db.DateTime(timezone=True))
    organization_id = db.Column(db.String(64), db.ForeignKey("organizations.id"))
    base_location = db.Column(db.String(120))
    vehicle_capacity_kg = db.Column(db.Numeric(10, 2), default=100)

    organization = db.relationship("Organization", back_populates="users")
    owned_collection_points = db.relationship("CollectionPoint", back_populates="owner", foreign_keys="CollectionPoint.owner_id")
    collector_offers = db.relationship("CollectorOffer", back_populates="collector", foreign_keys="CollectorOffer.collector_id")
    collector_reservations = db.relationship("Reservation", back_populates="collector", foreign_keys="Reservation.collector_id")
    owner_reservations = db.relationship("Reservation", back_populates="owner", foreign_keys="Reservation.owner_id")
    notifications = db.relationship("Notification", back_populates="user")
    demand_alerts = db.relationship("DemandAlert", back_populates="collector")
    saved_collection_points = db.relationship("SavedCollectionPoint", back_populates="collector", cascade="all, delete-orphan")
    seller_subscriptions = db.relationship("SellerSubscription", back_populates="seller", foreign_keys="SellerSubscription.seller_id")
    listing_payments = db.relationship("ListingPayment", back_populates="seller", foreign_keys="ListingPayment.seller_id")
    payment_transactions = db.relationship("PaymentTransaction", back_populates="seller", foreign_keys="PaymentTransaction.seller_id")

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def initials(self) -> str:
        parts = [self.first_name[:1], self.last_name[:1]]
        return "".join(parts).upper() or self.email[:2].upper()

    def touch_login(self):
        self.last_login_at = utc_now()


class SavedCollectionPoint(db.Model):
    __tablename__ = "saved_collection_points"

    collector_id = db.Column(db.String(64), db.ForeignKey("users.id"), primary_key=True)
    collection_point_id = db.Column(db.String(64), db.ForeignKey("collection_points.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    collector = db.relationship("User", back_populates="saved_collection_points")
    collection_point = db.relationship("CollectionPoint")


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    jti = db.Column(db.String(128), primary_key=True)
    token_type = db.Column(db.String(16), nullable=False)
    user_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False)
    revoked_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
