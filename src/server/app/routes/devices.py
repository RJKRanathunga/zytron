from __future__ import annotations

from flask import Blueprint

from app.routes.helpers import data_response, load_payload
from app.schemas import DeviceEventSchema, DeviceHeartbeatSchema
from app.services.workflows import record_device_event, record_device_heartbeat

bp = Blueprint("devices", __name__, url_prefix="")


@bp.post("/device-heartbeats")
def heartbeat():
    payload = load_payload(DeviceHeartbeatSchema())
    device = record_device_heartbeat(payload)
    return data_response({"deviceId": device.id, "status": device.status, "lastSeenAt": device.last_seen_at.isoformat()})


@bp.post("/device-events")
def event():
    payload = load_payload(DeviceEventSchema())
    device = record_device_event(payload)
    return data_response({"deviceId": device.id, "status": device.status, "lastSeenAt": device.last_seen_at.isoformat()})
