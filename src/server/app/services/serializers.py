from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import or_

from app.models import (
    BinCompartment,
    CollectionPoint,
    CollectorOffer,
    DemandAlert,
    DeviceAlert,
    Dustbin,
    MessageThread,
    Notification,
    ListingPayment,
    Package,
    Pickup,
    PlasticLot,
    PaymentTransaction,
    Reservation,
    RoutePlan,
    SmartBin,
    Transaction,
    User,
    SellerSubscription,
)

def as_float(value) -> float:
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def money(value) -> int:
    return int(round(as_float(value)))


def initials(name: str) -> str:
    parts = [part[:1] for part in name.replace("-", " ").split() if part]
    return "".join(parts[:2]).upper() or name[:2].upper()


def iso(dt: datetime | None) -> str | None:
    if not dt:
        return None
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def package_record(package: Package) -> dict:
    return {
        "id": package.id,
        "code": package.code,
        "name": package.name,
        "description": package.description or "",
        "billingType": package.billing_type,
        "price": as_float(package.price),
        "currency": package.currency,
        "billingInterval": package.billing_interval,
        "listingLimit": package.listing_limit,
        "isActive": package.is_active,
        "createdAt": iso(package.created_at),
        "updatedAt": iso(package.updated_at),
    }


def subscription_record(subscription: SellerSubscription | None) -> dict | None:
    if not subscription:
        return None
    return {
        "id": subscription.id,
        "package": package_record(subscription.package),
        "status": subscription.status,
        "provider": subscription.provider,
        "startedAt": iso(subscription.started_at),
        "currentPeriodStart": iso(subscription.current_period_start),
        "currentPeriodEnd": iso(subscription.current_period_end),
        "cancelAtPeriodEnd": subscription.cancel_at_period_end,
        "cancelledAt": iso(subscription.cancelled_at),
        "createdAt": iso(subscription.created_at),
        "updatedAt": iso(subscription.updated_at),
    }


def listing_payment_record(payment: ListingPayment | None) -> dict | None:
    if not payment:
        return None
    return {
        "id": payment.id,
        "listingId": payment.listing_id,
        "package": package_record(payment.package),
        "amount": as_float(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "provider": payment.provider,
        "providerPaymentId": payment.provider_payment_id,
        "paidAt": iso(payment.paid_at),
        "createdAt": iso(payment.created_at),
        "updatedAt": iso(payment.updated_at),
    }


def payment_transaction_record(transaction: PaymentTransaction) -> dict:
    return {
        "id": transaction.id,
        "subscriptionId": transaction.subscription_id,
        "listingPaymentId": transaction.listing_payment_id,
        "transactionType": transaction.transaction_type,
        "amount": as_float(transaction.amount),
        "currency": transaction.currency,
        "status": transaction.status,
        "provider": transaction.provider,
        "providerReference": transaction.provider_reference,
        "metadata": transaction.metadata_json or {},
        "createdAt": iso(transaction.created_at),
        "updatedAt": iso(transaction.updated_at),
    }


def billing_record(summary: dict) -> dict:
    return {
        "currentPackage": package_record(summary["currentPackage"]) if summary.get("currentPackage") else None,
        "activeSubscription": subscription_record(summary.get("activeSubscription")),
        "publishedListingCount": summary["publishedListingCount"],
        "draftListingCount": summary["draftListingCount"],
        "pendingPaymentCount": summary["pendingPaymentCount"],
        "subscriptionHistory": [subscription_record(item) for item in summary["subscriptionHistory"]],
        "listingPayments": [listing_payment_record(item) for item in summary["listingPayments"]],
        "paymentHistory": [payment_transaction_record(item) for item in summary["paymentHistory"]],
    }


def collector_lot_status(lot: PlasticLot) -> str:
    if lot.status in {"reserved", "pickup_scheduled"}:
        return "reserved"
    if lot.status in {"completed", "collected", "cancelled", "withdrawn", "sold"}:
        return "sold"
    return "ready"


def owner_lot_status(lot: PlasticLot) -> str:
    if lot.status in {"available", "published", "pickup_scheduled"}:
        return "published"
    if lot.status in {"reserved"}:
        return "reserved"
    if lot.status in {"withdrawn", "cancelled"}:
        return "withdrawn"
    if lot.status == "payment_pending":
        return "payment_pending"
    return "draft"


def plastic_item_record(item) -> dict:
    return {
        "id": item.id,
        "plasticType": item.plastic_type,
        "customPlasticType": item.custom_plastic_type,
        "weight": as_float(item.weight),
        "weightUnit": item.weight_unit,
    }


def lot_plastic_breakdown(lot: PlasticLot) -> list[dict]:
    if lot.plastic_items:
        return [plastic_item_record(item) for item in lot.plastic_items]
    return [
        {
            "id": f"{lot.id}-legacy-material",
            "plasticType": lot.material.code,
            "customPlasticType": None,
            "weight": as_float(lot.estimated_weight_kg),
            "weightUnit": "kg",
        }
    ]


def lot_material_code(lot: PlasticLot) -> str:
    items = lot_plastic_breakdown(lot)
    if len(items) == 1 and items[0]["plasticType"] != "Other":
        return items[0]["plasticType"]
    return "MIXED"


def owner_offer_status(offer: CollectorOffer) -> str:
    return {"pending": "new", "accepted": "accepted", "rejected": "rejected"}.get(offer.status, "new")


def collector_pickup_status(pickup: Pickup) -> str:
    if pickup.status in {"scheduled", "collector_en_route", "arrived", "weighing"}:
        return "confirmed"
    if pickup.status in {"requested"}:
        return "awaiting"
    if pickup.status == "completed":
        return "completed"
    return "cancelled"


def owner_pickup_status(pickup: Pickup) -> str:
    if pickup.status in {"collector_en_route", "arrived", "weighing"}:
        return "in-progress"
    if pickup.status == "scheduled":
        return "scheduled"
    if pickup.status == "completed":
        return "completed"
    if pickup.status == "cancelled":
        return "cancelled"
    return "requested"


def collection_point_for_collector(point: CollectionPoint, user: User, saved_ids: set[str]) -> dict:
    material_codes = {
        comp.material.code
        for smart_bin in point.smart_bins
        for comp in smart_bin.compartments
        if comp.material and comp.material.is_active
    }
    return {
        "id": point.id,
        "name": point.name,
        "initials": initials(point.name),
        "district": point.district or point.city or "",
        "address": point.address,
        "latitude": as_float(point.latitude),
        "longitude": as_float(point.longitude),
        "distanceKm": None,
        "rating": as_float(point.rating),
        "handovers": point.handovers,
        "monthlyKg": round(sum(as_float(comp.current_weight_kg) for smart_bin in point.smart_bins for comp in smart_bin.compartments), 1),
        "reliabilityScore": point.reliability_score,
        "saved": point.id in saved_ids,
        "supportedMaterials": sorted(material_codes) or ["PP"],
        "accessNote": point.access_instructions or point.opening_hours or "",
    }


def collection_point_for_owner(point: CollectionPoint) -> dict:
    return {
        "id": point.id,
        "name": point.name,
        "address": point.address,
        "district": point.district or point.city or "",
        "accessWindow": point.opening_hours or "",
        "latitude": as_float(point.latitude),
        "longitude": as_float(point.longitude),
    }


def dustbin_for_owner(dustbin: Dustbin) -> dict:
    return {
        "id": dustbin.id,
        "name": dustbin.name,
        "code": dustbin.code,
        "locationAddress": dustbin.location_address,
        "latitude": as_float(dustbin.latitude),
        "longitude": as_float(dustbin.longitude),
        "supportedPlasticType": dustbin.supported_plastic_type,
        "description": dustbin.description or "",
        "isActive": dustbin.is_active,
        "createdAt": iso(dustbin.created_at),
        "updatedAt": iso(dustbin.updated_at),
    }


def lot_for_collector(lot: PlasticLot) -> dict:
    point = lot.collection_point
    return {
        "id": lot.id,
        "material": lot_material_code(lot),
        "title": lot.title,
        "collectionPointId": lot.collection_point_id,
        "quantityKg": as_float(lot.estimated_weight_kg),
        "totalWeightKg": as_float(lot.estimated_weight_kg),
        "weightUnit": "kg",
        "plasticItems": lot_plastic_breakdown(lot),
        "pricePerKg": as_float(lot.price_per_kg),
        "status": collector_lot_status(lot),
        "fillLevel": int(lot.fill_level),
        "readinessLabel": "Reserved" if lot.status == "reserved" else "Ready now",
        "pickupWindow": lot.availability_start.strftime("%a %d %b") if lot.availability_start else "Flexible pickup",
        "qualityGrade": lot.quality_grade,
        "tags": [
            "Verified point" if point and point.is_verified else "Collection point",
            point.opening_hours if point and point.opening_hours else "Flexible pickup",
            f"{int(lot.fill_level)}% full",
        ],
        "demandScore": lot.demand_score,
        "closesAt": point.opening_hours.split("-")[-1] if point and point.opening_hours and "-" in point.opening_hours else "5:00 PM",
    }


def lot_for_owner(lot: PlasticLot) -> dict:
    return {
        "id": lot.id,
        "material": lot_material_code(lot),
        "title": lot.title,
        "binId": lot.source_compartment.smart_bin_id if lot.source_compartment else "",
        "dustbinId": lot.dustbin_id or "",
        "dustbinLabel": lot.dustbin.name if lot.dustbin else "",
        "quantityKg": as_float(lot.estimated_weight_kg),
        "totalWeightKg": as_float(lot.estimated_weight_kg),
        "weightUnit": "kg",
        "plasticItems": lot_plastic_breakdown(lot),
        "pricePerKg": as_float(lot.price_per_kg),
        "qualityGrade": lot.quality_grade,
        "status": owner_lot_status(lot),
        "pickupWindow": lot.availability_start.strftime("%a %d %b, 9:00 AM-12:00 PM") if lot.availability_start else "Flexible pickup",
        "publishedAt": "Just now" if not lot.published_at else lot.published_at.strftime("%a %d %b"),
        "paymentRequired": lot.payment_required,
        "publicationSource": lot.publication_source,
        "expiresAt": iso(lot.expires_at),
        "views": lot.views,
    }


def compartment_for_owner(compartment: BinCompartment) -> dict:
    return {
        "id": compartment.id,
        "material": compartment.material.code,
        "quantityKg": as_float(compartment.current_weight_kg),
        "fillLevel": int(as_float(compartment.fill_percentage)),
        "thresholdLevel": int(as_float(compartment.threshold_percentage)),
        "status": "ready" if compartment.status == "ready" else "reserved" if compartment.status == "reserved" else "growing",
    }


def bin_for_owner(smart_bin: SmartBin) -> dict:
    return {
        "id": smart_bin.id,
        "label": smart_bin.name,
        "location": smart_bin.location_label or smart_bin.collection_point.name,
        "collectionPointId": smart_bin.collection_point_id,
        "status": "warning" if smart_bin.status in {"warning", "maintenance"} else "offline" if smart_bin.status == "offline" else "online",
        "batteryPercent": smart_bin.battery_percent,
        "lastSync": "Now" if smart_bin.last_seen_at else "Never",
        "cameraStatus": smart_bin.camera_status,
        "weightSensorStatus": smart_bin.weight_sensor_status,
        "compartments": [compartment_for_owner(comp) for comp in smart_bin.compartments],
    }


def offer_for_owner(offer: CollectorOffer) -> dict:
    return {
        "id": offer.id,
        "collectorName": offer.collector.organization.name if offer.collector.organization else offer.collector.display_name,
        "collectorInitials": offer.collector.organization.name[:2].upper() if offer.collector.organization else offer.collector.initials,
        "lotId": offer.lot_id,
        "price": money(offer.offered_price_per_kg * offer.lot.estimated_weight_kg),
        "pickupWindow": offer.pickup_window or "Flexible pickup",
        "rating": 4.9,
        "completedPickups": 42,
        "status": owner_offer_status(offer),
    }


def pickup_for_collector(pickup: Pickup) -> dict:
    point = pickup.collection_point
    return {
        "id": pickup.id,
        "lotId": pickup.lot_id,
        "pointName": point.name,
        "pointInitials": initials(point.name),
        "material": pickup.lot.material.code,
        "quantityKg": as_float(pickup.estimated_weight_kg),
        "dateLabel": pickup.date_label or "Scheduled",
        "timeWindow": pickup.time_window or "Flexible",
        "status": collector_pickup_status(pickup),
        "price": money(pickup.total_amount),
        "distanceKm": None,
        "qrCode": pickup.qr_code,
    }


def pickup_for_owner(pickup: Pickup) -> dict:
    collector_name = pickup.collector.organization.name if pickup.collector.organization else pickup.collector.display_name
    return {
        "id": pickup.id,
        "lotId": pickup.lot_id,
        "collectorName": collector_name,
        "collectorInitials": initials(collector_name),
        "dateLabel": pickup.date_label or "Scheduled",
        "timeWindow": pickup.time_window or "Flexible",
        "status": owner_pickup_status(pickup),
        "handoverCode": pickup.qr_code,
        "progressPercent": pickup.progress_percent,
    }


def transaction_for_collector(transaction: Transaction) -> dict:
    return {
        "id": transaction.id,
        "lotId": transaction.lot_id,
        "title": transaction.title,
        "dateLabel": transaction.created_at.strftime("%a %d %b"),
        "amount": money(transaction.total_amount),
        "status": "paid" if transaction.payment_status == "paid" else "pending" if transaction.payment_status == "pending" else "scheduled",
        "method": transaction.payment_method,
    }


def transaction_for_owner(transaction: Transaction) -> dict:
    return {
        "id": transaction.id,
        "title": transaction.title,
        "dateLabel": transaction.created_at.strftime("%a %d %b"),
        "amount": money(transaction.total_amount),
        "status": "paid" if transaction.payment_status == "paid" else "pending" if transaction.payment_status == "pending" else "scheduled",
        "method": transaction.payment_method,
    }


def notification_for_user(notification: Notification, role: str) -> dict:
    tone_map = {
        "offer": "offer",
        "bin": "bin",
        "pickup": "pickup",
        "payment": "payment",
        "supply": "supply",
        "route": "route",
        "message": "message",
    }
    return {
        "id": notification.id,
        "title": notification.title,
        "body": notification.message,
        "message": notification.message,
        "timeLabel": notification.created_at.strftime("%I:%M %p"),
        "read": notification.is_read,
        "tone": tone_map.get(notification.type, "pickup" if role == "owner" else "supply"),
    }


def thread_for_user(thread: MessageThread, user: User) -> dict:
    participant = thread.collector if user.id == thread.owner_id else thread.owner
    participant_name = participant.organization.name if participant.organization else participant.display_name
    unread = sum(1 for message in thread.messages if message.recipient_id == user.id and not message.is_read)
    last = thread.messages[-1] if thread.messages else None
    return {
        "id": thread.id,
        "participant": participant_name,
        "initials": initials(participant_name),
        "role": participant.role.title(),
        "lastMessage": last.body if last else "",
        "timeLabel": last.created_at.strftime("%a") if last else "",
        "unread": unread,
        "online": True,
    }


def demand_alert_for_collector(alert: DemandAlert) -> dict:
    return {
        "id": alert.id,
        "label": alert.name,
        "material": alert.material.code if alert.material else "All",
        "minimumKg": as_float(alert.minimum_weight_kg),
        "radiusKm": as_float(alert.maximum_distance_km),
        "readyWindow": alert.ready_window or "Flexible date",
        "maxPricePerKg": as_float(alert.maximum_price_per_kg) if alert.maximum_price_per_kg else None,
        "matches": demand_alert_match_count(alert),
    }


def demand_alert_match_count(alert: DemandAlert) -> int:
    query = PlasticLot.query.filter(PlasticLot.status.in_(["available", "published"]))
    if alert.material_id:
        query = query.filter(or_(PlasticLot.material_id == alert.material_id, PlasticLot.plastic_items.any(plastic_type=alert.material.code)))
    if alert.maximum_price_per_kg:
        query = query.filter(PlasticLot.price_per_kg <= alert.maximum_price_per_kg)
    matches = 0
    for lot in query.all():
        candidate_weight = sum((item.weight for item in lot.plastic_items if not alert.material_id or item.plastic_type == alert.material.code), Decimal("0"))
        if candidate_weight <= 0:
            candidate_weight = lot.estimated_weight_kg
        if candidate_weight >= alert.minimum_weight_kg:
            matches += 1
    return matches


def collector_user(user: User) -> dict:
    org_name = user.organization.name if user.organization else user.display_name
    return {
        "id": user.id,
        "name": org_name,
        "initials": initials(org_name),
        "organization": org_name,
        "subtitle": "Verified plastic collector",
        "email": user.email,
        "phone": user.phone or "",
        "baseLocation": user.base_location or "Moratuwa",
        "vehicleCapacityKg": as_float(user.vehicle_capacity_kg),
    }


def owner_user(user: User) -> dict:
    point = CollectionPoint.query.filter_by(owner_id=user.id).first()
    org_name = user.organization.name if user.organization else user.display_name
    return {
        "id": user.id,
        "name": org_name,
        "initials": initials(org_name),
        "organization": org_name,
        "subtitle": "Verified dustbin owner",
        "email": user.email,
        "phone": user.phone or "",
        "collectionPointName": point.name if point else org_name,
        "collectionPointAddress": point.address if point else user.organization.address if user.organization else "",
    }


def collector_snapshot(user: User) -> dict:
    saved_ids = {saved.collection_point_id for saved in user.saved_collection_points}
    route = RoutePlan.query.filter_by(collector_id=user.id).order_by(RoutePlan.updated_at.desc()).first()
    lots = PlasticLot.query.filter(PlasticLot.status.in_(["available", "published", "reserved", "pickup_scheduled"])).all()
    points = CollectionPoint.query.filter_by(is_active=True).all()
    pickups = Pickup.query.filter_by(collector_id=user.id).order_by(Pickup.created_at.desc()).all()
    transactions = Transaction.query.filter_by(collector_id=user.id).order_by(Transaction.created_at.desc()).all()
    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(20).all()
    threads = MessageThread.query.filter((MessageThread.collector_id == user.id) | (MessageThread.owner_id == user.id)).all()
    alerts = DemandAlert.query.filter_by(collector_id=user.id).order_by(DemandAlert.created_at.desc()).all()

    return {
        "user": collector_user(user),
        "points": [collection_point_for_collector(point, user, saved_ids) for point in points],
        "lots": [lot_for_collector(lot) for lot in lots],
        "demandAlerts": [demand_alert_for_collector(alert) for alert in alerts],
        "pickups": [pickup_for_collector(pickup) for pickup in pickups],
        "routePlan": {
            "id": route.id if route else "route-empty",
            "name": route.name if route else "New route",
            "dateLabel": route.route_date if route else "",
            "vehicleCapacityKg": as_float(user.vehicle_capacity_kg),
            "stops": [{"lotId": stop.lot_id, "eta": stop.estimated_arrival_at or ""} for stop in (route.stops if route else [])],
        },
        "transactions": [transaction_for_collector(transaction) for transaction in transactions],
        "notifications": [notification_for_user(notification, "collector") for notification in notifications],
        "messages": [thread_for_user(thread, user) for thread in threads],
    }


def owner_snapshot(user: User) -> dict:
    points = CollectionPoint.query.filter_by(owner_id=user.id, is_active=True).all()
    point_ids = [point.id for point in points]
    bins = SmartBin.query.filter(SmartBin.collection_point_id.in_(point_ids)).all() if point_ids else []
    dustbins = Dustbin.query.filter_by(owner_id=user.id).order_by(Dustbin.created_at.desc()).all()
    lots = PlasticLot.query.filter_by(owner_id=user.id).order_by(PlasticLot.created_at.desc()).all()
    offers = CollectorOffer.query.join(PlasticLot).filter(PlasticLot.owner_id == user.id).order_by(CollectorOffer.created_at.desc()).all()
    pickups = Pickup.query.filter_by(owner_id=user.id).order_by(Pickup.created_at.desc()).all()
    transactions = Transaction.query.filter_by(owner_id=user.id).order_by(Transaction.created_at.desc()).all()
    bin_ids = [smart_bin.id for smart_bin in bins]
    alerts = DeviceAlert.query.filter(DeviceAlert.smart_bin_id.in_(bin_ids)).all() if bin_ids else []
    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(20).all()
    threads = MessageThread.query.filter((MessageThread.owner_id == user.id) | (MessageThread.collector_id == user.id)).all()

    total_plastic = sum(as_float(comp.current_weight_kg) for smart_bin in bins for comp in smart_bin.compartments)
    completed = Pickup.query.filter_by(owner_id=user.id, status="completed").count()
    impact = [
        {"id": "items", "label": "Items redirected", "value": "3,170", "detail": "Estimated items kept in the loop this month"},
        {"id": "plastic", "label": "Plastic captured", "value": f"{total_plastic:.1f} kg", "detail": "Tracked from inventory and completed handovers"},
        {"id": "co2", "label": "CO2e avoided", "value": f"{round(total_plastic * 1.72)} kg", "detail": "Estimated from recovered plastic weight"},
        {"id": "community", "label": "Completed pickups", "value": str(completed), "detail": "Verified handovers this month"},
    ]

    return {
        "user": owner_user(user),
        "collectionPoints": [collection_point_for_owner(point) for point in points],
        "smartBins": [bin_for_owner(smart_bin) for smart_bin in bins],
        "dustbins": [dustbin_for_owner(dustbin) for dustbin in dustbins],
        "lots": [lot_for_owner(lot) for lot in lots],
        "offers": [offer_for_owner(offer) for offer in offers],
        "pickups": [pickup_for_owner(pickup) for pickup in pickups],
        "transactions": [transaction_for_owner(transaction) for transaction in transactions],
        "deviceAlerts": [
            {
                "id": alert.id,
                "binId": alert.smart_bin_id,
                "title": alert.title,
                "severity": alert.severity,
                "detail": alert.message,
            }
            for alert in alerts
            if not alert.is_resolved
        ],
        "impactMetrics": impact,
        "notifications": [notification_for_user(notification, "owner") for notification in notifications],
        "messages": [thread_for_user(thread, user) for thread in threads],
    }
