"""store Firebase user identities

Revision ID: 0002_firebase_auth
Revises: 0001_initial_schema
Create Date: 2026-07-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_firebase_auth"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("firebase_uid", sa.String(length=128)))
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)
    op.create_index(op.f("ix_users_firebase_uid"), "users", ["firebase_uid"], unique=True)


def downgrade():
    op.drop_index(op.f("ix_users_firebase_uid"), table_name="users")
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)
    op.drop_column("users", "firebase_uid")
