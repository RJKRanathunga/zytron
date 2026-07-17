from __future__ import annotations

from flask import Blueprint

from app.models import PlasticMaterial
from app.permissions import current_user
from app.routes.helpers import data_response
from app.services.workflows import get_or_404

bp = Blueprint("materials", __name__, url_prefix="/materials")


def serialize_material(material: PlasticMaterial) -> dict:
    return {
        "id": material.id,
        "code": material.code,
        "name": material.name,
        "description": material.description,
        "displayColor": material.display_color,
        "resinCode": material.resin_code,
        "isActive": material.is_active,
    }


@bp.get("")
def list_materials():
    current_user()
    materials = PlasticMaterial.query.filter_by(is_active=True).order_by(PlasticMaterial.code).all()
    return data_response([serialize_material(material) for material in materials])


@bp.get("/<material_id>")
def get_material(material_id: str):
    current_user()
    material = PlasticMaterial.query.filter((PlasticMaterial.id == material_id) | (PlasticMaterial.code == material_id.upper())).first()
    if not material:
        material = get_or_404(PlasticMaterial, material_id, "The requested material was not found.")
    return data_response(serialize_material(material))
