"""seller subscriptions and paid listings

Revision ID: 0003_seller_billing
Revises: 0002_firebase_auth
Create Date: 2026-07-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0003_seller_billing"
down_revision = "0002_firebase_auth"
branch_labels = None
depends_on = None


def timestamp_columns():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    ]


def upgrade():
    op.create_table(
        "packages",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("billing_type", sa.String(length=32), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="LKR"),
        sa.Column("billing_interval", sa.String(length=32)),
        sa.Column("listing_limit", sa.Integer()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamp_columns(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_packages_billing_type"), "packages", ["billing_type"], unique=False)
    op.create_index(op.f("ix_packages_code"), "packages", ["code"], unique=True)
    op.create_index(op.f("ix_packages_is_active"), "packages", ["is_active"], unique=False)

    op.add_column("plastic_lots", sa.Column("expires_at", sa.DateTime(timezone=True)))
    op.add_column("plastic_lots", sa.Column("payment_required", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("plastic_lots", sa.Column("publication_source", sa.String(length=32)))

    op.create_table(
        "seller_subscriptions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("seller_id", sa.String(length=64), nullable=False),
        sa.Column("package_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="mock"),
        sa.Column("provider_customer_id", sa.String(length=120)),
        sa.Column("provider_subscription_id", sa.String(length=120)),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("current_period_start", sa.DateTime(timezone=True)),
        sa.Column("current_period_end", sa.DateTime(timezone=True)),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["package_id"], ["packages.id"]),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_subscription_id"),
    )
    op.create_index(op.f("ix_seller_subscriptions_current_period_end"), "seller_subscriptions", ["current_period_end"], unique=False)
    op.create_index(op.f("ix_seller_subscriptions_package_id"), "seller_subscriptions", ["package_id"], unique=False)
    op.create_index(op.f("ix_seller_subscriptions_provider"), "seller_subscriptions", ["provider"], unique=False)
    op.create_index(op.f("ix_seller_subscriptions_seller_id"), "seller_subscriptions", ["seller_id"], unique=False)
    op.create_index(op.f("ix_seller_subscriptions_status"), "seller_subscriptions", ["status"], unique=False)

    op.create_table(
        "listing_payments",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("seller_id", sa.String(length=64), nullable=False),
        sa.Column("listing_id", sa.String(length=64), nullable=False),
        sa.Column("package_id", sa.String(length=64), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="LKR"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="mock"),
        sa.Column("provider_payment_id", sa.String(length=120)),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["listing_id"], ["plastic_lots.id"]),
        sa.ForeignKeyConstraint(["package_id"], ["packages.id"]),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_payment_id"),
    )
    op.create_index(op.f("ix_listing_payments_listing_id"), "listing_payments", ["listing_id"], unique=False)
    op.create_index(op.f("ix_listing_payments_package_id"), "listing_payments", ["package_id"], unique=False)
    op.create_index(op.f("ix_listing_payments_provider"), "listing_payments", ["provider"], unique=False)
    op.create_index(op.f("ix_listing_payments_seller_id"), "listing_payments", ["seller_id"], unique=False)
    op.create_index(op.f("ix_listing_payments_seller_status"), "listing_payments", ["seller_id", "status"], unique=False)
    op.create_index(op.f("ix_listing_payments_status"), "listing_payments", ["status"], unique=False)
    op.create_index("uq_listing_payments_paid_listing", "listing_payments", ["listing_id"], unique=True, postgresql_where=sa.text("status = 'paid'"))

    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("seller_id", sa.String(length=64), nullable=False),
        sa.Column("subscription_id", sa.String(length=64)),
        sa.Column("listing_payment_id", sa.String(length=64)),
        sa.Column("transaction_type", sa.String(length=40), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="LKR"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(length=40), nullable=False, server_default="mock"),
        sa.Column("provider_reference", sa.String(length=120)),
        sa.Column("provider_event_id", sa.String(length=160)),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["listing_payment_id"], ["listing_payments.id"]),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["subscription_id"], ["seller_subscriptions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_event_id"),
    )
    op.create_index(op.f("ix_payment_transactions_listing_payment_id"), "payment_transactions", ["listing_payment_id"], unique=False)
    op.create_index(op.f("ix_payment_transactions_provider"), "payment_transactions", ["provider"], unique=False)
    op.create_index(op.f("ix_payment_transactions_provider_reference"), "payment_transactions", ["provider_reference"], unique=False)
    op.create_index(op.f("ix_payment_transactions_seller_id"), "payment_transactions", ["seller_id"], unique=False)
    op.create_index(op.f("ix_payment_transactions_status"), "payment_transactions", ["status"], unique=False)
    op.create_index(op.f("ix_payment_transactions_subscription_id"), "payment_transactions", ["subscription_id"], unique=False)
    op.create_index(op.f("ix_payment_transactions_transaction_type"), "payment_transactions", ["transaction_type"], unique=False)


def downgrade():
    op.drop_table("payment_transactions")
    op.drop_index("uq_listing_payments_paid_listing", table_name="listing_payments")
    op.drop_table("listing_payments")
    op.drop_table("seller_subscriptions")
    op.drop_column("plastic_lots", "publication_source")
    op.drop_column("plastic_lots", "payment_required")
    op.drop_column("plastic_lots", "expires_at")
    op.drop_table("packages")
