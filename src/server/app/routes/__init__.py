from __future__ import annotations

from app.routes import (
    auth,
    bins,
    collection_points,
    dashboard,
    demand_alerts,
    devices,
    impact,
    lots,
    materials,
    messages,
    notifications,
    offers,
    pickups,
    reservations,
    routes,
    transactions,
    users,
)

API_PREFIX = "/api/v1"


def register_blueprints(app):
    for blueprint in [
        auth.bp,
        users.bp,
        dashboard.bp,
        materials.bp,
        collection_points.bp,
        bins.bp,
        lots.bp,
        offers.bp,
        reservations.bp,
        pickups.bp,
        routes.bp,
        demand_alerts.bp,
        transactions.bp,
        notifications.bp,
        messages.bp,
        impact.bp,
        devices.bp,
    ]:
        app.register_blueprint(blueprint, url_prefix=f"{API_PREFIX}{blueprint.url_prefix or ''}")
