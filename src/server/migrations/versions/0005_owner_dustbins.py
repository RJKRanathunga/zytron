"""owner managed dustbins

Revision ID: 0005_owner_dustbins
Revises: 0004_manual_lot_plastic_items
Create Date: 2026-07-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0005_owner_dustbins"
down_revision = "0004_manual_lot_plastic_items"
branch_labels = None
depends_on = None


def timestamp_columns():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    ]


def upgrade():
    op.create_table(
        "dustbins",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("owner_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("location_address", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("longitude", sa.Numeric(10, 7), nullable=False),
        sa.Column("supported_plastic_type", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "code", name="uq_dustbins_owner_code"),
    )
    op.create_index(op.f("ix_dustbins_code"), "dustbins", ["code"], unique=False)
    op.create_index(op.f("ix_dustbins_is_active"), "dustbins", ["is_active"], unique=False)
    op.create_index(op.f("ix_dustbins_owner_id"), "dustbins", ["owner_id"], unique=False)

    op.add_column("plastic_lots", sa.Column("dustbin_id", sa.String(length=64)))
    op.create_foreign_key("fk_plastic_lots_dustbin_id_dustbins", "plastic_lots", "dustbins", ["dustbin_id"], ["id"])
    op.create_index(op.f("ix_plastic_lots_dustbin_id"), "plastic_lots", ["dustbin_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_plastic_lots_dustbin_id"), table_name="plastic_lots")
    op.drop_constraint("fk_plastic_lots_dustbin_id_dustbins", "plastic_lots", type_="foreignkey")
    op.drop_column("plastic_lots", "dustbin_id")
    op.drop_table("dustbins")
