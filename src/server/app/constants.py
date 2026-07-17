from __future__ import annotations

ACTIVE_LOT_STATUSES = {"available", "reserved", "pickup_scheduled"}
ACTIVE_OFFER_STATUSES = {"pending", "accepted"}
ACTIVE_RESERVATION_STATUSES = {"pending", "confirmed"}
COMPLETED_PICKUP_STATUSES = {"completed", "cancelled", "disputed"}

LOT_STATUSES = {
    "draft",
    "available",
    "reserved",
    "pickup_scheduled",
    "collected",
    "completed",
    "withdrawn",
    "cancelled",
}
OFFER_STATUSES = {"pending", "accepted", "rejected", "withdrawn", "expired"}
PICKUP_STATUSES = {
    "requested",
    "scheduled",
    "collector_en_route",
    "arrived",
    "weighing",
    "completed",
    "cancelled",
    "disputed",
}
RESERVATION_STATUSES = {"pending", "confirmed", "cancelled", "expired", "completed"}
ROUTE_STATUSES = {"draft", "active", "completed", "cancelled"}

ALLOWED_PROFILE_FIELDS = {
    "first_name",
    "last_name",
    "phone",
    "avatar_url",
    "base_location",
    "vehicle_capacity_kg",
}
