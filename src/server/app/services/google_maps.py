from __future__ import annotations

import json
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import current_app

from app.errors import ApiError

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


def _api_key() -> str:
    key = current_app.config.get("GOOGLE_MAPS_SERVER_API_KEY") or ""
    if not key.strip():
        raise ApiError(
            "maps_configuration_missing",
            "Google Maps server API key is not configured.",
            503,
        )
    return key.strip()


def _json_request(url: str, *, method: str = "GET", payload: dict | None = None, headers: dict[str, str] | None = None) -> dict:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        url,
        data=body,
        method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        raise ApiError("google_maps_api_failure", "Google Maps API request failed.", error.code, {"response": detail[:500]}) from error
    except (TimeoutError, URLError) as error:
        raise ApiError("google_maps_network_failure", "Google Maps API could not be reached.", 502) from error


def _decimal_to_float(value) -> float:
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _lat_lng(location: dict) -> dict:
    lat = location.get("lat", location.get("latitude"))
    lng = location.get("lng", location.get("longitude"))
    if lat is None or lng is None:
        raise ApiError("missing_location", "Latitude and longitude are required.", 400)
    try:
        lat_value = _decimal_to_float(lat)
        lng_value = _decimal_to_float(lng)
    except (TypeError, ValueError) as error:
        raise ApiError("invalid_location", "Latitude and longitude must be valid numbers.", 400) from error
    if not (-90 <= lat_value <= 90 and -180 <= lng_value <= 180):
        raise ApiError("invalid_location", "Latitude or longitude is outside the valid range.", 400)
    return {"latitude": lat_value, "longitude": lng_value}


def geocode_address(address: str) -> dict:
    if not address.strip():
        raise ApiError("invalid_address", "Address is required.", 400)
    url = f"{GEOCODE_URL}?{urlencode({'address': address.strip(), 'key': _api_key()})}"
    data = _json_request(url)
    status = data.get("status")
    if status == "ZERO_RESULTS":
        raise ApiError("invalid_address", "No mapped location was found for that address.", 422)
    if status != "OK":
        raise ApiError("google_maps_api_failure", "Google Maps geocoding failed.", 502, {"status": status})
    result = data["results"][0]
    location = result["geometry"]["location"]
    return {
        "address": result.get("formatted_address", address),
        "latitude": location["lat"],
        "longitude": location["lng"],
        "placeId": result.get("place_id"),
    }


def reverse_geocode(location: dict) -> dict:
    lat_lng = _lat_lng(location)
    latlng = f"{lat_lng['latitude']},{lat_lng['longitude']}"
    url = f"{GEOCODE_URL}?{urlencode({'latlng': latlng, 'key': _api_key()})}"
    data = _json_request(url)
    status = data.get("status")
    if status == "ZERO_RESULTS":
        raise ApiError("invalid_address", "No address was found for that location.", 422)
    if status != "OK":
        raise ApiError("google_maps_api_failure", "Google Maps reverse geocoding failed.", 502, {"status": status})
    result = data["results"][0]
    return {
        "address": result.get("formatted_address", ""),
        "latitude": lat_lng["latitude"],
        "longitude": lat_lng["longitude"],
        "placeId": result.get("place_id"),
    }


def compute_route(origin: dict, destinations: list[dict]) -> dict:
    if not destinations:
        raise ApiError("missing_location", "At least one destination is required.", 400)
    locations = [_lat_lng(origin), *[_lat_lng(destination) for destination in destinations]]
    payload = {
        "origin": {"location": {"latLng": locations[0]}},
        "destination": {"location": {"latLng": locations[-1]}},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_UNAWARE",
        "computeAlternativeRoutes": False,
        "languageCode": "en-US",
        "units": "METRIC",
    }
    if len(locations) > 2:
        payload["intermediates"] = [{"location": {"latLng": location}} for location in locations[1:-1]]

    data = _json_request(
        ROUTES_URL,
        method="POST",
        payload=payload,
        headers={
            "X-Goog-Api-Key": _api_key(),
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration",
        },
    )
    routes = data.get("routes") or []
    if not routes:
        raise ApiError("google_maps_api_failure", "Google Routes did not return a route.", 502)
    route = routes[0]
    duration_seconds = int(str(route.get("duration", "0s")).rstrip("s") or 0)
    return {
        "distanceKm": round((route.get("distanceMeters") or 0) / 1000, 2),
        "durationMinutes": max(1, round(duration_seconds / 60)),
        "polyline": (route.get("polyline") or {}).get("encodedPolyline"),
        "legs": [
            {
                "distanceKm": round((leg.get("distanceMeters") or 0) / 1000, 2),
                "durationMinutes": max(1, round(int(str(leg.get("duration", "0s")).rstrip("s") or 0) / 60)),
            }
            for leg in route.get("legs", [])
        ],
    }
