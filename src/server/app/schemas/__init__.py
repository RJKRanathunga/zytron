from __future__ import annotations

from marshmallow import EXCLUDE, Schema, fields, validate, validates_schema, ValidationError


class BaseSchema(Schema):
    class Meta:
        unknown = EXCLUDE


class RegisterSchema(BaseSchema):
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=80))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=80))
    role = fields.String(required=True, validate=validate.OneOf(["collector", "owner"]))
    phone = fields.String(load_default="")
    organization_name = fields.String(load_default="")


class LoginSchema(BaseSchema):
    first_name = fields.String(validate=validate.Length(min=1, max=80))
    last_name = fields.String(validate=validate.Length(min=1, max=80))
    role = fields.String(validate=validate.OneOf(["collector", "owner"]))
    phone = fields.String(load_default="")
    organization_name = fields.String(load_default="")


class ChangePasswordSchema(BaseSchema):
    current_password = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=8, max=128))


class ProfileUpdateSchema(BaseSchema):
    first_name = fields.String(validate=validate.Length(min=1, max=80))
    last_name = fields.String(validate=validate.Length(min=1, max=80))
    phone = fields.String(validate=validate.Length(max=40))
    avatar_url = fields.String(validate=validate.Length(max=255), allow_none=True)
    base_location = fields.String(validate=validate.Length(max=120), allow_none=True)
    vehicle_capacity_kg = fields.Decimal(as_string=False, places=2, validate=validate.Range(min=0), allow_none=True)


class CollectionPointSchema(BaseSchema):
    name = fields.String(required=True, validate=validate.Length(min=2, max=160))
    address = fields.String(required=True, validate=validate.Length(min=2, max=255))
    city = fields.String(load_default="")
    district = fields.String(load_default="")
    latitude = fields.Decimal(required=True, as_string=False, validate=validate.Range(min=-90, max=90))
    longitude = fields.Decimal(required=True, as_string=False, validate=validate.Range(min=-180, max=180))
    opening_hours = fields.String(load_default="")
    access_instructions = fields.String(load_default="")
    contact_phone = fields.String(load_default="")


class LatLngSchema(BaseSchema):
    lat = fields.Decimal(required=True, as_string=False, validate=validate.Range(min=-90, max=90))
    lng = fields.Decimal(required=True, as_string=False, validate=validate.Range(min=-180, max=180))


class GeocodeSchema(BaseSchema):
    address = fields.String(required=True, validate=validate.Length(min=2, max=500))


class RouteCalculationSchema(BaseSchema):
    origin = fields.Nested(LatLngSchema, required=True)
    destinations = fields.List(fields.Nested(LatLngSchema), load_default=list)
    destination = fields.Nested(LatLngSchema, load_default=None, allow_none=True)

    @validates_schema
    def require_destination(self, data, **_kwargs):
        if not data.get("destinations") and not data.get("destination"):
            raise ValidationError({"destinations": ["At least one destination is required."]})


class LotPlasticItemSchema(BaseSchema):
    plasticType = fields.String(data_key="plasticType", load_default=None, allow_none=True)
    plastic_type = fields.String(load_default=None, allow_none=True)
    customPlasticType = fields.String(data_key="customPlasticType", load_default="", allow_none=True, validate=validate.Length(max=120))
    custom_plastic_type = fields.String(load_default="", allow_none=True, validate=validate.Length(max=120))
    weight = fields.Decimal(required=True, as_string=False, allow_none=False)
    weightUnit = fields.String(data_key="weightUnit", load_default="kg", validate=validate.OneOf(["kg"]))
    weight_unit = fields.String(load_default="kg", validate=validate.OneOf(["kg"]))


class PublishLotSchema(BaseSchema):
    status = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(["draft", "available", "published", None]))
    binId = fields.String(data_key="binId", load_default=None, allow_none=True)
    bin_id = fields.String(load_default=None, allow_none=True)
    compartmentId = fields.String(data_key="compartmentId", load_default=None, allow_none=True)
    compartment_id = fields.String(load_default=None, allow_none=True)
    collection_point_id = fields.String(load_default=None, allow_none=True)
    material = fields.String(load_default=None, allow_none=True)
    material_id = fields.String(load_default=None, allow_none=True)
    quantity_kg = fields.Decimal(load_default=None, as_string=False, validate=validate.Range(min=0), allow_none=True)
    plasticItems = fields.List(fields.Nested(LotPlasticItemSchema), data_key="plasticItems", load_default=None, allow_none=True)
    plastic_items = fields.List(fields.Nested(LotPlasticItemSchema), load_default=None, allow_none=True)
    pricePerKg = fields.Decimal(data_key="pricePerKg", load_default=None, as_string=False, validate=validate.Range(min=0), allow_none=True)
    price_per_kg = fields.Decimal(load_default=None, as_string=False, validate=validate.Range(min=0), allow_none=True)
    pickupWindow = fields.String(data_key="pickupWindow", load_default="", validate=validate.Length(max=120))
    pickup_window = fields.String(load_default="", validate=validate.Length(max=120))
    quality_grade = fields.String(load_default="Verified sorted plastic", validate=validate.Length(max=120))
    title = fields.String(load_default="", validate=validate.Length(max=180))
    description = fields.String(load_default="", validate=validate.Length(max=1000))


class OfferCreateSchema(BaseSchema):
    pricePerKg = fields.Decimal(data_key="pricePerKg", load_default=None, as_string=False, validate=validate.Range(min=0), allow_none=True)
    offered_price_per_kg = fields.Decimal(load_default=None, as_string=False, validate=validate.Range(min=0), allow_none=True)
    pickupWindow = fields.String(data_key="pickupWindow", load_default="", validate=validate.Length(max=120))
    pickup_window = fields.String(load_default="", validate=validate.Length(max=120))
    message = fields.String(load_default="", validate=validate.Length(max=1000))


class ReservationCreateSchema(BaseSchema):
    date = fields.String(load_default="", validate=validate.Length(max=64))
    pickupDate = fields.String(data_key="pickupDate", load_default="", validate=validate.Length(max=64))
    timeWindow = fields.String(data_key="timeWindow", load_default="", validate=validate.Length(max=120))
    pickup_window = fields.String(load_default="", validate=validate.Length(max=120))


class OfferDecisionSchema(BaseSchema):
    pickupDate = fields.String(data_key="pickupDate", load_default="", validate=validate.Length(max=64))
    date = fields.String(load_default="", validate=validate.Length(max=64))
    timeWindow = fields.String(data_key="timeWindow", load_default="", validate=validate.Length(max=120))
    pickup_window = fields.String(load_default="", validate=validate.Length(max=120))


class RouteSaveSchema(BaseSchema):
    lotIds = fields.List(fields.String(), data_key="lotIds", load_default=list)
    lot_ids = fields.List(fields.String(), load_default=list)
    date = fields.String(load_default="", validate=validate.Length(max=64))
    name = fields.String(load_default="", validate=validate.Length(max=160))

    @validates_schema
    def require_lots(self, data, **_kwargs):
        lot_ids = data.get("lotIds") or data.get("lot_ids") or []
        if not lot_ids:
            raise ValidationError({"lotIds": ["At least one lot is required."]})


class DemandAlertSchema(BaseSchema):
    label = fields.String(load_default="", validate=validate.Length(max=160))
    name = fields.String(load_default="", validate=validate.Length(max=160))
    material = fields.String(load_default="All")
    minimumKg = fields.Decimal(data_key="minimumKg", load_default=1, as_string=False, validate=validate.Range(min=0.01))
    minimum_weight_kg = fields.Decimal(load_default=None, as_string=False, validate=validate.Range(min=0.01), allow_none=True)
    radiusKm = fields.Decimal(data_key="radiusKm", load_default=15, as_string=False, validate=validate.Range(min=0.1))
    maximum_distance_km = fields.Decimal(load_default=None, as_string=False, validate=validate.Range(min=0.1), allow_none=True)
    readyWindow = fields.String(data_key="readyWindow", load_default="Ready within 48 hours", validate=validate.Length(max=120))
    maxPricePerKg = fields.Decimal(data_key="maxPricePerKg", load_default=None, as_string=False, validate=validate.Range(min=0), allow_none=True)
    is_active = fields.Boolean(load_default=True)


class MessageCreateSchema(BaseSchema):
    message = fields.String(load_default="", validate=validate.Length(max=1000))
    body = fields.String(load_default="", validate=validate.Length(max=1000))

    @validates_schema
    def require_body(self, data, **_kwargs):
        body = (data.get("message") or data.get("body") or "").strip()
        if not body:
            raise ValidationError({"message": ["Message body is required."]})


class PickupScheduleSchema(OfferDecisionSchema):
    pass


class PickupWeightSchema(BaseSchema):
    verifiedWeightKg = fields.Decimal(data_key="verifiedWeightKg", load_default=None, as_string=False, validate=validate.Range(min=0.01), allow_none=True)
    verified_weight_kg = fields.Decimal(load_default=None, as_string=False, validate=validate.Range(min=0.01), allow_none=True)


class DeviceHeartbeatSchema(BaseSchema):
    device_code = fields.String(required=True)
    device_secret = fields.String(required=True)
    status = fields.String(load_default="online", validate=validate.OneOf(["online", "offline", "maintenance", "warning", "disabled"]))
    battery_percent = fields.Integer(load_default=None, validate=validate.Range(min=0, max=100), allow_none=True)
    firmware_version = fields.String(load_default=None, allow_none=True)


class DeviceEventSchema(DeviceHeartbeatSchema):
    compartments = fields.List(fields.Dict(), load_default=list)
    alerts = fields.List(fields.Dict(), load_default=list)
