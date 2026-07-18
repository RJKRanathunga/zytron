# Zytron PostgreSQL Schema Summary

Generated from `src/server/app/models`, `src/server/migrations/versions`, `src/server/app/services`, `src/server/app/routes`, `src/server/app/schemas`, tests, and the existing reference SQL under `src/database/schema/schema.sql`.

## Execution Order

Run `database/schema.sql` once in a PostgreSQL query console against the target database/schema. The file is ordered as:

1. Parent/reference tables: `organizations`, `plastic_materials`, `packages`
2. Users and locations: `users`, `collection_points`
3. Owner dustbin inventory: `dustbins`
4. Device inventory: `smart_bins`, `bin_compartments`, `device_alerts`
5. Marketplace listings: `plastic_lots`, `lot_plastic_items`, `collector_offers`, `reservations`
6. Pickup and routing: `pickups`, `route_plans`, `route_stops`, `transactions`
7. Engagement/supporting data: `demand_alerts`, `notifications`, `message_threads`, `messages`, `impact_snapshots`, `saved_collection_points`, `revoked_tokens`
8. Seller billing: `seller_subscriptions`, `listing_payments`, `payment_transactions`
9. Indexes
10. Idempotent seed inserts for `ZYTRON PRO`, `ZYTRON FLEX`, and supported plastic materials

## Tables

| Table | Purpose | Important Relationships |
| --- | --- | --- |
| `organizations` | Stores owner, collector, and admin organization profiles. | Parent for `users.organization_id` and `collection_points.organization_id`. |
| `plastic_materials` | Stores supported platform plastic classifications. | Referenced by `bin_compartments.material_id`, `plastic_lots.material_id`, and `demand_alerts.material_id`. Seeded with `PET`, `HDPE`, `PVC`, `LDPE`, `PP`, `PS`, `MIXED`. |
| `packages` | Stores seller billing packages. | Referenced by `seller_subscriptions.package_id` and `listing_payments.package_id`. Seeded with `ZYTRON_PRO` and `ZYTRON_FLEX`. |
| `users` | Stores website users, roles, Firebase UID mapping, and profile fields. | Belongs to `organizations`; referenced by lots, offers, reservations, pickups, messages, notifications, billing, saved points, and impact snapshots. |
| `collection_points` | Stores owner locations, addresses, districts, and map coordinates. | Belongs to owner `users` and optional `organizations`; parent for bins, lots, pickups, route stops, and saved points. |
| `dustbins` | Stores owner-managed dustbins with code, location, coordinates, supported plastic type, description, active flag, and timestamps. | Belongs to owner `users`; optionally linked from `plastic_lots.dustbin_id`. |
| `smart_bins` | Stores physical smart-bin devices. | Belongs to `collection_points`; parent for `bin_compartments` and `device_alerts`. |
| `bin_compartments` | Stores per-material bin capacity, current weight, fill level, and compartment status. | Belongs to `smart_bins` and `plastic_materials`; optional source for `plastic_lots.source_compartment_id`. |
| `device_alerts` | Stores alerts generated manually or by devices. | Belongs to `smart_bins`. |
| `plastic_lots` | Stores owner plastic-waste listings/lots, listing status, payment requirement, publication source, coordinates via collection point, weights, and pricing. | Belongs to owner `users`, `collection_points`, `plastic_materials`, optional `bin_compartments`, and optional owner `dustbins`; parent for lot items, offers, reservations, pickups, route stops, transactions, messages, and listing payments. |
| `lot_plastic_items` | Stores manually entered plastic type and weight breakdown per lot. | Belongs to `plastic_lots` with `ON DELETE CASCADE`; unique per `(lot_id, plastic_type)`. |
| `collector_offers` | Stores collector offers on lots. | Belongs to `plastic_lots` and collector `users`. |
| `reservations` | Stores collector reservations and owner confirmations for lots. | Belongs to lot, collector user, and owner user; parent for `pickups.reservation_id`. |
| `pickups` | Stores scheduled/requested/completed pickup workflow state and handover QR code. | Belongs to lot, reservation, collector, owner, and collection point; parent for transactions and route stops. |
| `route_plans` | Stores collector route plans. | Belongs to collector `users`; parent for `route_stops`. |
| `route_stops` | Stores ordered lots/stops in a collector route. | Belongs to route plan, lot, collection point, and optional pickup; unique stop order per route. |
| `transactions` | Stores marketplace purchase/payout records for plastic pickups. | Belongs to lot, collector, owner, and optional pickup. |
| `demand_alerts` | Stores collector demand alerts by material, weight, distance, price, and district. | Belongs to collector `users`; optionally filters by `plastic_materials`. |
| `notifications` | Stores user notifications for offers, bins, pickups, payments, supply, routes, and messages. | Belongs to `users`; resource fields are polymorphic strings and do not have FKs in code. |
| `message_threads` | Stores owner/collector conversation threads around lots and pickups. | Belongs to owner user, collector user, optional lot, and optional pickup; parent for messages. |
| `messages` | Stores individual thread messages. | Belongs to message thread, sender user, and recipient user. |
| `impact_snapshots` | Stores owner or collector impact metrics for a period. | Optionally belongs to owner user or collector user. |
| `saved_collection_points` | Stores collector saved/favorited collection points. | Composite primary key `(collector_id, collection_point_id)` referencing users and collection points. |
| `revoked_tokens` | Stores revoked JWT token IDs. | Belongs to `users`. |
| `seller_subscriptions` | Stores seller subscription lifecycle for `ZYTRON PRO`. | Belongs to seller `users` and `packages`; parent for subscription payment transactions. |
| `listing_payments` | Stores per-listing `ZYTRON FLEX` payments. | Belongs to seller, plastic lot, and package; has a partial unique index allowing only one paid payment per listing. |
| `payment_transactions` | Stores provider payment transaction/event records with JSONB metadata. | Belongs to seller; references either a seller subscription or listing payment. |

## Constraints And Indexes

Primary keys, foreign keys, unique constraints, partial unique index `uq_listing_payments_paid_listing`, and model/Alembic indexes are included.

The SQL uses `VARCHAR` plus check constraints rather than PostgreSQL enum types because the current code uses string columns and plain string constants instead of SQLAlchemy enum types.

## Assumptions And Mismatches

- IDs are `VARCHAR(64)` because the app generates prefixed string IDs in Python, for example `usr-...`, `lot-...`, `pkg-zytron-pro`; no serial or identity columns are used by the current code.
- `firebase_uid` is nullable and unique. Existing email users are linked to Firebase UID at login/register time.
- `src/database/schema/schema.sql` is older than the active models/migrations and is missing current seller billing tables and listing payment columns.
- Alembic revision `0002_firebase_auth` adds `users.firebase_uid`, but revision `0001_initial_schema` already contains it. The final schema includes the column once.
- `constants.py` omits `payment_pending` and `sold` from `LOT_STATUSES`, but route/service/serializer code reads or writes those values. The SQL check constraint includes both.
- `packages.price` is seeded as `0.00` because `seed_data.py` currently seeds both `ZYTRON PRO` and `ZYTRON FLEX` with zero price. Real billing prices must be configured manually if this is not intended for production.
- The payment provider is currently `mock`; production provider IDs, prices, and webhook configuration are not present in the repository.
- `lot_plastic_items.plastic_type` is intentionally not a foreign key to `plastic_materials.code` because code supports the special `Other` value with `custom_plastic_type`.
- `dustbins.supported_plastic_type` stores the material code as a string to match lot item plastic type handling; route validation still requires it to match an active platform material.
- Timestamp columns use `DEFAULT CURRENT_TIMESTAMP` for console usability. The app also sets timestamps from SQLAlchemy defaults and `onupdate`; no database trigger is defined in the current code.
- Check constraints for status and numeric ranges are derived from current constants, schemas, routes, service assignments, and tests. If future code accepts broader free-form statuses, those constraints should be widened in a migration.

## Manual Values To Configure

- Real `packages.price` values for `ZYTRON_PRO` and `ZYTRON_FLEX`.
- Real payment provider name/configuration if replacing the mock provider.
- Firebase project/client configuration outside the database.
- Google Maps API configuration outside the database.
- Application secrets/JWT settings outside the database.
