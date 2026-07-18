from __future__ import annotations

from decimal import Decimal

from flask import Blueprint, request

from app.errors import ApiError, ResourceNotFound
from app.extensions import db
from app.models import CollectionPoint, PlasticLot
from app.permissions import current_user
from app.routes.helpers import data_response, load_payload, paginated_response
from app.schemas import PublishLotSchema
from app.services.listing_payments import create_listing_payment, get_listing_payment
from app.services.payment_provider import checkout_payload, get_payment_provider
from app.services.serializers import listing_payment_record, lot_for_collector, lot_for_owner
from app.services.subscriptions import can_publish_listing
from app.services.workflows import (
    ensure_lot_owner,
    ensure_owner,
    get_or_404,
    material_from_code_or_id,
    notify_matching_demand_alerts,
    positive_decimal,
    publish_lot,
    withdraw_lot,
)

bp = Blueprint("lots", __name__, url_prefix="/lots")


def serialize_for(user, lot: PlasticLot) -> dict:
    return lot_for_owner(lot) if user.role == "owner" else lot_for_collector(lot)


@bp.get("")
def list_lots():
    user = current_user()
    query = PlasticLot.query
    if user.role == "owner":
        query = query.filter_by(owner_id=user.id)
    else:
        query = query.filter(PlasticLot.status.in_(["available", "published", "reserved", "pickup_scheduled"]))

    status = request.args.get("status")
    if status:
        if status in {"published", "ready"}:
            query = query.filter(PlasticLot.status.in_(["available", "published"]))
        else:
            query = query.filter(PlasticLot.status == status)
    material = request.args.get("material")
    if material and material != "All":
        query = query.join(PlasticLot.material).filter_by(code=material.upper())
    collection_point_id = request.args.get("collection_point_id")
    if collection_point_id:
        query = query.filter_by(collection_point_id=collection_point_id)
    minimum_weight = request.args.get("minimum_weight")
    if minimum_weight:
        query = query.filter(PlasticLot.estimated_weight_kg >= Decimal(str(minimum_weight)))
    sort = request.args.get("sort", "newest")
    if sort == "price_low_to_high":
        query = query.order_by(PlasticLot.price_per_kg.asc())
    elif sort == "price_high_to_low":
        query = query.order_by(PlasticLot.price_per_kg.desc())
    elif sort == "weight_high_to_low":
        query = query.order_by(PlasticLot.estimated_weight_kg.desc())
    else:
        query = query.order_by(PlasticLot.created_at.desc())
    return paginated_response(query, lambda lot: serialize_for(user, lot), default_per_page=50)


@bp.post("")
def create_lot():
    user = current_user()
    ensure_owner(user)
    payload = load_payload(PublishLotSchema())
    if payload.get("status") == "draft":
        point = get_or_404(CollectionPoint, payload.get("collection_point_id", ""), "The requested collection point was not found.")
        if point.owner_id != user.id:
            raise ResourceNotFound("The requested collection point was not found.")
        material = material_from_code_or_id(payload.get("material") or payload.get("material_id"))
        if not material:
            raise ApiError("validation_error", "A valid material is required.", 400)
        lot = PlasticLot(
            owner=user,
            collection_point=point,
            material=material,
            title=payload.get("title") or f"Draft {material.code} lot",
            description=payload.get("description") or "",
            estimated_weight_kg=positive_decimal(payload.get("quantity_kg"), "quantity_kg"),
            minimum_weight_kg=Decimal("1"),
            price_per_kg=positive_decimal(payload.get("pricePerKg") or payload.get("price_per_kg"), "pricePerKg"),
            status="draft",
            payment_required=True,
        )
        db.session.add(lot)
        db.session.commit()
        return data_response(lot_for_owner(lot), 201)
    lot = publish_lot(user, payload)
    return data_response({"lot": lot_for_owner(lot), "snapshot": lot_for_owner(lot)}, 201)


@bp.get("/<lot_id>")
def get_lot(lot_id: str):
    user = current_user()
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    if user.role == "owner" and lot.owner_id != user.id:
        raise ResourceNotFound("The requested lot was not found.")
    if user.role == "collector":
        lot.views += 1
        db.session.commit()
    return data_response(serialize_for(user, lot))


@bp.patch("/<lot_id>")
def update_lot(lot_id: str):
    user = current_user()
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    ensure_lot_owner(user, lot)
    payload = request.get_json() or {}
    if payload.get("pricePerKg") is not None or payload.get("price_per_kg") is not None:
        lot.price_per_kg = positive_decimal(payload.get("pricePerKg") or payload.get("price_per_kg"), "pricePerKg")
    if payload.get("quantityKg") is not None or payload.get("quantity_kg") is not None:
        lot.estimated_weight_kg = positive_decimal(payload.get("quantityKg") or payload.get("quantity_kg"), "quantityKg")
    for key in ["title", "description", "quality_grade"]:
        if key in payload:
            setattr(lot, key, payload[key])
    db.session.commit()
    return data_response(lot_for_owner(lot))


@bp.delete("/<lot_id>")
def delete_lot(lot_id: str):
    user = current_user()
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    ensure_lot_owner(user, lot)
    if lot.status in {"completed", "collected"}:
        raise ApiError("invalid_status_transition", "Completed lots cannot be deleted.", 422)
    lot.status = "withdrawn"
    db.session.commit()
    return data_response({"deleted": True})


@bp.post("/<lot_id>/publish")
def publish_existing_lot(lot_id: str):
    user = current_user()
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    ensure_lot_owner(user, lot)
    if lot.status not in {"draft", "withdrawn", "payment_pending"}:
        raise ApiError("invalid_status_transition", "Only draft or withdrawn lots can be published.", 422)
    if lot.estimated_weight_kg <= 0 or lot.price_per_kg <= 0:
        raise ApiError("validation_error", "A positive weight and price are required.", 400)
    eligibility = can_publish_listing(user, lot)
    if not eligibility["allowed"]:
        lot.status = "payment_pending"
        lot.payment_required = True
        db.session.commit()
        payment = create_listing_payment(user, lot)
        db.session.commit()
        return data_response(
            {
                "lot": lot_for_owner(lot),
                "requiresPayment": True,
                "payment": listing_payment_record(payment),
                "package": eligibility["package"].code,
            },
            402,
        )
    lot.status = "published"
    lot.payment_required = False
    lot.publication_source = eligibility["source"]
    lot.published_at = lot.published_at or lot.created_at
    notify_matching_demand_alerts(lot)
    db.session.commit()
    return data_response(lot_for_owner(lot))


@bp.post("/<lot_id>/payment/checkout")
def create_listing_payment_checkout(lot_id: str):
    user = current_user()
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    ensure_lot_owner(user, lot)
    payment = create_listing_payment(user, lot)
    provider = get_payment_provider(payment.provider)
    checkout = provider.create_one_time_checkout(
        {
            **checkout_payload(
                seller_id=user.id,
                package_code=payment.package.code,
                amount=payment.amount,
                currency=payment.currency,
                resource_id=lot.id,
            ),
            "listing_payment_id": payment.id,
        }
    )
    payment.provider = checkout.provider
    payment.provider_payment_id = checkout.provider_reference
    db.session.commit()
    return data_response({"checkoutUrl": checkout.checkout_url, "payment": listing_payment_record(payment)}, 201)


@bp.get("/<lot_id>/payment")
def get_listing_payment_status(lot_id: str):
    user = current_user()
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    ensure_lot_owner(user, lot)
    return data_response({"payment": listing_payment_record(get_listing_payment(user, lot))})


@bp.post("/<lot_id>/withdraw")
def withdraw_existing_lot(lot_id: str):
    user = current_user()
    lot = withdraw_lot(user, lot_id)
    return data_response(lot_for_owner(lot))
