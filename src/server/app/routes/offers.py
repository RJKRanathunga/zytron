from __future__ import annotations

from flask import Blueprint, request

from app.errors import InvalidState, ResourceNotFound
from app.models import CollectorOffer, PlasticLot
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import OfferCreateSchema, OfferDecisionSchema
from app.services.serializers import offer_for_owner
from app.services.workflows import accept_offer, get_or_404, reject_offer, submit_offer, withdraw_offer

bp = Blueprint("offers", __name__, url_prefix="")


def offer_for_collector(offer: CollectorOffer) -> dict:
    return {
        "id": offer.id,
        "lotId": offer.lot_id,
        "status": offer.status,
        "pricePerKg": float(offer.offered_price_per_kg),
        "pickupWindow": offer.pickup_window,
        "message": offer.message,
        "createdAt": offer.created_at.isoformat(),
    }


@bp.get("/offers")
def list_offers():
    user = current_user()
    if user.role == "owner":
        query = CollectorOffer.query.join(PlasticLot).filter(PlasticLot.owner_id == user.id)
        status = request.args.get("status")
        if status:
            query = query.filter(CollectorOffer.status == {"new": "pending"}.get(status, status))
        return paginated_response(query.order_by(CollectorOffer.created_at.desc()), offer_for_owner, default_per_page=50)
    query = CollectorOffer.query.filter_by(collector_id=user.id)
    return paginated_response(query.order_by(CollectorOffer.created_at.desc()), offer_for_collector, default_per_page=50)


@bp.post("/lots/<lot_id>/offers")
def create_offer(lot_id: str):
    user = current_user()
    payload = load_payload(OfferCreateSchema())
    offer = submit_offer(user, lot_id, payload)
    return data_response(offer_for_collector(offer), 201)


@bp.get("/offers/<offer_id>")
def get_offer(offer_id: str):
    user = current_user()
    offer = get_or_404(CollectorOffer, offer_id, "The requested offer was not found.")
    if user.role == "owner" and offer.lot.owner_id == user.id:
        return data_response(offer_for_owner(offer))
    if user.role == "collector" and offer.collector_id == user.id:
        return data_response(offer_for_collector(offer))
    raise ResourceNotFound("The requested offer was not found.")


@bp.patch("/offers/<offer_id>")
def update_offer(offer_id: str):
    user = current_user()
    offer = get_or_404(CollectorOffer, offer_id, "The requested offer was not found.")
    if user.role != "collector" or offer.collector_id != user.id:
        raise ResourceNotFound("The requested offer was not found.")
    if offer.status != "pending":
        raise InvalidState("Only pending offers can be updated.")
    payload = load_payload(OfferCreateSchema(partial=True))
    if payload.get("pricePerKg") or payload.get("offered_price_per_kg"):
        offer.offered_price_per_kg = payload.get("pricePerKg") or payload.get("offered_price_per_kg")
    if payload.get("pickupWindow") or payload.get("pickup_window"):
        offer.pickup_window = payload.get("pickupWindow") or payload.get("pickup_window")
    if "message" in payload:
        offer.message = payload["message"]
    from app.extensions import db

    db.session.commit()
    return data_response(offer_for_collector(offer))


@bp.post("/offers/<offer_id>/accept")
def accept(offer_id: str):
    user = current_user()
    payload = load_payload(OfferDecisionSchema())
    offer = accept_offer(user, offer_id, payload)
    return data_response({"offer": offer_for_owner(offer), "snapshot": None})


@bp.post("/offers/<offer_id>/reject")
def reject(offer_id: str):
    user = current_user()
    offer = reject_offer(user, offer_id)
    return data_response(offer_for_owner(offer))


@bp.post("/offers/<offer_id>/withdraw")
def withdraw(offer_id: str):
    user = current_user()
    offer = withdraw_offer(user, offer_id)
    return data_response(offer_for_collector(offer))
