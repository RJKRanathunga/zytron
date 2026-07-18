"""smart bins belong directly to owners

Revision ID: 0005_smart_bins_owner_link
Revises: 0004_manual_lot_plastic_items
Create Date: 2026-07-19 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0005_smart_bins_owner_link"
down_revision = "0004_manual_lot_plastic_items"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("smart_bins", sa.Column("owner_id", sa.String(length=64), nullable=True))
    op.execute(
        """
        UPDATE smart_bins
        SET owner_id = collection_points.owner_id
        FROM collection_points
        WHERE smart_bins.collection_point_id = collection_points.id
        """
    )
    op.alter_column("smart_bins", "owner_id", nullable=False, existing_type=sa.String(length=64))
    op.alter_column("smart_bins", "collection_point_id", nullable=True, existing_type=sa.String(length=64))
    op.create_foreign_key(op.f("fk_smart_bins_owner_id_users"), "smart_bins", "users", ["owner_id"], ["id"])
    op.create_index(op.f("ix_smart_bins_owner_id"), "smart_bins", ["owner_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_smart_bins_owner_id"), table_name="smart_bins")
    op.drop_constraint(op.f("fk_smart_bins_owner_id_users"), "smart_bins", type_="foreignkey")
    op.alter_column("smart_bins", "collection_point_id", nullable=False, existing_type=sa.String(length=64))
    op.drop_column("smart_bins", "owner_id")
