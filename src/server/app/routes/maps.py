from __future__ import annotations

from flask import Blueprint

from app.permissions import current_user
from app.routes.helpers import data_response, load_payload
from app.schemas import GeocodeSchema, LatLngSchema, RouteCalculationSchema
from app.services.google_maps import compute_route, geocode_address, reverse_geocode

bp = Blueprint("maps", __name__, url_prefix="/maps")


@bp.post("/geocode")
def geocode():
    current_user()
    payload = load_payload(GeocodeSchema())
    return data_response(geocode_address(payload["address"]))


@bp.post("/reverse-geocode")
def reverse():
    current_user()
    payload = load_payload(LatLngSchema())
    return data_response(reverse_geocode(payload))


@bp.post("/routes")
def routes():
    current_user()
    payload = load_payload(RouteCalculationSchema())
    return data_response(compute_route(payload["origin"], payload["destinations"]))


@bp.post("/distance")
def distance():
    current_user()
    payload = load_payload(RouteCalculationSchema(only=("origin", "destination")))
    return data_response(compute_route(payload["origin"], [payload["destination"]]))
