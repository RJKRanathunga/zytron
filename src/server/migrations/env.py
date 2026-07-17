from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from flask import current_app

from app.extensions import db
import app.models  # noqa: F401

config = context.config
fileConfig(config.config_file_name)
target_metadata = db.metadata


def get_url():
    return current_app.config["SQLALCHEMY_DATABASE_URI"]


def run_migrations_offline():
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = db.engine
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
