from __future__ import annotations

from app.extensions import db
from app.models.base import TimestampMixin, new_id


class Package(TimestampMixin, db.Model):
    __tablename__ = "packages"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("pkg"))
    code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    billing_type = db.Column(db.String(32), nullable=False, index=True)
    price = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(8), default="LKR", nullable=False)
    billing_interval = db.Column(db.String(32))
    listing_limit = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)

    subscriptions = db.relationship("SellerSubscription", back_populates="package")
    listing_payments = db.relationship("ListingPayment", back_populates="package")


class SellerSubscription(TimestampMixin, db.Model):
    __tablename__ = "seller_subscriptions"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("sub"))
    seller_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    package_id = db.Column(db.String(64), db.ForeignKey("packages.id"), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default="pending", index=True)
    provider = db.Column(db.String(40), nullable=False, default="mock", index=True)
    provider_customer_id = db.Column(db.String(120))
    provider_subscription_id = db.Column(db.String(120), unique=True)
    started_at = db.Column(db.DateTime(timezone=True))
    current_period_start = db.Column(db.DateTime(timezone=True))
    current_period_end = db.Column(db.DateTime(timezone=True), index=True)
    cancel_at_period_end = db.Column(db.Boolean, default=False, nullable=False)
    cancelled_at = db.Column(db.DateTime(timezone=True))

    seller = db.relationship("User", back_populates="seller_subscriptions", foreign_keys=[seller_id])
    package = db.relationship("Package", back_populates="subscriptions")
    transactions = db.relationship("PaymentTransaction", back_populates="subscription")


class ListingPayment(TimestampMixin, db.Model):
    __tablename__ = "listing_payments"
    __table_args__ = (
        db.Index("ix_listing_payments_seller_status", "seller_id", "status"),
        db.Index(
            "uq_listing_payments_paid_listing",
            "listing_id",
            unique=True,
            postgresql_where=db.text("status = 'paid'"),
            sqlite_where=db.text("status = 'paid'"),
        ),
    )

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("lpay"))
    seller_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    listing_id = db.Column(db.String(64), db.ForeignKey("plastic_lots.id"), nullable=False, index=True)
    package_id = db.Column(db.String(64), db.ForeignKey("packages.id"), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(8), default="LKR", nullable=False)
    status = db.Column(db.String(32), nullable=False, default="pending", index=True)
    provider = db.Column(db.String(40), nullable=False, default="mock", index=True)
    provider_payment_id = db.Column(db.String(120), unique=True)
    paid_at = db.Column(db.DateTime(timezone=True))

    seller = db.relationship("User", back_populates="listing_payments", foreign_keys=[seller_id])
    listing = db.relationship("PlasticLot", back_populates="listing_payments")
    package = db.relationship("Package", back_populates="listing_payments")
    transactions = db.relationship("PaymentTransaction", back_populates="listing_payment")


class PaymentTransaction(TimestampMixin, db.Model):
    __tablename__ = "payment_transactions"

    id = db.Column(db.String(64), primary_key=True, default=lambda: new_id("ptxn"))
    seller_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    subscription_id = db.Column(db.String(64), db.ForeignKey("seller_subscriptions.id"), index=True)
    listing_payment_id = db.Column(db.String(64), db.ForeignKey("listing_payments.id"), index=True)
    transaction_type = db.Column(db.String(40), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(8), default="LKR", nullable=False)
    status = db.Column(db.String(32), nullable=False, default="pending", index=True)
    provider = db.Column(db.String(40), nullable=False, default="mock", index=True)
    provider_reference = db.Column(db.String(120), index=True)
    provider_event_id = db.Column(db.String(160), unique=True)
    metadata_json = db.Column("metadata", db.JSON, default=dict, nullable=False)

    seller = db.relationship("User", back_populates="payment_transactions", foreign_keys=[seller_id])
    subscription = db.relationship("SellerSubscription", back_populates="transactions")
    listing_payment = db.relationship("ListingPayment", back_populates="transactions")
