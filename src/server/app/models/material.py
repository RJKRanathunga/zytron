from __future__ import annotations

from app.extensions import db


class PlasticMaterial(db.Model):
    __tablename__ = "plastic_materials"

    id = db.Column(db.String(64), primary_key=True)
    code = db.Column(db.String(16), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    display_color = db.Column(db.String(24), nullable=False, default="#19bf91")
    resin_code = db.Column(db.String(16))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
