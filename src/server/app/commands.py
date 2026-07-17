from __future__ import annotations

import click

from app.extensions import db
from app.services.seed_data import seed_database


def register_commands(app):
    @app.cli.command("seed")
    def seed_command():
        """Seed local development demo data."""
        seed_database()
        click.echo("Seeded PolyLoop demo data.")

    @app.cli.command("reset-db")
    def reset_db_command():
        """Drop and recreate all database tables, then seed demo data."""
        db.drop_all()
        db.create_all()
        seed_database()
        click.echo("Reset and seeded PolyLoop database.")
