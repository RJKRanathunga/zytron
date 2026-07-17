from __future__ import annotations

from flask import Blueprint, request

from app.errors import ResourceNotFound
from app.extensions import db
from app.models import BinCompartment, CollectionPoint, PlasticLot, SmartBin
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import CollectionPointSchema
from app.services.serializers import (
    collection_point_for_collector,
    collection_point_for_owner,
    lot_for_collector,
    lot_for_owner,
)
from app.services.workflows import ensure_owner, get_or_404, toggle_saved_point

bp = Blueprint("collection_points", __name__, url_prefix="/collection-points")


def serialize_point_for(user, point: CollectionPoint) -> dict:
    if user.role == "collector":
        saved_ids = {saved.collection_point_id for saved in user.saved_collection_points}
        return collection_point_for_collector(point, user, saved_ids)
    return collection_point_for_owner(point)


@bp.get("")
def list_points():
    user = current_user()
    query = CollectionPoint.query.filter_by(is_active=True)
    if user.role == "owner":
        query = query.filter_by(owner_id=user.id)
    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(CollectionPoint.name.ilike(f"%{search}%"))
    district = request.args.get("district")
    if district:
        query = query.filter(CollectionPoint.district == district)
    return paginated_response(query.order_by(CollectionPoint.name), lambda point: serialize_point_for(user, point), default_per_page=50)


@bp.post("")
def create_point():
    user = current_user()
    ensure_owner(user)
    payload = load_payload(CollectionPointSchema())
    point = CollectionPoint(owner=user, organization=user.organization, is_active=True, is_verified=True, **payload)
    db.session.add(point)
    db.session.commit()
    return data_response(collection_point_for_owner(point), 201)


@bp.get("/<point_id>")
def get_point(point_id: str):
    user = current_user()
    point = get_or_404(CollectionPoint, point_id, "The requested collection point was not found.")
    if user.role == "owner" and point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    return data_response(serialize_point_for(user, point))


@bp.patch("/<point_id>")
def update_point(point_id: str):
    user = current_user()
    ensure_owner(user)
    point = get_or_404(CollectionPoint, point_id, "The requested collection point was not found.")
    if point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    payload = load_payload(CollectionPointSchema(partial=True))
    for key, value in payload.items():
        setattr(point, key, value)
    db.session.commit()
    return data_response(collection_point_for_owner(point))


@bp.delete("/<point_id>")
def delete_point(point_id: str):
    user = current_user()
    ensure_owner(user)
    point = get_or_404(CollectionPoint, point_id, "The requested collection point was not found.")
    if point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    point.is_active = False
    db.session.commit()
    return data_response({"deleted": True})


@bp.get("/<point_id>/inventory")
def point_inventory(point_id: str):
    user = current_user()
    point = get_or_404(CollectionPoint, point_id, "The requested collection point was not found.")
    if user.role == "owner" and point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    compartments = (
        BinCompartment.query.join(SmartBin)
        .filter(SmartBin.collection_point_id == point.id)
        .all()
    )
    return data_response(
        [
            {
                "id": compartment.id,
                "binId": compartment.smart_bin_id,
                "material": compartment.material.code,
                "currentWeightKg": float(compartment.current_weight_kg),
                "capacityKg": float(compartment.capacity_kg),
                "fillPercentage": float(compartment.fill_percentage),
                "status": compartment.status,
            }
            for compartment in compartments
        ]
    )


@bp.get("/<point_id>/bins")
def point_bins(point_id: str):
    user = current_user()
    point = get_or_404(CollectionPoint, point_id, "The requested collection point was not found.")
    if user.role == "owner" and point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    return data_response([{"id": smart_bin.id, "name": smart_bin.name, "status": smart_bin.status} for smart_bin in point.smart_bins])


@bp.get("/<point_id>/lots")
def point_lots(point_id: str):
    user = current_user()
    point = get_or_404(CollectionPoint, point_id, "The requested collection point was not found.")
    if user.role == "owner" and point.owner_id != user.id:
        raise ResourceNotFound("The requested collection point was not found.")
    lots = PlasticLot.query.filter_by(collection_point_id=point.id).order_by(PlasticLot.created_at.desc()).all()
    serializer = lot_for_owner if user.role == "owner" else lot_for_collector
    return data_response([serializer(lot) for lot in lots])


@bp.post("/<point_id>/save")
def save_point(point_id: str):
    user = current_user()
    saved = toggle_saved_point(user, point_id)
    return data_response({"saved": saved})
