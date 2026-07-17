from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from flask import Blueprint

from app.models import Pickup, Transaction
from app.permissions import current_user
from app.routes.helpers import data_response

bp = Blueprint("impact", __name__, url_prefix="/impact")


def completed_query(user):
    query = Pickup.query.filter_by(status="completed")
    if user.role == "owner":
        query = query.filter_by(owner_id=user.id)
    elif user.role == "collector":
        query = query.filter_by(collector_id=user.id)
    return query


@bp.get("/summary")
def summary():
    user = current_user()
    pickups = completed_query(user).all()
    total_kg = sum((pickup.verified_weight_kg or pickup.estimated_weight_kg for pickup in pickups), Decimal("0"))
    return data_response(
        {
            "totalPlasticCollectedKg": float(total_kg),
            "totalCompletedPickups": len(pickups),
            "estimatedLandfillDiversionKg": float(total_kg),
            "estimatedCo2SavingsKg": float(total_kg * Decimal("1.72")),
            "assumption": "CO2e savings are estimated at 1.72 kg CO2e avoided per kg recovered plastic.",
        }
    )


@bp.get("/material-breakdown")
def material_breakdown():
    user = current_user()
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for pickup in completed_query(user).all():
        totals[pickup.lot.material.code] += pickup.verified_weight_kg or pickup.estimated_weight_kg
    return data_response([{"material": material, "quantityKg": float(quantity)} for material, quantity in sorted(totals.items())])


@bp.get("/timeseries")
def timeseries():
    user = current_user()
    rows = []
    for pickup in completed_query(user).order_by(Pickup.actual_completion_at.asc()).all():
        rows.append(
            {
                "date": (pickup.actual_completion_at or pickup.updated_at).date().isoformat(),
                "quantityKg": float(pickup.verified_weight_kg or pickup.estimated_weight_kg),
                "amount": float(pickup.total_amount),
            }
        )
    return data_response(rows)


@bp.get("/community")
def community():
    user = current_user()
    participant_count = Transaction.query.filter_by(owner_id=user.id).count() if user.role == "owner" else completed_query(user).count()
    return data_response({"communityParticipants": participant_count, "completedPickups": completed_query(user).count()})
