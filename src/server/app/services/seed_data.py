from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import (
    BinCompartment,
    CollectionPoint,
    CollectorOffer,
    DemandAlert,
    DeviceAlert,
    ImpactSnapshot,
    Message,
    MessageThread,
    Notification,
    Organization,
    Package,
    SellerSubscription,
    LotPlasticItem,
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

DEMO_PASSWORD = "PolyLoop123!"


def upsert(model_class, object_id: str, **values):
    record = db.session.get(model_class, object_id)
    if record is None:
        record = model_class(id=object_id)
        db.session.add(record)
    for key, value in values.items():
        setattr(record, key, value)
    return record


def seed_database():
    pro_package = upsert(
        Package,
        "pkg-zytron-pro",
        code="ZYTRON_PRO",
        name="ZYTRON PRO",
        description="Monthly subscription for regular and high-volume plastic-waste sellers.",
        billing_type="subscription",
        price=Decimal("0"),
        currency="LKR",
        billing_interval="monthly",
        listing_limit=None,
        is_active=True,
    )
    upsert(
        Package,
        "pkg-zytron-flex",
        code="ZYTRON_FLEX",
        name="ZYTRON FLEX",
        description="Pay separately for each advertisement with no monthly commitment.",
        billing_type="per_listing",
        price=Decimal("0"),
        currency="LKR",
        billing_interval=None,
        listing_limit=1,
        is_active=True,
    )

    materials = {
        "PET": ("Polyethylene terephthalate", "1", "#458ed8"),
        "HDPE": ("High-density polyethylene", "2", "#f2a14a"),
        "PVC": ("Polyvinyl chloride", "3", "#7a8a80"),
        "LDPE": ("Low-density polyethylene", "4", "#8574e8"),
        "PP": ("Polypropylene", "5", "#19bf91"),
        "PS": ("Polystyrene", "6", "#ff7568"),
        "MIXED": ("Mixed plastic", "7", "#657770"),
    }
    for code, (name, resin, color) in materials.items():
        upsert(
            PlasticMaterial,
            f"mat-{code.lower()}",
            code=code,
            name=name,
            resin_code=resin,
            display_color=color,
            description=f"Recovered {name} stream",
            is_active=True,
        )

    owner_org = upsert(
        Organization,
        "org-uom",
        name="UoM Collection Hub",
        organization_type="owner",
        description="University smart-bin collection point",
        phone="+94 11 265 0301",
        email="sustainability@uom.lk",
        address="Bandaranayake Mawatha, Moratuwa",
        district="Moratuwa",
    )
    collector_org = upsert(
        Organization,
        "org-greennova",
        name="GreenNova Recyclers",
        organization_type="collector",
        description="Verified local collector and recycling partner",
        phone="+94 77 245 8190",
        email="dispatch@greennova.lk",
        address="Moratuwa",
        district="Moratuwa",
    )
    katubedda_org = upsert(
        Organization,
        "org-katubedda-reclaim",
        name="Katubedda Reclaim",
        organization_type="collector",
        description="Compact neighborhood recovery crew",
        phone="+94 77 330 4102",
        email="ops@katubeddareclaim.demo",
        address="Katubedda",
        district="Katubedda",
    )
    secondlife_org = upsert(
        Organization,
        "org-secondlife",
        name="SecondLife Plastics",
        organization_type="collector",
        description="Small batch plastic recovery partner",
        phone="+94 77 512 9044",
        email="dispatch@secondlife.demo",
        address="Piliyandala",
        district="Piliyandala",
    )
    admin_org = upsert(
        Organization,
        "org-polyloop",
        name="PolyLoop Admin",
        organization_type="admin",
        description="Local development administrator",
        phone="+94 11 000 0000",
        email="admin@polyloop.demo",
        address="Moratuwa",
        district="Moratuwa",
    )

    password_hash = generate_password_hash(DEMO_PASSWORD)
    owner = upsert(
        User,
        "owner-demo",
        email="owner@polyloop.demo",
        password_hash=password_hash,
        first_name="UoM",
        last_name="Hub",
        phone="+94 11 265 0301",
        role="owner",
        organization=owner_org,
        base_location="Moratuwa",
        vehicle_capacity_kg=Decimal("0"),
        is_active=True,
        is_verified=True,
    )
    active_until = now = datetime.now(timezone.utc)
    upsert(
        SellerSubscription,
        "sub-owner-demo-pro",
        seller=owner,
        package=pro_package,
        status="active",
        provider="mock",
        provider_customer_id="mock-customer-owner-demo",
        provider_subscription_id="mock-sub-owner-demo-pro",
        started_at=active_until,
        current_period_start=active_until,
        current_period_end=active_until.replace(year=active_until.year + 1),
        cancel_at_period_end=False,
    )
    collector = upsert(
        User,
        "collector-demo",
        email="collector@polyloop.demo",
        password_hash=password_hash,
        first_name="GreenNova",
        last_name="Recyclers",
        phone="+94 77 245 8190",
        role="collector",
        organization=collector_org,
        base_location="Moratuwa",
        vehicle_capacity_kg=Decimal("100"),
        is_active=True,
        is_verified=True,
    )
    katubedda_collector = upsert(
        User,
        "collector-katubedda",
        email="katubedda.collector@polyloop.demo",
        password_hash=password_hash,
        first_name="Katubedda",
        last_name="Reclaim",
        phone="+94 77 330 4102",
        role="collector",
        organization=katubedda_org,
        base_location="Katubedda",
        vehicle_capacity_kg=Decimal("80"),
        is_active=True,
        is_verified=True,
    )
    secondlife_collector = upsert(
        User,
        "collector-secondlife",
        email="secondlife.collector@polyloop.demo",
        password_hash=password_hash,
        first_name="SecondLife",
        last_name="Plastics",
        phone="+94 77 512 9044",
        role="collector",
        organization=secondlife_org,
        base_location="Piliyandala",
        vehicle_capacity_kg=Decimal("70"),
        is_active=True,
        is_verified=True,
    )
    upsert(
        User,
        "admin-demo",
        email="admin@polyloop.demo",
        password_hash=password_hash,
        first_name="PolyLoop",
        last_name="Admin",
        phone="+94 11 000 0000",
        role="admin",
        organization=admin_org,
        base_location="Moratuwa",
        is_active=True,
        is_verified=True,
    )

    points = [
        ("point-uom", owner, owner_org, "UoM Collection Hub", "Bandaranayake Mawatha, Moratuwa", "Moratuwa", Decimal("6.7969"), Decimal("79.9008"), "8:00 AM-5:00 PM", "Main entrance access, 8:00 AM to 5:00 PM", 98, Decimal("4.9"), 21),
        ("point-katubedda", owner, owner_org, "Katubedda Supermarket", "Galle Road, Katubedda", "Katubedda", Decimal("6.8021"), Decimal("79.8879"), "8:00 AM-6:00 PM", "Service bay behind the loading dock", 96, Decimal("4.8"), 18),
        ("point-piliyandala", owner, owner_org, "Piliyandala Central School", "School Road, Piliyandala", "Piliyandala", Decimal("6.8010"), Decimal("79.9210"), "9:00 AM-3:30 PM", "Wide vehicle access after 9:00 AM", 94, Decimal("4.8"), 14),
        ("point-kesbewa", owner, owner_org, "Kesbewa Council Point", "Council Yard, Kesbewa", "Kesbewa", Decimal("6.7950"), Decimal("79.9341"), "8:00 AM-4:00 PM", "Closes at 4:00 PM, flexible pickup desk", 91, Decimal("4.7"), 37),
        ("point-dehiwala", owner, owner_org, "Dehiwala Apartments", "Canal Road, Dehiwala", "Dehiwala", Decimal("6.8515"), Decimal("79.8656"), "7:00 AM-7:00 PM", "Security desk requires vehicle number", 88, Decimal("4.6"), 11),
    ]
    for point_id, point_owner, org, name, address, district, lat, lng, hours, access, score, rating, handovers in points:
        upsert(
            CollectionPoint,
            point_id,
            owner=point_owner,
            organization=org,
            name=name,
            address=address,
            city=district,
            district=district,
            latitude=lat,
            longitude=lng,
            opening_hours=hours,
            access_instructions=access,
            contact_phone=point_owner.phone,
            reliability_score=score,
            rating=rating,
            handovers=handovers,
            is_active=True,
            is_verified=True,
        )

    bins = [
        ("bin-a-03", "point-uom", "A-03", "Smart Bin A-03", "Main entrance", "online", 88, "Online", "Online"),
        ("bin-a-01", "point-uom", "A-01", "Smart Bin A-01", "Main entrance", "online", 72, "Online", "Online"),
        ("bin-a-02", "point-uom", "A-02", "Smart Bin A-02", "Canteen", "warning", 64, "Online", "Check soon"),
        ("bin-b-01", "point-uom", "B-01", "Smart Bin B-01", "Department block", "online", 93, "Online", "Online"),
    ]
    for bin_id, point_id, device_code, name, location, status, battery, camera, weight in bins:
        upsert(
            SmartBin,
            bin_id,
            collection_point_id=point_id,
            device_code=device_code,
            device_secret=generate_password_hash(f"{device_code}-device-secret"),
            name=name,
            model="PolyLoop S1",
            status=status,
            firmware_version="1.4.2",
            location_label=location,
            battery_percent=battery,
            camera_status=camera,
            weight_sensor_status=weight,
        )

    compartments = [
        ("comp-a03-pp", "bin-a-03", "mat-pp", Decimal("32"), Decimal("28.4"), Decimal("91"), "reserved"),
        ("comp-a03-hdpe", "bin-a-03", "mat-hdpe", Decimal("30"), Decimal("23.6"), Decimal("86"), "ready"),
        ("comp-a01-pet", "bin-a-01", "mat-pet", Decimal("28"), Decimal("17.8"), Decimal("63"), "growing"),
        ("comp-a02-hdpe", "bin-a-02", "mat-hdpe", Decimal("26"), Decimal("8.2"), Decimal("31"), "growing"),
        ("comp-b01-pp", "bin-b-01", "mat-pp", Decimal("24"), Decimal("17.8"), Decimal("74"), "reserved"),
    ]
    for comp_id, bin_id, mat_id, capacity, weight, fill, status in compartments:
        upsert(
            BinCompartment,
            comp_id,
            smart_bin_id=bin_id,
            material_id=mat_id,
            capacity_kg=capacity,
            current_weight_kg=weight,
            fill_percentage=fill,
            threshold_percentage=Decimal("80"),
            status=status,
        )

    now = datetime.now(timezone.utc)
    lot_rows = [
        ("lot-uom-pp", "point-uom", "mat-pp", "comp-a03-pp", "28.4 kg Polypropylene", Decimal("28.4"), Decimal("105"), "available", "Clean sorted PP", 91, 97, 18),
        ("lot-piliyandala-pp", "point-piliyandala", "mat-pp", None, "30.0 kg Polypropylene", Decimal("30"), Decimal("101"), "available", "School-stream PP", 88, 94, 10),
        ("lot-kesbewa-pp", "point-kesbewa", "mat-pp", None, "16.0 kg Polypropylene", Decimal("16"), Decimal("99"), "available", "Mixed rigid PP", 76, 91, 7),
        ("lot-katubedda-pet", "point-katubedda", "mat-pet", None, "41.0 kg Clear PET", Decimal("41"), Decimal("92"), "available", "Clear bottle stream", 84, 89, 12),
        ("lot-dehiwala-hdpe", "point-dehiwala", "mat-hdpe", None, "22.0 kg HDPE Containers", Decimal("22"), Decimal("110"), "available", "Rinsed mixed HDPE", 82, 83, 6),
        ("lot-uom-pp-reserved", "point-uom", "mat-pp", "comp-b01-pp", "17.8 kg Polypropylene", Decimal("17.8"), Decimal("102"), "reserved", "Reserved PP stream", 74, 80, 11),
    ]
    for lot_id, point_id, mat_id, comp_id, title, weight, price, status, grade, fill, score, views in lot_rows:
        lot = upsert(
            PlasticLot,
            lot_id,
            owner=owner,
            collection_point_id=point_id,
            material_id=mat_id,
            source_compartment_id=comp_id,
            title=title,
            description=f"{title} from {point_id}",
            estimated_weight_kg=weight,
            minimum_weight_kg=Decimal("1"),
            price_per_kg=price,
            quality_grade=grade,
            status=status,
            published_at=now,
            payment_required=False,
            publication_source="admin",
            reserved_at=now if status == "reserved" else None,
            fill_level=fill,
            demand_score=score,
            views=views,
            availability_start=now,
        )
        upsert(
            LotPlasticItem,
            f"lotitem-{lot_id}",
            lot=lot,
            plastic_type=lot.material.code,
            custom_plastic_type=None,
            weight=weight,
            weight_unit="kg",
        )

    offer_rows = [
        ("offer-greennova", "lot-uom-pp", collector, Decimal("113.03"), "Sat 18 Jul, 9:00 AM-11:00 AM", "pending"),
        ("offer-katubedda", "lot-uom-pp", katubedda_collector, Decimal("108.45"), "Sat 18 Jul, 1:00 PM-3:00 PM", "pending"),
        ("offer-secondlife", "lot-uom-pp", secondlife_collector, Decimal("105.28"), "Mon 20 Jul, 9:00 AM-11:00 AM", "pending"),
    ]
    for offer_id, lot_id, offer_collector, price, window, status in offer_rows:
        upsert(
            CollectorOffer,
            offer_id,
            lot_id=lot_id,
            collector=offer_collector,
            offered_price_per_kg=price,
            pickup_window=window,
            message="Available for verified pickup.",
            status=status,
        )

    reservation = upsert(
        Reservation,
        "reservation-pp-reserved",
        lot_id="lot-uom-pp-reserved",
        collector=collector,
        owner=owner,
        status="confirmed",
        requested_date="Fri 17 Jul",
        requested_window="3:00 PM-4:30 PM",
        confirmed_at=now,
    )

    pickups = [
        ("pickup-greennova", "lot-uom-pp-reserved", reservation.id, collector.id, owner.id, "point-uom", "Fri 17 Jul", "3:00 PM-4:30 PM", Decimal("17.8"), Decimal("102"), "scheduled", 45, "UM-GN-178"),
        ("pickup-uom-pp", "lot-uom-pp", None, collector.id, owner.id, "point-uom", "Sat 18 Jul", "9:00 AM-11:00 AM", Decimal("28.4"), Decimal("105"), "requested", 10, "GN-UM-PP-284"),
        ("pickup-katubedda-pet", "lot-katubedda-pet", None, collector.id, owner.id, "point-katubedda", "Sat 18 Jul", "12:30 PM-2:30 PM", Decimal("41"), Decimal("92"), "scheduled", 20, "GN-KS-PET-410"),
        ("pickup-old-pc", "lot-piliyandala-pp", None, collector.id, owner.id, "point-piliyandala", "Wed 15 Jul", "10:00 AM-11:00 AM", Decimal("26.5"), Decimal("101"), "completed", 100, "GN-PC-PP-265"),
    ]
    for pickup_id, lot_id, reservation_id, collector_id, owner_id, point_id, date_label, window, weight, price, status, progress, qr in pickups:
        upsert(
            Pickup,
            pickup_id,
            lot_id=lot_id,
            reservation_id=reservation_id,
            collector_id=collector_id,
            owner_id=owner_id,
            collection_point_id=point_id,
            date_label=date_label,
            time_window=window,
            estimated_weight_kg=weight,
            verified_weight_kg=weight if status == "completed" else None,
            price_per_kg=price,
            total_amount=weight * price,
            status=status,
            progress_percent=progress,
            qr_code=qr,
        )

    transactions = [
        ("txn-pp-ready", "pickup-uom-pp", "lot-uom-pp", collector.id, owner.id, Decimal("3210"), "pending", "PP lot pending payout"),
        ("txn-pp-complete", "pickup-old-pc", "lot-piliyandala-pp", collector.id, owner.id, Decimal("2860"), "paid", "Completed PP pickup"),
        ("txn-pet-complete", "pickup-katubedda-pet", "lot-katubedda-pet", collector.id, owner.id, Decimal("3772"), "scheduled", "Katubedda PET pickup"),
    ]
    for txn_id, pickup_id, lot_id, collector_id, owner_id, amount, status, title in transactions:
        upsert(
            Transaction,
            txn_id,
            pickup_id=pickup_id,
            lot_id=lot_id,
            collector_id=collector_id,
            owner_id=owner_id,
            subtotal=amount,
            platform_fee=Decimal("0"),
            total_amount=amount,
            payment_method="Wallet release after handover",
            payment_status=status,
            title=title,
        )

    route = upsert(
        RoutePlan,
        "route-pp-saturday",
        collector=collector,
        name="PP Route - Saturday AM",
        route_date="Sat 18 Jul",
        status="draft",
        estimated_distance_km=Decimal("0"),
        estimated_duration_minutes=0,
        estimated_total_weight_kg=Decimal("74.4"),
        estimated_total_cost=Decimal("7596"),
    )
    stops = [
        ("stop-uom", "lot-uom-pp", "point-uom", 1, "9:00 AM"),
        ("stop-kesbewa", "lot-kesbewa-pp", "point-kesbewa", 2, "10:15 AM"),
        ("stop-piliyandala", "lot-piliyandala-pp", "point-piliyandala", 3, "11:10 AM"),
    ]
    for stop_id, lot_id, point_id, order, eta in stops:
        upsert(RouteStop, stop_id, route_plan=route, lot_id=lot_id, collection_point_id=point_id, stop_order=order, estimated_arrival_at=eta)

    alerts = [
        ("demand-pp-20", collector, "PP minimum 20 kg", "mat-pp", Decimal("20"), Decimal("15"), Decimal("108"), "Ready within 48 hours"),
        ("demand-pet-30", collector, "Clear PET minimum 30 kg", "mat-pet", Decimal("30"), Decimal("20"), Decimal("96"), "Weekday pickup"),
        ("demand-hdpe-15", collector, "HDPE minimum 15 kg", "mat-hdpe", Decimal("15"), Decimal("30"), None, "Flexible date"),
    ]
    for demand_id, alert_collector, name, material_id, min_weight, max_distance, max_price, window in alerts:
        upsert(
            DemandAlert,
            demand_id,
            collector=alert_collector,
            name=name,
            material_id=material_id,
            minimum_weight_kg=min_weight,
            maximum_distance_km=max_distance,
            maximum_price_per_kg=max_price,
            ready_window=window,
            is_active=True,
        )

    for saved_id in ["point-uom", "point-katubedda", "point-kesbewa"]:
        if not db.session.get(SavedCollectionPoint, (collector.id, saved_id)):
            db.session.add(SavedCollectionPoint(collector_id=collector.id, collection_point_id=saved_id))

    for alert_id, bin_id, title, severity, message in [
        ("device-alert-a02", "bin-a-02", "Weight sensor check suggested", "warning", "HDPE bin A-02 has a sensor drift warning after the last sync."),
        ("device-alert-a03", "bin-a-03", "PP threshold reached", "info", "A-03 passed the publication threshold and is ready for offers."),
    ]:
        upsert(DeviceAlert, alert_id, smart_bin_id=bin_id, title=title, severity=severity, alert_type="device", message=message, is_resolved=False)

    for note_id, note_user, note_type, title, message, is_read in [
        ("note-owner-offer", owner, "offer", "New collector offer", "GreenNova offered Rs. 3,210 for the ready PP lot.", False),
        ("note-owner-bin", owner, "bin", "PP bin is ready", "Smart Bin A-03 crossed the pickup threshold.", False),
        ("note-collector-route", collector, "route", "Route planner ready", "Add selected PP lots to calculate distance and travel time with Google Routes.", False),
        ("note-collector-pet", collector, "supply", "New PET lot nearby", "Katubedda Supermarket has 41 kg ready for pickup.", False),
    ]:
        upsert(Notification, note_id, user=note_user, type=note_type, title=title, message=message, is_read=is_read, resource_type="seed", resource_id="seed")

    thread = upsert(MessageThread, "thread-greennova-uom", lot_id="lot-uom-pp-reserved", pickup_id="pickup-greennova", owner=owner, collector=collector)
    upsert(Message, "msg-owner-seed", thread=thread, sender=collector, recipient=owner, body="We can arrive between 3:00 PM and 4:00 PM.", is_read=False)
    upsert(Message, "msg-collector-seed", thread=thread, sender=owner, recipient=collector, body="Access gate will be open from 2:45 PM.", is_read=True)

    upsert(
        ImpactSnapshot,
        "impact-owner-month",
        owner_id=owner.id,
        period="month",
        total_plastic_collected_kg=Decimal("126.8"),
        total_completed_pickups=4,
        estimated_landfill_diversion_kg=Decimal("126.8"),
        estimated_co2_savings_kg=Decimal("218"),
        community_participants=3170,
    )

    db.session.commit()
