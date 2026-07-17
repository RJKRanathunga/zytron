from __future__ import annotations

from flask import Blueprint

from app.permissions import current_user
from app.routes.helpers import data_response
from app.services.workflows import ensure_collector, ensure_owner, snapshot_for

bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@bp.get("/collector")
def collector_dashboard():
    user = current_user()
    ensure_collector(user)
    return data_response(snapshot_for(user))


@bp.get("/owner")
def owner_dashboard():
    user = current_user()
    ensure_owner(user)
    return data_response(snapshot_for(user))
