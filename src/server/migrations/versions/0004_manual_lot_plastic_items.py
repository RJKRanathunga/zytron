"""manual plastic item weights for lots

Revision ID: 0004_manual_lot_plastic_items
Revises: 0003_seller_billing
Create Date: 2026-07-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0004_manual_lot_plastic_items"
down_revision = "0003_seller_billing"
branch_labels = None
depends_on = None


def timestamp_columns():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    ]


def upgrade():
    op.create_table(
        "lot_plastic_items",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("lot_id", sa.String(length=64), nullable=False),
        sa.Column("plastic_type", sa.String(length=32), nullable=False),
        sa.Column("custom_plastic_type", sa.String(length=120)),
        sa.Column("weight", sa.Numeric(10, 2), nullable=False),
        sa.Column("weight_unit", sa.String(length=8), nullable=False, server_default="kg"),
        *timestamp_columns(),
        sa.CheckConstraint("weight > 0", name="ck_lot_plastic_items_weight_positive"),
        sa.CheckConstraint("weight_unit IN ('kg')", name="ck_lot_plastic_items_weight_unit"),
        sa.ForeignKeyConstraint(["lot_id"], ["plastic_lots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lot_id", "plastic_type", name="uq_lot_plastic_item_type"),
    )
    op.create_index(op.f("ix_lot_plastic_items_lot_id"), "lot_plastic_items", ["lot_id"], unique=False)
    op.create_index(op.f("ix_lot_plastic_items_plastic_type"), "lot_plastic_items", ["plastic_type"], unique=False)

    op.execute(
        """
        INSERT INTO lot_plastic_items (id, lot_id, plastic_type, weight, weight_unit, created_at, updated_at)
        SELECT
            'lotitem-' || plastic_lots.id,
            plastic_lots.id,
            plastic_materials.code,
            plastic_lots.estimated_weight_kg,
            'kg',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM plastic_lots
        JOIN plastic_materials ON plastic_materials.id = plastic_lots.material_id
        WHERE plastic_lots.estimated_weight_kg > 0
        """
    )


def downgrade():
    op.drop_table("lot_plastic_items")
