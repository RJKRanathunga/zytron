from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from werkzeug.security import check_password_hash

from app.constants import ACTIVE_RESERVATION_STATUSES
from app.errors import ApiError, Conflict, InvalidState, PermissionDenied, ResourceNotFound
from app.extensions import db
from app.models import (
    BinCompartment,
    CollectionPoint,
    CollectorOffer,
    DemandAlert,
    DeviceAlert,
    Message,
    MessageThread,
    Notification,
    Pickup,
    PlasticLot,
    PlasticMaterial,
    Reservation,
    RoutePlan,
    RouteStop,
    SavedCollectionPoint,
    SmartBin,
    Transaction,
    User,
)
from app.models.base import new_id, utc_now
from app.services.serializers import (
    as_float,
    collector_snapshot,
    owner_snapshot,
)


def snapshot_for(user: User) -> dict:
    if user.role == "collector":
        return collector_snapshot(user)
    if user.role == "owner":
        return owner_snapshot(user)
    return {"user": {"id": user.id, "email": user.email, "role": user.role}}


def get_or_404(model, object_id: str, message: str = "The requested resource was not found."):
    record = db.session.get(model, object_id)
    if not record:
        raise ResourceNotFound(message)
    return record


def decimal_value(value, default: Decimal | None = None) -> Decimal | None:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def positive_decimal(value, field_name: str) -> Decimal:
    number = decimal_value(value)
    if number is None or number <= 0:
        raise ApiError("validation_error", f"{field_name} must be greater than zero.", 400, {field_name: ["Must be greater than zero."]})
    return number


def material_from_code_or_id(value: str | None) -> PlasticMaterial | None:
    if not value or value == "All":
        return None
    return PlasticMaterial.query.filter(
        (PlasticMaterial.id == value) | (PlasticMaterial.code == value.upper())
    ).first()


def ensure_collector(user: User):
    if user.role != "collector":
        raise PermissionDenied("A collector account is required.")


def ensure_owner(user: User):
    if user.role != "owner":
        raise PermissionDenied("An owner account is required.")


def ensure_lot_owner(user: User, lot: PlasticLot):
    ensure_owner(user)
    if lot.owner_id != user.id:
        raise ResourceNotFound("The requested lot was not found.")


def ensure_pickup_participant(user: User, pickup: Pickup):
    if user.id not in {pickup.owner_id, pickup.collector_id}:
        raise ResourceNotFound("The requested pickup was not found.")


def ensure_thread_participant(user: User, thread: MessageThread):
    if user.id not in {thread.owner_id, thread.collector_id}:
        raise ResourceNotFound("The requested message thread was not found.")


def create_notification(user_id: str, note_type: str, title: str, message: str, resource_type: str | None = None, resource_id: str | None = None):
    note = Notification(
        user_id=user_id,
        type=note_type,
        title=title,
        message=message,
        resource_type=resource_type,
        resource_id=resource_id,
    )
    db.session.add(note)
    return note


def thread_for_lot(lot: PlasticLot, collector_id: str, pickup_id: str | None = None) -> MessageThread:
    thread = MessageThread.query.filter_by(lot_id=lot.id, owner_id=lot.owner_id, collector_id=collector_id).first()
    if thread:
        if pickup_id and not thread.pickup_id:
            thread.pickup_id = pickup_id
        return thread
    thread = MessageThread(lot_id=lot.id, pickup_id=pickup_id, owner_id=lot.owner_id, collector_id=collector_id)
    db.session.add(thread)
    return thread


def active_reservation_for_lot(lot_id: str) -> Reservation | None:
    return Reservation.query.filter(
        Reservation.lot_id == lot_id,
        Reservation.status.in_(ACTIVE_RESERVATION_STATUSES),
    ).first()


def qr_code_for(lot: PlasticLot, collector: User) -> str:
    return f"{collector.initials}-{lot.material.code}-{uuid4().hex[:6].upper()}"


def create_or_update_pickup(
    *,
    lot: PlasticLot,
    collector: User,
    reservation: Reservation | None,
    date_label: str,
    time_window: str,
    status: str,
    price_per_kg: Decimal | None = None,
) -> Pickup:
    pickup = Pickup.query.filter_by(lot_id=lot.id, collector_id=collector.id).filter(Pickup.status != "cancelled").first()
    price = price_per_kg or lot.price_per_kg
    total = lot.estimated_weight_kg * price
    if not pickup:
        pickup = Pickup(
            lot=lot,
            reservation=reservation,
            collector_id=collector.id,
            owner_id=lot.owner_id,
            collection_point_id=lot.collection_point_id,
            date_label=date_label,
            time_window=time_window,
            estimated_weight_kg=lot.estimated_weight_kg,
            price_per_kg=price,
            total_amount=total,
            status=status,
            progress_percent=25 if status == "scheduled" else 10,
            qr_code=qr_code_for(lot, collector),
        )
        db.session.add(pickup)
    else:
        pickup.reservation = reservation or pickup.reservation
        pickup.date_label = date_label or pickup.date_label
        pickup.time_window = time_window or pickup.time_window
        pickup.status = status
        pickup.progress_percent = max(pickup.progress_percent, 25 if status == "scheduled" else 10)
        pickup.price_per_kg = price
        pickup.total_amount = total
    return pickup


def create_or_update_transaction(pickup: Pickup, status: str = "pending") -> Transaction:
    subtotal = (pickup.verified_weight_kg or pickup.estimated_weight_kg) * pickup.price_per_kg
    transaction = Transaction.query.filter_by(pickup_id=pickup.id).first()
    if not transaction:
        transaction = Transaction(
            pickup=pickup,
            lot_id=pickup.lot_id,
            collector_id=pickup.collector_id,
            owner_id=pickup.owner_id,
            subtotal=subtotal,
            platform_fee=Decimal("0"),
            total_amount=subtotal,
            payment_method="Wallet release after handover",
            payment_status=status,
            title=f"{pickup.lot.material.code} pickup at {pickup.collection_point.name}",
        )
        db.session.add(transaction)
    else:
        transaction.subtotal = subtotal
        transaction.total_amount = subtotal + transaction.platform_fee
        transaction.payment_status = status
    return transaction


def create_reservation(user: User, lot_id: str, payload: dict) -> Reservation:
    ensure_collector(user)
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    if lot.status != "available":
        raise Conflict("lot_not_available", "This lot is no longer available.")
    if active_reservation_for_lot(lot.id):
        raise Conflict("reservation_conflict", "This lot already has an active reservation.")

    date_label = payload.get("pickupDate") or payload.get("date") or "Flexible date"
    time_window = payload.get("timeWindow") or payload.get("pickup_window") or "Flexible pickup"
    reservation = Reservation(
        lot=lot,
        collector=user,
        owner_id=lot.owner_id,
        status="pending",
        requested_date=date_label,
        requested_window=time_window,
    )
    db.session.add(reservation)
    lot.status = "reserved"
    lot.reserved_at = utc_now()
    pickup = create_or_update_pickup(lot=lot, collector=user, reservation=reservation, date_label=date_label, time_window=time_window, status="requested")
    thread_for_lot(lot, user.id, pickup.id)
    create_notification(lot.owner_id, "pickup", "Reservation requested", f"{user.organization.name if user.organization else user.display_name} requested {lot.title}.", "reservation", reservation.id)
    create_notification(user.id, "supply", "Reservation requested", f"{lot.title} is awaiting owner confirmation.", "lot", lot.id)
    db.session.commit()
    return reservation


def cancel_reservation(user: User, reservation_id: str) -> Reservation:
    reservation = get_or_404(Reservation, reservation_id, "The requested reservation was not found.")
    if user.id not in {reservation.collector_id, reservation.owner_id}:
        raise ResourceNotFound("The requested reservation was not found.")
    if reservation.status in {"completed", "cancelled", "expired"}:
        raise InvalidState("This reservation can no longer be cancelled.")
    reservation.status = "cancelled"
    reservation.cancelled_at = utc_now()
    if reservation.lot.status in {"reserved", "pickup_scheduled"}:
        reservation.lot.status = "available"
        reservation.lot.reserved_at = None
    for pickup in reservation.pickups:
        if pickup.status != "completed":
            pickup.status = "cancelled"
            pickup.progress_percent = 0
    create_notification(reservation.owner_id if user.id == reservation.collector_id else reservation.collector_id, "pickup", "Reservation cancelled", f"The reservation for {reservation.lot.title} was cancelled.", "reservation", reservation.id)
    db.session.commit()
    return reservation


def submit_offer(user: User, lot_id: str, payload: dict) -> CollectorOffer:
    ensure_collector(user)
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    if lot.status != "available":
        raise Conflict("lot_not_available", "This lot is no longer accepting offers.")
    existing = CollectorOffer.query.filter_by(lot_id=lot.id, collector_id=user.id, status="pending").first()
    if existing:
        raise Conflict("offer_already_exists", "You already have a pending offer for this lot.")
    price = positive_decimal(payload.get("pricePerKg") or payload.get("offered_price_per_kg") or lot.price_per_kg, "pricePerKg")
    offer = CollectorOffer(
        lot=lot,
        collector=user,
        offered_price_per_kg=price,
        pickup_window=payload.get("pickupWindow") or payload.get("pickup_window") or "Flexible pickup",
        message=payload.get("message") or "",
        status="pending",
    )
    db.session.add(offer)
    thread_for_lot(lot, user.id)
    create_notification(lot.owner_id, "offer", "New collector offer", f"{user.organization.name if user.organization else user.display_name} offered Rs. {price} per kg for {lot.title}.", "offer", offer.id)
    db.session.commit()
    return offer


def accept_offer(user: User, offer_id: str, payload: dict) -> CollectorOffer:
    offer = get_or_404(CollectorOffer, offer_id, "The requested offer was not found.")
    ensure_lot_owner(user, offer.lot)
    if offer.status != "pending":
        raise InvalidState("This offer has already been resolved.")
    if offer.lot.status not in {"available", "reserved"}:
        raise Conflict("lot_not_available", "This lot can no longer be assigned.")

    date_label = payload.get("pickupDate") or payload.get("date") or "Scheduled"
    time_window = payload.get("timeWindow") or payload.get("pickup_window") or offer.pickup_window or "Flexible pickup"
    offer.status = "accepted"
    offer.responded_at = utc_now()
    for competing in CollectorOffer.query.filter(CollectorOffer.lot_id == offer.lot_id, CollectorOffer.id != offer.id, CollectorOffer.status == "pending"):
        competing.status = "rejected"
        competing.responded_at = utc_now()

    reservation = active_reservation_for_lot(offer.lot_id)
    if not reservation or reservation.collector_id != offer.collector_id:
        reservation = Reservation(
            lot=offer.lot,
            collector=offer.collector,
            owner=user,
            status="confirmed",
            requested_date=date_label,
            requested_window=time_window,
            confirmed_at=utc_now(),
        )
        db.session.add(reservation)
    else:
        reservation.status = "confirmed"
        reservation.confirmed_at = utc_now()

    lot = offer.lot
    lot.status = "reserved"
    lot.reserved_at = utc_now()
    pickup = create_or_update_pickup(
        lot=lot,
        collector=offer.collector,
        reservation=reservation,
        date_label=date_label,
        time_window=time_window,
        status="scheduled",
        price_per_kg=offer.offered_price_per_kg,
    )
    create_or_update_transaction(pickup, "pending")
    thread_for_lot(lot, offer.collector_id, pickup.id)
    create_notification(offer.collector_id, "pickup", "Offer accepted", f"{lot.title} is scheduled for {date_label}, {time_window}.", "pickup", pickup.id)
    create_notification(user.id, "pickup", "Pickup scheduled", f"{offer.collector.organization.name if offer.collector.organization else offer.collector.display_name} is scheduled for {date_label}.", "pickup", pickup.id)
    db.session.commit()
    return offer


def reject_offer(user: User, offer_id: str) -> CollectorOffer:
    offer = get_or_404(CollectorOffer, offer_id, "The requested offer was not found.")
    ensure_lot_owner(user, offer.lot)
    if offer.status != "pending":
        raise InvalidState("This offer has already been resolved.")
    offer.status = "rejected"
    offer.responded_at = utc_now()
    create_notification(offer.collector_id, "supply", "Offer declined", f"Your offer for {offer.lot.title} was declined.", "offer", offer.id)
    db.session.commit()
    return offer


def withdraw_offer(user: User, offer_id: str) -> CollectorOffer:
    ensure_collector(user)
    offer = get_or_404(CollectorOffer, offer_id, "The requested offer was not found.")
    if offer.collector_id != user.id:
        raise ResourceNotFound("The requested offer was not found.")
    if offer.status != "pending":
        raise InvalidState("Only pending offers can be withdrawn.")
    offer.status = "withdrawn"
    offer.responded_at = utc_now()
    db.session.commit()
    return offer


def publish_lot(user: User, payload: dict) -> PlasticLot:
    ensure_owner(user)
    bin_id = payload.get("binId") or payload.get("bin_id")
    compartment_id = payload.get("compartmentId") or payload.get("compartment_id")
    compartment: BinCompartment | None = None
    point: CollectionPoint | None = None

    if compartment_id:
        compartment = get_or_404(BinCompartment, compartment_id, "The requested compartment was not found.")
        point = compartment.smart_bin.collection_point
    elif bin_id:
        smart_bin = get_or_404(SmartBin, bin_id, "The requested bin was not found.")
        point = smart_bin.collection_point
        compartment = (
            BinCompartment.query.filter_by(smart_bin_id=smart_bin.id, status="ready").order_by(BinCompartment.current_weight_kg.desc()).first()
            or BinCompartment.query.filter_by(smart_bin_id=smart_bin.id).order_by(BinCompartment.current_weight_kg.desc()).first()
        )
    elif payload.get("collection_point_id"):
        point = get_or_404(CollectionPoint, payload["collection_point_id"], "The requested collection point was not found.")

    if not point or point.owner_id != user.id:
        raise ResourceNotFound("The requested collection inventory was not found.")
    if compartment and compartment.current_weight_kg <= 0:
        raise ApiError("insufficient_inventory", "This compartment does not have plastic to publish.", 400)

    existing_active = None
    if compartment:
        existing_active = PlasticLot.query.filter(
            PlasticLot.source_compartment_id == compartment.id,
            PlasticLot.status.in_(["available", "reserved", "pickup_scheduled"]),
        ).first()
    if existing_active:
        raise Conflict("inventory_already_published", "This compartment already has an active lot.")

    material = material_from_code_or_id(payload.get("material_id") or payload.get("material"))
    if not material and compartment:
        material = compartment.material
    if not material:
        raise ApiError("validation_error", "A valid material is required.", 400, {"material": ["Unknown material."]})

    quantity = decimal_value(payload.get("quantity_kg"), compartment.current_weight_kg if compartment else None)
    if quantity is None:
        raise ApiError("validation_error", "A positive quantity is required.", 400, {"quantity_kg": ["Missing data for required field."]})
    quantity = positive_decimal(quantity, "quantity_kg")
    price = positive_decimal(payload.get("pricePerKg") or payload.get("price_per_kg"), "pricePerKg")
    if compartment and quantity > compartment.current_weight_kg:
        raise ApiError("insufficient_inventory", "Published weight cannot exceed available compartment weight.", 400)

    pickup_window = payload.get("pickupWindow") or payload.get("pickup_window") or "Flexible pickup"
    title = payload.get("title") or f"{quantity.normalize()} kg {material.code}"
    lot = PlasticLot(
        owner=user,
        collection_point=point,
        material=material,
        source_compartment=compartment,
        title=title,
        description=payload.get("description") or f"{title} from {point.name}",
        estimated_weight_kg=quantity,
        minimum_weight_kg=Decimal("1"),
        price_per_kg=price,
        quality_grade=payload.get("quality_grade") or "Verified sorted plastic",
        availability_start=utc_now(),
        status="available",
        published_at=utc_now(),
        fill_level=int(min(100, max(0, as_float(compartment.fill_percentage) if compartment else 80))),
        demand_score=90,
    )
    if pickup_window:
        lot.description = f"{lot.description}\nPickup window: {pickup_window}"
    db.session.add(lot)
    if compartment:
        compartment.status = "reserved"
    notify_matching_demand_alerts(lot)
    create_notification(user.id, "bin", "Lot published", f"{lot.title} is now visible to collectors.", "lot", lot.id)
    db.session.commit()
    return lot


def notify_matching_demand_alerts(lot: PlasticLot):
    query = DemandAlert.query.filter_by(is_active=True)
    for alert in query:
        if alert.material_id and alert.material_id != lot.material_id:
            continue
        if lot.estimated_weight_kg < alert.minimum_weight_kg:
            continue
        if alert.maximum_price_per_kg and lot.price_per_kg > alert.maximum_price_per_kg:
            continue
        if alert.district and lot.collection_point.district and alert.district.lower() != lot.collection_point.district.lower():
            continue
        alert.last_triggered_at = utc_now()
        create_notification(alert.collector_id, "supply", "Demand alert match", f"{lot.title} at {lot.collection_point.name} matches {alert.name}.", "lot", lot.id)


def withdraw_lot(user: User, lot_id: str) -> PlasticLot:
    lot = get_or_404(PlasticLot, lot_id, "The requested lot was not found.")
    ensure_lot_owner(user, lot)
    if lot.status in {"completed", "collected"}:
        raise InvalidState("Completed lots cannot be withdrawn.")
    if lot.status in {"reserved", "pickup_scheduled"}:
        raise InvalidState("Reserved lots cannot be withdrawn until the reservation is cancelled.")
    lot.status = "withdrawn"
    if lot.source_compartment:
        lot.source_compartment.status = "ready"
    create_notification(user.id, "bin", "Lot withdrawn", f"{lot.title} was withdrawn from the marketplace.", "lot", lot.id)
    db.session.commit()
    return lot


def save_route(user: User, payload: dict) -> RoutePlan:
    ensure_collector(user)
    lot_ids = payload.get("lotIds") or payload.get("lot_ids") or []
    route = RoutePlan.query.filter_by(collector_id=user.id).order_by(RoutePlan.updated_at.desc()).first()
    if not route:
        route = RoutePlan(collector=user, name=payload.get("name") or "Collector route", route_date=payload.get("date") or "Flexible date")
        db.session.add(route)
        db.session.flush()
    route.name = payload.get("name") or route.name
    route.route_date = payload.get("date") or route.route_date
    route.status = "draft"
    RouteStop.query.filter_by(route_plan_id=route.id).delete()

    total_weight = Decimal("0")
    total_cost = Decimal("0")
    route_locations = []
    for index, lot_id in enumerate(lot_ids, start=1):
        lot = get_or_404(PlasticLot, lot_id, "A route lot could not be found.")
        if lot.status not in {"available", "reserved", "pickup_scheduled"}:
            raise InvalidState("Only active lots can be added to a route.")
        total_weight += lot.estimated_weight_kg
        total_cost += lot.estimated_weight_kg * lot.price_per_kg
        route_locations.append({"lat": as_float(lot.collection_point.latitude), "lng": as_float(lot.collection_point.longitude)})
        db.session.add(
            RouteStop(
                route_plan=route,
                lot=lot,
                collection_point_id=lot.collection_point_id,
                stop_order=index,
                estimated_arrival_at="",
            )
        )

    route.estimated_total_weight_kg = total_weight
    route.estimated_total_cost = total_cost
    route.estimated_distance_km = Decimal("0")
    route.estimated_duration_minutes = 0
    if route_locations:
        from app.errors import ApiError
        from app.services.google_maps import compute_route

        try:
            estimate = compute_route(route_locations[0], route_locations[1:] or route_locations[:1])
        except ApiError:
            estimate = None
        if estimate:
            route.estimated_distance_km = Decimal(str(estimate["distanceKm"]))
            route.estimated_duration_minutes = estimate["durationMinutes"]
    create_notification(user.id, "route", "Route saved", f"{len(lot_ids)} stops were saved for {route.route_date}.", "route", route.id)
    db.session.commit()
    return route


def remove_route_stop(user: User, route_id: str, stop_id: str) -> RoutePlan:
    ensure_collector(user)
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    stop = RouteStop.query.filter_by(route_plan_id=route.id, id=stop_id).first()
    if not stop:
        stop = RouteStop.query.filter_by(route_plan_id=route.id, lot_id=stop_id).first()
    if not stop:
        raise ResourceNotFound("The requested route stop was not found.")
    db.session.delete(stop)
    db.session.flush()
    for index, remaining in enumerate(route.stops, start=1):
        remaining.stop_order = index
    save_route(user, {"lot_ids": [remaining.lot_id for remaining in route.stops], "date": route.route_date, "name": route.name})
    return route


def start_route(user: User, route_id: str) -> RoutePlan:
    ensure_collector(user)
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    if route.status == "completed":
        raise InvalidState("Completed routes cannot be restarted.")
    route.status = "active"
    db.session.commit()
    return route


def complete_route(user: User, route_id: str) -> RoutePlan:
    ensure_collector(user)
    route = get_or_404(RoutePlan, route_id, "The requested route was not found.")
    if route.collector_id != user.id:
        raise ResourceNotFound("The requested route was not found.")
    route.status = "completed"
    for stop in route.stops:
        stop.status = "completed"
    db.session.commit()
    return route


def toggle_saved_point(user: User, point_id: str) -> bool:
    ensure_collector(user)
    get_or_404(CollectionPoint, point_id, "The requested collection point was not found.")
    saved = db.session.get(SavedCollectionPoint, (user.id, point_id))
    if saved:
        db.session.delete(saved)
        db.session.commit()
        return False
    db.session.add(SavedCollectionPoint(collector_id=user.id, collection_point_id=point_id))
    db.session.commit()
    return True


def create_demand_alert(user: User, payload: dict) -> DemandAlert:
    ensure_collector(user)
    material = material_from_code_or_id(payload.get("material"))
    label = payload.get("label") or payload.get("name") or f"{payload.get('material') or 'Any'} demand"
    alert = DemandAlert(
        collector=user,
        name=label,
        material=material,
        minimum_weight_kg=decimal_value(payload.get("minimum_weight_kg"), decimal_value(payload.get("minimumKg"), Decimal("1"))),
        maximum_distance_km=decimal_value(payload.get("maximum_distance_km"), decimal_value(payload.get("radiusKm"), Decimal("15"))),
        maximum_price_per_kg=decimal_value(payload.get("maxPricePerKg")),
        ready_window=payload.get("readyWindow") or "Ready within 48 hours",
        is_active=bool(payload.get("is_active", True)),
    )
    db.session.add(alert)
    db.session.commit()
    return alert


def update_demand_alert(user: User, alert_id: str, payload: dict) -> DemandAlert:
    ensure_collector(user)
    alert = get_or_404(DemandAlert, alert_id, "The requested demand alert was not found.")
    if alert.collector_id != user.id:
        raise ResourceNotFound("The requested demand alert was not found.")
    if payload.get("label") or payload.get("name"):
        alert.name = payload.get("label") or payload.get("name")
    if "material" in payload:
        alert.material = material_from_code_or_id(payload.get("material"))
    if payload.get("minimumKg") is not None:
        alert.minimum_weight_kg = decimal_value(payload["minimumKg"])
    if payload.get("radiusKm") is not None:
        alert.maximum_distance_km = decimal_value(payload["radiusKm"])
    if "maxPricePerKg" in payload:
        alert.maximum_price_per_kg = decimal_value(payload.get("maxPricePerKg"))
    if payload.get("readyWindow"):
        alert.ready_window = payload["readyWindow"]
    if "is_active" in payload:
        alert.is_active = bool(payload["is_active"])
    db.session.commit()
    return alert


def delete_demand_alert(user: User, alert_id: str):
    ensure_collector(user)
    alert = get_or_404(DemandAlert, alert_id, "The requested demand alert was not found.")
    if alert.collector_id != user.id:
        raise ResourceNotFound("The requested demand alert was not found.")
    db.session.delete(alert)
    db.session.commit()


def update_pickup_progress(user: User, pickup_id: str) -> Pickup:
    pickup = get_or_404(Pickup, pickup_id, "The requested pickup was not found.")
    ensure_pickup_participant(user, pickup)
    if pickup.status == "completed":
        raise InvalidState("Completed pickups cannot be advanced.")
    transitions = {
        "requested": ("scheduled", 25),
        "scheduled": ("collector_en_route", 55),
        "collector_en_route": ("arrived", 72),
        "arrived": ("weighing", 88),
        "weighing": ("weighing", 92),
    }
    pickup.status, pickup.progress_percent = transitions.get(pickup.status, (pickup.status, min(90, pickup.progress_percent + 15)))
    db.session.commit()
    return pickup


def schedule_pickup(user: User, pickup_id: str, payload: dict) -> Pickup:
    pickup = get_or_404(Pickup, pickup_id, "The requested pickup was not found.")
    ensure_pickup_participant(user, pickup)
    if pickup.status in {"completed", "cancelled"}:
        raise InvalidState("This pickup can no longer be scheduled.")
    pickup.date_label = payload.get("pickupDate") or payload.get("date") or pickup.date_label
    pickup.time_window = payload.get("timeWindow") or payload.get("pickup_window") or pickup.time_window
    pickup.status = "scheduled"
    pickup.progress_percent = max(pickup.progress_percent, 25)
    db.session.commit()
    return pickup


def cancel_pickup(user: User, pickup_id: str) -> Pickup:
    pickup = get_or_404(Pickup, pickup_id, "The requested pickup was not found.")
    ensure_pickup_participant(user, pickup)
    if pickup.status == "completed":
        raise InvalidState("Completed pickups cannot be cancelled.")
    pickup.status = "cancelled"
    pickup.progress_percent = 0
    if pickup.reservation and pickup.reservation.status in {"pending", "confirmed"}:
        pickup.reservation.status = "cancelled"
        pickup.reservation.cancelled_at = utc_now()
    if pickup.lot.status in {"reserved", "pickup_scheduled"}:
        pickup.lot.status = "available"
        pickup.lot.reserved_at = None
    create_notification(pickup.owner_id if user.id == pickup.collector_id else pickup.collector_id, "pickup", "Pickup cancelled", f"The pickup for {pickup.lot.title} was cancelled.", "pickup", pickup.id)
    db.session.commit()
    return pickup


def verify_pickup_weight(user: User, pickup_id: str, payload: dict) -> Pickup:
    pickup = get_or_404(Pickup, pickup_id, "The requested pickup was not found.")
    ensure_pickup_participant(user, pickup)
    if pickup.status in {"completed", "cancelled"}:
        raise InvalidState("This pickup cannot be weighed.")
    weight = positive_decimal(payload.get("verifiedWeightKg") or payload.get("verified_weight_kg") or pickup.estimated_weight_kg, "verifiedWeightKg")
    pickup.verified_weight_kg = weight
    pickup.total_amount = weight * pickup.price_per_kg
    pickup.status = "weighing"
    pickup.progress_percent = 92
    db.session.commit()
    return pickup


def complete_pickup(user: User, pickup_id: str) -> Pickup:
    pickup = get_or_404(Pickup, pickup_id, "The requested pickup was not found.")
    ensure_pickup_participant(user, pickup)
    if pickup.status == "completed":
        raise InvalidState("This pickup is already completed.")
    if pickup.status == "cancelled":
        raise InvalidState("Cancelled pickups cannot be completed.")
    weight = pickup.verified_weight_kg or pickup.estimated_weight_kg
    pickup.verified_weight_kg = weight
    pickup.total_amount = weight * pickup.price_per_kg
    pickup.status = "completed"
    pickup.progress_percent = 100
    pickup.actual_completion_at = utc_now()
    pickup.lot.status = "completed"
    pickup.lot.completed_at = utc_now()
    if pickup.reservation:
        pickup.reservation.status = "completed"
    if pickup.lot.source_compartment:
        compartment = pickup.lot.source_compartment
        compartment.current_weight_kg = max(Decimal("0"), compartment.current_weight_kg - weight)
        compartment.fill_percentage = Decimal("0") if compartment.capacity_kg <= 0 else max(Decimal("0"), min(Decimal("100"), (compartment.current_weight_kg / compartment.capacity_kg) * 100))
        compartment.status = "growing"
        compartment.last_updated_at = utc_now()
    transaction = create_or_update_transaction(pickup, "paid")
    transaction.paid_at = utc_now()
    create_notification(pickup.owner_id, "payment", "Pickup completed", f"{pickup.lot.title} was completed and Rs. {int(transaction.total_amount)} was posted.", "pickup", pickup.id)
    create_notification(pickup.collector_id, "payment", "Pickup completed", f"{pickup.lot.title} was completed.", "pickup", pickup.id)
    db.session.commit()
    return pickup


def send_message(user: User, thread_id: str, body: str) -> Message:
    thread = get_or_404(MessageThread, thread_id, "The requested message thread was not found.")
    ensure_thread_participant(user, thread)
    recipient_id = thread.owner_id if user.id == thread.collector_id else thread.collector_id
    message = Message(thread=thread, sender_id=user.id, recipient_id=recipient_id, body=body.strip())
    thread.updated_at = utc_now()
    db.session.add(message)
    create_notification(recipient_id, "message", "New message", body.strip()[:160], "message_thread", thread.id)
    db.session.commit()
    return message


def mark_notification_read(user: User, notification_id: str) -> Notification:
    note = get_or_404(Notification, notification_id, "The requested notification was not found.")
    if note.user_id != user.id:
        raise ResourceNotFound("The requested notification was not found.")
    note.is_read = True
    note.read_at = utc_now()
    db.session.commit()
    return note


def mark_all_notifications_read(user: User):
    Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True, "read_at": utc_now()})
    db.session.commit()


def mark_message_read(user: User, message_id: str) -> Message:
    message = get_or_404(Message, message_id, "The requested message was not found.")
    if message.recipient_id != user.id:
        raise ResourceNotFound("The requested message was not found.")
    message.is_read = True
    message.read_at = utc_now()
    db.session.commit()
    return message


def mark_transaction_paid(user: User, transaction_id: str) -> Transaction:
    transaction = get_or_404(Transaction, transaction_id, "The requested transaction was not found.")
    if user.role != "admin" and user.id not in {transaction.owner_id, transaction.collector_id}:
        raise ResourceNotFound("The requested transaction was not found.")
    transaction.payment_status = "paid"
    transaction.paid_at = utc_now()
    db.session.commit()
    return transaction


def authenticate_device(payload: dict) -> SmartBin:
    device = SmartBin.query.filter_by(device_code=payload["device_code"]).first()
    if not device or not device.device_secret or not check_password_hash(device.device_secret, payload["device_secret"]):
        raise PermissionDenied("Device authentication failed.")
    return device


def record_device_heartbeat(payload: dict) -> SmartBin:
    device = authenticate_device(payload)
    device.status = payload.get("status") or device.status
    device.last_seen_at = utc_now()
    if payload.get("battery_percent") is not None:
        device.battery_percent = payload["battery_percent"]
    if payload.get("firmware_version"):
        device.firmware_version = payload["firmware_version"]
    db.session.commit()
    return device


def record_device_event(payload: dict) -> SmartBin:
    device = authenticate_device(payload)
    device.status = payload.get("status") or device.status
    device.last_seen_at = utc_now()
    for row in payload.get("compartments", []):
        compartment = BinCompartment.query.filter_by(id=row.get("id"), smart_bin_id=device.id).first()
        if not compartment:
            continue
        if row.get("current_weight_kg") is not None:
            compartment.current_weight_kg = decimal_value(row["current_weight_kg"], compartment.current_weight_kg)
        if row.get("fill_percentage") is not None:
            fill = decimal_value(row["fill_percentage"], compartment.fill_percentage)
            compartment.fill_percentage = max(Decimal("0"), min(Decimal("100"), fill))
        compartment.status = row.get("status") or ("ready" if compartment.fill_percentage >= compartment.threshold_percentage else "growing")
        compartment.last_updated_at = utc_now()
    for row in payload.get("alerts", []):
        db.session.add(
            DeviceAlert(
                smart_bin=device,
                severity=row.get("severity", "info"),
                alert_type=row.get("alert_type", "device"),
                title=row.get("title", "Device alert"),
                message=row.get("message", ""),
            )
        )
    db.session.commit()
    return device


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()
