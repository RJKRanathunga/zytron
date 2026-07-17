from __future__ import annotations

from flask import Blueprint, request

from app.errors import ResourceNotFound
from app.extensions import db
from app.models import PlasticLot, RoutePlan, RouteStop
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import RouteSaveSchema
from app.services.workflows import complete_route, get_or_404, remove_route_stop, save_route, start_route

bp = Blueprint("route_plans", __name__, url_prefix="/routes")


def serialize_route(route: RoutePlan) -> dict:
    return {
        "id": route.id,
        "name": route.name,
        "dateLabel": route.route_date,
        "status": route.status,
        "estimatedDistanceKm": float(route.estimated_distance_km),
        "estimatedDurationMinutes": route.estimated_duration_minutes,
        "estimatedTotalWeightKg": float(route.estimated_total_weight_kg),
        "estimatedTotalCost": float(route.estimated_total_cost),
        "stops": [
            {
                "id": stop.id,
                "lotId": stop.lot_id,
                "collectionPointId": stop.collection_point_id,
                "eta": stop.estimated_arrival_at,
                "status": stop.status,
                "order": stop.stop_order,
            }
            for stop in route.stops
        ],
    }


@bp.get("")
def list_routes():
    user = current_user()
    query = RoutePlan.query
    if user.role == "collector":
        query = query.filter_by(collector_id=user.id)
    return paginated_response(query.order_by(RoutePlan.updated_at.desc()), serialize_route)


@bp.post("")
def create_route():
    user = current_user()
    payload = load_payload(RouteSaveSchema())
    route = save_route(user, payload)
    return data_response(serialize_route(route), 201)


@bp.get("/<route_id>")
def get_route(route_id: str):
    user = current_user()
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if user.role == "collector" and route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    return data_response(serialize_route(route))


@bp.patch("/<route_id>")
def update_route(route_id: str):
    user = current_user()
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if user.role == "collector" and route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    payload = request.get_json() or {}
    if payload.get("name"):
        route.name = payload["name"]
    if payload.get("date") or payload.get("route_date"):
        route.route_date = payload.get("date") or payload.get("route_date")
    db.session.commit()
    return data_response(serialize_route(route))


@bp.delete("/<route_id>")
def delete_route(route_id: str):
    user = current_user()
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if user.role == "collector" and route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    route.status = "cancelled"
    db.session.commit()
    return data_response({"deleted": True})


@bp.post("/<route_id>/stops")
def add_stop(route_id: str):
    user = current_user()
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if user.role != "collector" or route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    payload = request.get_json() or {}
    lot = get_or_404(PlasticLot, payload.get("lot_id") or payload.get("lotId") or "", "The requested lot was not found.")
    stop = RouteStop(
        route_plan=route,
        lot=lot,
        collection_point_id=lot.collection_point_id,
        stop_order=len(route.stops) + 1,
        estimated_arrival_at=payload.get("eta") or "",
    )
    db.session.add(stop)
    db.session.commit()
    save_route(user, {"lot_ids": [stop.lot_id for stop in route.stops], "date": route.route_date, "name": route.name})
    return data_response(serialize_route(route), 201)


@bp.delete("/<route_id>/stops/<stop_id>")
def delete_stop(route_id: str, stop_id: str):
    user = current_user()
    route = remove_route_stop(user, route_id, stop_id)
    return data_response(serialize_route(route))


@bp.post("/<route_id>/reorder")
def reorder(route_id: str):
    user = current_user()
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if user.role != "collector" or route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    payload = request.get_json() or {}
    stop_ids = payload.get("stopIds") or payload.get("stop_ids") or []
    order = {stop_id: index for index, stop_id in enumerate(stop_ids, start=1)}
    for stop in route.stops:
        if stop.id in order:
            stop.stop_order = order[stop.id]
    db.session.commit()
    return data_response(serialize_route(route))


@bp.post("/<route_id>/start")
def start(route_id: str):
    user = current_user()
    route = start_route(user, route_id)
    return data_response(serialize_route(route))


@bp.post("/<route_id>/complete")
def complete(route_id: str):
    user = current_user()
    route = complete_route(user, route_id)
    return data_response(serialize_route(route))
