from __future__ import annotations

from flask import Blueprint

from app.errors import ResourceNotFound
from app.models import DemandAlert, PlasticLot
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import DemandAlertSchema
from app.services.serializers import demand_alert_for_collector, lot_for_collector
from app.services.workflows import create_demand_alert, delete_demand_alert, get_or_404, update_demand_alert

bp = Blueprint("demand_alerts", __name__, url_prefix="/demand-alerts")


@bp.get("")
def list_alerts():
    user = current_user()
    query = DemandAlert.query
    if user.role == "collector":
        query = query.filter_by(collector_id=user.id)
    return paginated_response(query.order_by(DemandAlert.created_at.desc()), demand_alert_for_collector, default_per_page=50)


@bp.post("")
def create_alert():
    user = current_user()
    payload = load_payload(DemandAlertSchema())
    alert = create_demand_alert(user, payload)
    return data_response(demand_alert_for_collector(alert), 201)


@bp.get("/<alert_id>")
def get_alert(alert_id: str):
    user = current_user()
    alert = get_or_404(DemandAlert, alert_id, "The requested demand alert was not found.")
    if user.role == "collector" and alert.collector_id != user.id:
        raise ResourceNotFound("The requested demand alert was not found.")
    return data_response(demand_alert_for_collector(alert))


@bp.patch("/<alert_id>")
def patch_alert(alert_id: str):
    user = current_user()
    payload = load_payload(DemandAlertSchema(partial=True))
    alert = update_demand_alert(user, alert_id, payload)
    return data_response(demand_alert_for_collector(alert))


@bp.delete("/<alert_id>")
def delete_alert(alert_id: str):
    user = current_user()
    delete_demand_alert(user, alert_id)
    return data_response({"deleted": True})


@bp.post("/<alert_id>/toggle")
def toggle_alert(alert_id: str):
    user = current_user()
    alert = get_or_404(DemandAlert, alert_id, "The requested demand alert was not found.")
    if user.role != "collector" or alert.collector_id != user.id:
        raise ResourceNotFound("The requested demand alert was not found.")
    alert.is_active = not alert.is_active
    from app.extensions import db

    db.session.commit()
    return data_response(demand_alert_for_collector(alert))


@bp.get("/<alert_id>/matches")
def alert_matches(alert_id: str):
    user = current_user()
    alert = get_or_404(DemandAlert, alert_id, "The requested demand alert was not found.")
    if user.role == "collector" and alert.collector_id != user.id:
        raise ResourceNotFound("The requested demand alert was not found.")
    query = PlasticLot.query.filter(PlasticLot.status == "available")
    if alert.material_id:
        query = query.filter(PlasticLot.material_id == alert.material_id)
    if alert.maximum_price_per_kg:
        query = query.filter(PlasticLot.price_per_kg <= alert.maximum_price_per_kg)
    query = query.filter(PlasticLot.estimated_weight_kg >= alert.minimum_weight_kg)
    return data_response([lot_for_collector(lot) for lot in query.all()])
