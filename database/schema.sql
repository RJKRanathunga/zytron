-- Zytron PostgreSQL schema
-- Generated from the current Flask-SQLAlchemy models, Alembic migrations,
-- route/service database access, and seed data under src/server.
--
-- Safe to paste into a PostgreSQL query console for an empty database/schema.
-- It intentionally avoids DROP, TRUNCATE, or destructive commands.

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  organization_type VARCHAR(32) NOT NULL,
  registration_number VARCHAR(80),
  description TEXT,
  phone VARCHAR(40),
  email VARCHAR(160),
  address VARCHAR(255),
  district VARCHAR(80),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_organizations_type CHECK (organization_type IN ('owner', 'collector', 'admin'))
);

CREATE TABLE IF NOT EXISTS plastic_materials (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  display_color VARCHAR(24) NOT NULL DEFAULT '#19bf91',
  resin_code VARCHAR(16),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  billing_type VARCHAR(32) NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'LKR',
  billing_interval VARCHAR(32),
  listing_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_packages_billing_type CHECK (billing_type IN ('subscription', 'per_listing')),
  CONSTRAINT ck_packages_price_nonnegative CHECK (price >= 0),
  CONSTRAINT ck_packages_listing_limit_nonnegative CHECK (listing_limit IS NULL OR listing_limit >= 0)
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(160) NOT NULL UNIQUE,
  firebase_uid VARCHAR(128) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  phone VARCHAR(40),
  role VARCHAR(32) NOT NULL,
  avatar_url VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  organization_id VARCHAR(64) REFERENCES organizations(id),
  base_location VARCHAR(120),
  vehicle_capacity_kg NUMERIC(10, 2) DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_users_role CHECK (role IN ('owner', 'collector', 'admin')),
  CONSTRAINT ck_users_vehicle_capacity_nonnegative CHECK (vehicle_capacity_kg IS NULL OR vehicle_capacity_kg >= 0)
);

CREATE TABLE IF NOT EXISTS collection_points (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  organization_id VARCHAR(64) REFERENCES organizations(id),
  name VARCHAR(160) NOT NULL,
  description TEXT,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80),
  district VARCHAR(80),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  opening_hours VARCHAR(120),
  access_instructions TEXT,
  contact_phone VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  reliability_score INTEGER NOT NULL DEFAULT 90,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.7,
  handovers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_collection_points_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ck_collection_points_longitude CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT ck_collection_points_reliability CHECK (reliability_score BETWEEN 0 AND 100),
  CONSTRAINT ck_collection_points_rating CHECK (rating BETWEEN 0 AND 5),
  CONSTRAINT ck_collection_points_handovers_nonnegative CHECK (handovers >= 0)
);

CREATE TABLE IF NOT EXISTS dustbins (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  name VARCHAR(120) NOT NULL,
  code VARCHAR(80) NOT NULL,
  location_address VARCHAR(255) NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  supported_plastic_type VARCHAR(32) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_dustbins_owner_code UNIQUE (owner_id, code),
  CONSTRAINT ck_dustbins_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ck_dustbins_longitude CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS smart_bins (
  id VARCHAR(64) PRIMARY KEY,
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  device_code VARCHAR(80) NOT NULL UNIQUE,
  device_secret VARCHAR(255),
  name VARCHAR(120) NOT NULL,
  model VARCHAR(80),
  status VARCHAR(32) NOT NULL DEFAULT 'online',
  firmware_version VARCHAR(40),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  installed_at TIMESTAMP WITH TIME ZONE,
  last_maintenance_at TIMESTAMP WITH TIME ZONE,
  next_maintenance_at TIMESTAMP WITH TIME ZONE,
  location_label VARCHAR(120),
  battery_percent INTEGER NOT NULL DEFAULT 88,
  camera_status VARCHAR(80) NOT NULL DEFAULT 'Online',
  weight_sensor_status VARCHAR(80) NOT NULL DEFAULT 'Online',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_smart_bins_status CHECK (status IN ('online', 'offline', 'maintenance', 'warning', 'disabled')),
  CONSTRAINT ck_smart_bins_battery CHECK (battery_percent BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS bin_compartments (
  id VARCHAR(64) PRIMARY KEY,
  smart_bin_id VARCHAR(64) NOT NULL REFERENCES smart_bins(id),
  material_id VARCHAR(64) NOT NULL REFERENCES plastic_materials(id),
  capacity_kg NUMERIC(10, 2) NOT NULL,
  current_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fill_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  threshold_percentage NUMERIC(5, 2) NOT NULL DEFAULT 80,
  status VARCHAR(32) NOT NULL DEFAULT 'growing',
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_bin_compartments_capacity_positive CHECK (capacity_kg > 0),
  CONSTRAINT ck_bin_compartments_weight_nonnegative CHECK (current_weight_kg >= 0),
  CONSTRAINT ck_bin_compartments_fill CHECK (fill_percentage BETWEEN 0 AND 100),
  CONSTRAINT ck_bin_compartments_threshold CHECK (threshold_percentage BETWEEN 0 AND 100),
  CONSTRAINT ck_bin_compartments_status CHECK (status IN ('growing', 'ready', 'reserved'))
);

CREATE TABLE IF NOT EXISTS device_alerts (
  id VARCHAR(64) PRIMARY KEY,
  smart_bin_id VARCHAR(64) NOT NULL REFERENCES smart_bins(id),
  severity VARCHAR(32) NOT NULL DEFAULT 'info',
  alert_type VARCHAR(80) NOT NULL DEFAULT 'device',
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_device_alerts_severity CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE TABLE IF NOT EXISTS plastic_lots (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  material_id VARCHAR(64) NOT NULL REFERENCES plastic_materials(id),
  source_compartment_id VARCHAR(64) REFERENCES bin_compartments(id),
  dustbin_id VARCHAR(64) REFERENCES dustbins(id),
  title VARCHAR(180) NOT NULL,
  description TEXT,
  estimated_weight_kg NUMERIC(10, 2) NOT NULL,
  minimum_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 1,
  price_per_kg NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'LKR',
  quality_grade VARCHAR(120) NOT NULL DEFAULT 'Verified sorted plastic',
  availability_start TIMESTAMP WITH TIME ZONE,
  availability_end TIMESTAMP WITH TIME ZONE,
  status VARCHAR(32) NOT NULL DEFAULT 'available',
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  payment_required BOOLEAN NOT NULL DEFAULT FALSE,
  publication_source VARCHAR(32),
  reserved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  views INTEGER NOT NULL DEFAULT 0,
  fill_level INTEGER NOT NULL DEFAULT 80,
  demand_score INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_plastic_lots_status CHECK (status IN ('draft', 'available', 'published', 'reserved', 'pickup_scheduled', 'collected', 'completed', 'withdrawn', 'cancelled', 'payment_pending', 'sold')),
  CONSTRAINT ck_plastic_lots_estimated_weight_positive CHECK (estimated_weight_kg > 0),
  CONSTRAINT ck_plastic_lots_minimum_weight_positive CHECK (minimum_weight_kg > 0),
  CONSTRAINT ck_plastic_lots_price_positive CHECK (price_per_kg > 0),
  CONSTRAINT ck_plastic_lots_views_nonnegative CHECK (views >= 0),
  CONSTRAINT ck_plastic_lots_fill_level CHECK (fill_level BETWEEN 0 AND 100),
  CONSTRAINT ck_plastic_lots_demand_score CHECK (demand_score BETWEEN 0 AND 100),
  CONSTRAINT ck_plastic_lots_publication_source CHECK (publication_source IS NULL OR publication_source IN ('admin', 'pro_subscription', 'flex_payment'))
);

CREATE TABLE IF NOT EXISTS lot_plastic_items (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id) ON DELETE CASCADE,
  plastic_type VARCHAR(32) NOT NULL,
  custom_plastic_type VARCHAR(120),
  weight NUMERIC(10, 2) NOT NULL,
  weight_unit VARCHAR(8) NOT NULL DEFAULT 'kg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_lot_plastic_items_weight_positive CHECK (weight > 0),
  CONSTRAINT ck_lot_plastic_items_weight_unit CHECK (weight_unit IN ('kg')),
  CONSTRAINT ck_lot_plastic_items_type_not_blank CHECK (length(trim(plastic_type)) > 0),
  CONSTRAINT ck_lot_plastic_items_other_label CHECK (plastic_type <> 'Other' OR custom_plastic_type IS NOT NULL),
  CONSTRAINT uq_lot_plastic_item_type UNIQUE (lot_id, plastic_type)
);

CREATE TABLE IF NOT EXISTS collector_offers (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  offered_price_per_kg NUMERIC(10, 2) NOT NULL,
  proposed_pickup_at TIMESTAMP WITH TIME ZONE,
  pickup_window VARCHAR(120),
  message TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_collector_offers_price_positive CHECK (offered_price_per_kg > 0),
  CONSTRAINT ck_collector_offers_status CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  requested_date VARCHAR(32),
  requested_window VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_reservations_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired', 'completed'))
);

CREATE TABLE IF NOT EXISTS pickups (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  reservation_id VARCHAR(64) REFERENCES reservations(id),
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  date_label VARCHAR(64),
  time_window VARCHAR(120),
  actual_arrival_at TIMESTAMP WITH TIME ZONE,
  actual_completion_at TIMESTAMP WITH TIME ZONE,
  estimated_weight_kg NUMERIC(10, 2) NOT NULL,
  verified_weight_kg NUMERIC(10, 2),
  price_per_kg NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'LKR',
  status VARCHAR(32) NOT NULL DEFAULT 'requested',
  progress_percent INTEGER NOT NULL DEFAULT 10,
  qr_code VARCHAR(80) NOT NULL UNIQUE,
  owner_notes TEXT,
  collector_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_pickups_status CHECK (status IN ('requested', 'scheduled', 'collector_en_route', 'arrived', 'weighing', 'completed', 'cancelled', 'disputed')),
  CONSTRAINT ck_pickups_estimated_weight_positive CHECK (estimated_weight_kg > 0),
  CONSTRAINT ck_pickups_verified_weight_positive CHECK (verified_weight_kg IS NULL OR verified_weight_kg > 0),
  CONSTRAINT ck_pickups_price_positive CHECK (price_per_kg > 0),
  CONSTRAINT ck_pickups_total_nonnegative CHECK (total_amount >= 0),
  CONSTRAINT ck_pickups_progress CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS route_plans (
  id VARCHAR(64) PRIMARY KEY,
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  name VARCHAR(160) NOT NULL,
  route_date VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  estimated_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0,
  estimated_total_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estimated_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_route_plans_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  CONSTRAINT ck_route_plans_distance_nonnegative CHECK (estimated_distance_km >= 0),
  CONSTRAINT ck_route_plans_duration_nonnegative CHECK (estimated_duration_minutes >= 0),
  CONSTRAINT ck_route_plans_weight_nonnegative CHECK (estimated_total_weight_kg >= 0),
  CONSTRAINT ck_route_plans_cost_nonnegative CHECK (estimated_total_cost >= 0)
);

CREATE TABLE IF NOT EXISTS route_stops (
  id VARCHAR(64) PRIMARY KEY,
  route_plan_id VARCHAR(64) NOT NULL REFERENCES route_plans(id),
  pickup_id VARCHAR(64) REFERENCES pickups(id),
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  stop_order INTEGER NOT NULL,
  estimated_arrival_at VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'planned',
  notes TEXT,
  CONSTRAINT uq_route_stop_order UNIQUE (route_plan_id, stop_order),
  CONSTRAINT ck_route_stops_order_positive CHECK (stop_order > 0),
  CONSTRAINT ck_route_stops_status CHECK (status IN ('planned', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  pickup_id VARCHAR(64) REFERENCES pickups(id),
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  transaction_type VARCHAR(32) NOT NULL DEFAULT 'purchase',
  subtotal NUMERIC(12, 2) NOT NULL,
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'LKR',
  payment_method VARCHAR(80) NOT NULL DEFAULT 'Wallet hold',
  payment_reference VARCHAR(120),
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  title VARCHAR(180) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_transactions_type CHECK (transaction_type IN ('purchase')),
  CONSTRAINT ck_transactions_amounts_nonnegative CHECK (subtotal >= 0 AND platform_fee >= 0 AND total_amount >= 0),
  CONSTRAINT ck_transactions_payment_status CHECK (payment_status IN ('pending', 'scheduled', 'paid', 'failed', 'cancelled', 'refunded', 'processing'))
);

CREATE TABLE IF NOT EXISTS demand_alerts (
  id VARCHAR(64) PRIMARY KEY,
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  name VARCHAR(160) NOT NULL,
  material_id VARCHAR(64) REFERENCES plastic_materials(id),
  minimum_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 1,
  maximum_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 15,
  maximum_price_per_kg NUMERIC(10, 2),
  district VARCHAR(80),
  ready_window VARCHAR(120) DEFAULT 'Ready within 48 hours',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_demand_alerts_min_weight_positive CHECK (minimum_weight_kg > 0),
  CONSTRAINT ck_demand_alerts_max_distance_positive CHECK (maximum_distance_km > 0),
  CONSTRAINT ck_demand_alerts_max_price_nonnegative CHECK (maximum_price_per_kg IS NULL OR maximum_price_per_kg >= 0)
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  type VARCHAR(64) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  resource_type VARCHAR(64),
  resource_id VARCHAR(64),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS message_threads (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) REFERENCES plastic_lots(id),
  pickup_id VARCHAR(64) REFERENCES pickups(id),
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  thread_id VARCHAR(64) NOT NULL REFERENCES message_threads(id),
  sender_id VARCHAR(64) NOT NULL REFERENCES users(id),
  recipient_id VARCHAR(64) NOT NULL REFERENCES users(id),
  body VARCHAR(1000) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS impact_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) REFERENCES users(id),
  collector_id VARCHAR(64) REFERENCES users(id),
  period VARCHAR(32) NOT NULL DEFAULT 'month',
  total_plastic_collected_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_completed_pickups INTEGER NOT NULL DEFAULT 0,
  estimated_landfill_diversion_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estimated_co2_savings_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  community_participants INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_impact_snapshots_subject CHECK (owner_id IS NOT NULL OR collector_id IS NOT NULL),
  CONSTRAINT ck_impact_snapshots_period CHECK (period IN ('day', 'week', 'month', 'quarter', 'year')),
  CONSTRAINT ck_impact_snapshots_nonnegative CHECK (
    total_plastic_collected_kg >= 0
    AND total_completed_pickups >= 0
    AND estimated_landfill_diversion_kg >= 0
    AND estimated_co2_savings_kg >= 0
    AND community_participants >= 0
  )
);

CREATE TABLE IF NOT EXISTS saved_collection_points (
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collector_id, collection_point_id)
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti VARCHAR(128) PRIMARY KEY,
  token_type VARCHAR(16) NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_revoked_tokens_type CHECK (token_type IN ('access', 'refresh'))
);

CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id),
  package_id VARCHAR(64) NOT NULL REFERENCES packages(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  provider VARCHAR(40) NOT NULL DEFAULT 'mock',
  provider_customer_id VARCHAR(120),
  provider_subscription_id VARCHAR(120) UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_seller_subscriptions_status CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'past_due'))
);

CREATE TABLE IF NOT EXISTS listing_payments (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id),
  listing_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  package_id VARCHAR(64) NOT NULL REFERENCES packages(id),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'LKR',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  provider VARCHAR(40) NOT NULL DEFAULT 'mock',
  provider_payment_id VARCHAR(120) UNIQUE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_listing_payments_amount_nonnegative CHECK (amount >= 0),
  CONSTRAINT ck_listing_payments_status CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'))
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id),
  subscription_id VARCHAR(64) REFERENCES seller_subscriptions(id),
  listing_payment_id VARCHAR(64) REFERENCES listing_payments(id),
  transaction_type VARCHAR(40) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'LKR',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  provider VARCHAR(40) NOT NULL DEFAULT 'mock',
  provider_reference VARCHAR(120),
  provider_event_id VARCHAR(160) UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_payment_transactions_amount_nonnegative CHECK (amount >= 0),
  CONSTRAINT ck_payment_transactions_status CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  CONSTRAINT ck_payment_transactions_type CHECK (transaction_type IN ('subscription_payment', 'subscription_renewal', 'listing_payment')),
  CONSTRAINT ck_payment_transactions_resource CHECK (subscription_id IS NOT NULL OR listing_payment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_organizations_district ON organizations (district);
CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);
CREATE INDEX IF NOT EXISTS ix_collection_points_district ON collection_points (district);
CREATE INDEX IF NOT EXISTS ix_collection_points_organization_id ON collection_points (organization_id);
CREATE INDEX IF NOT EXISTS ix_collection_points_owner_id ON collection_points (owner_id);
CREATE INDEX IF NOT EXISTS ix_dustbins_code ON dustbins (code);
CREATE INDEX IF NOT EXISTS ix_dustbins_is_active ON dustbins (is_active);
CREATE INDEX IF NOT EXISTS ix_dustbins_owner_id ON dustbins (owner_id);
CREATE INDEX IF NOT EXISTS ix_smart_bins_collection_point_id ON smart_bins (collection_point_id);
CREATE INDEX IF NOT EXISTS ix_smart_bins_status ON smart_bins (status);
CREATE INDEX IF NOT EXISTS ix_bin_compartments_material_id ON bin_compartments (material_id);
CREATE INDEX IF NOT EXISTS ix_bin_compartments_smart_bin_id ON bin_compartments (smart_bin_id);
CREATE INDEX IF NOT EXISTS ix_bin_compartments_status ON bin_compartments (status);
CREATE INDEX IF NOT EXISTS ix_device_alerts_created_at ON device_alerts (created_at);
CREATE INDEX IF NOT EXISTS ix_device_alerts_severity ON device_alerts (severity);
CREATE INDEX IF NOT EXISTS ix_device_alerts_smart_bin_id ON device_alerts (smart_bin_id);
CREATE INDEX IF NOT EXISTS ix_plastic_lots_collection_point_id ON plastic_lots (collection_point_id);
CREATE INDEX IF NOT EXISTS ix_plastic_lots_material_id ON plastic_lots (material_id);
CREATE INDEX IF NOT EXISTS ix_plastic_lots_owner_id ON plastic_lots (owner_id);
CREATE INDEX IF NOT EXISTS ix_plastic_lots_source_compartment_id ON plastic_lots (source_compartment_id);
CREATE INDEX IF NOT EXISTS ix_plastic_lots_dustbin_id ON plastic_lots (dustbin_id);
CREATE INDEX IF NOT EXISTS ix_plastic_lots_status ON plastic_lots (status);
CREATE INDEX IF NOT EXISTS ix_lot_plastic_items_lot_id ON lot_plastic_items (lot_id);
CREATE INDEX IF NOT EXISTS ix_lot_plastic_items_plastic_type ON lot_plastic_items (plastic_type);
CREATE INDEX IF NOT EXISTS ix_collector_offers_collector_id ON collector_offers (collector_id);
CREATE INDEX IF NOT EXISTS ix_collector_offers_lot_id ON collector_offers (lot_id);
CREATE INDEX IF NOT EXISTS ix_collector_offers_status ON collector_offers (status);
CREATE INDEX IF NOT EXISTS ix_reservations_collector_id ON reservations (collector_id);
CREATE INDEX IF NOT EXISTS ix_reservations_lot_id ON reservations (lot_id);
CREATE INDEX IF NOT EXISTS ix_reservations_owner_id ON reservations (owner_id);
CREATE INDEX IF NOT EXISTS ix_reservations_status ON reservations (status);
CREATE INDEX IF NOT EXISTS ix_pickups_collection_point_id ON pickups (collection_point_id);
CREATE INDEX IF NOT EXISTS ix_pickups_collector_id ON pickups (collector_id);
CREATE INDEX IF NOT EXISTS ix_pickups_lot_id ON pickups (lot_id);
CREATE INDEX IF NOT EXISTS ix_pickups_owner_id ON pickups (owner_id);
CREATE INDEX IF NOT EXISTS ix_pickups_reservation_id ON pickups (reservation_id);
CREATE INDEX IF NOT EXISTS ix_pickups_status ON pickups (status);
CREATE INDEX IF NOT EXISTS ix_route_plans_collector_id ON route_plans (collector_id);
CREATE INDEX IF NOT EXISTS ix_route_plans_status ON route_plans (status);
CREATE INDEX IF NOT EXISTS ix_route_stops_collection_point_id ON route_stops (collection_point_id);
CREATE INDEX IF NOT EXISTS ix_route_stops_lot_id ON route_stops (lot_id);
CREATE INDEX IF NOT EXISTS ix_route_stops_pickup_id ON route_stops (pickup_id);
CREATE INDEX IF NOT EXISTS ix_route_stops_route_plan_id ON route_stops (route_plan_id);
CREATE INDEX IF NOT EXISTS ix_transactions_collector_id ON transactions (collector_id);
CREATE INDEX IF NOT EXISTS ix_transactions_lot_id ON transactions (lot_id);
CREATE INDEX IF NOT EXISTS ix_transactions_owner_id ON transactions (owner_id);
CREATE INDEX IF NOT EXISTS ix_transactions_payment_status ON transactions (payment_status);
CREATE INDEX IF NOT EXISTS ix_transactions_pickup_id ON transactions (pickup_id);
CREATE INDEX IF NOT EXISTS ix_demand_alerts_collector_id ON demand_alerts (collector_id);
CREATE INDEX IF NOT EXISTS ix_demand_alerts_material_id ON demand_alerts (material_id);
CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications (is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_type ON notifications (type);
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS ix_message_threads_collector_id ON message_threads (collector_id);
CREATE INDEX IF NOT EXISTS ix_message_threads_lot_id ON message_threads (lot_id);
CREATE INDEX IF NOT EXISTS ix_message_threads_owner_id ON message_threads (owner_id);
CREATE INDEX IF NOT EXISTS ix_message_threads_pickup_id ON message_threads (pickup_id);
CREATE INDEX IF NOT EXISTS ix_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS ix_messages_is_read ON messages (is_read);
CREATE INDEX IF NOT EXISTS ix_messages_recipient_id ON messages (recipient_id);
CREATE INDEX IF NOT EXISTS ix_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS ix_messages_thread_id ON messages (thread_id);
CREATE INDEX IF NOT EXISTS ix_impact_snapshots_collector_id ON impact_snapshots (collector_id);
CREATE INDEX IF NOT EXISTS ix_impact_snapshots_owner_id ON impact_snapshots (owner_id);
CREATE INDEX IF NOT EXISTS ix_packages_billing_type ON packages (billing_type);
CREATE INDEX IF NOT EXISTS ix_packages_is_active ON packages (is_active);
CREATE INDEX IF NOT EXISTS ix_seller_subscriptions_current_period_end ON seller_subscriptions (current_period_end);
CREATE INDEX IF NOT EXISTS ix_seller_subscriptions_package_id ON seller_subscriptions (package_id);
CREATE INDEX IF NOT EXISTS ix_seller_subscriptions_provider ON seller_subscriptions (provider);
CREATE INDEX IF NOT EXISTS ix_seller_subscriptions_seller_id ON seller_subscriptions (seller_id);
CREATE INDEX IF NOT EXISTS ix_seller_subscriptions_status ON seller_subscriptions (status);
CREATE INDEX IF NOT EXISTS ix_listing_payments_listing_id ON listing_payments (listing_id);
CREATE INDEX IF NOT EXISTS ix_listing_payments_package_id ON listing_payments (package_id);
CREATE INDEX IF NOT EXISTS ix_listing_payments_provider ON listing_payments (provider);
CREATE INDEX IF NOT EXISTS ix_listing_payments_seller_id ON listing_payments (seller_id);
CREATE INDEX IF NOT EXISTS ix_listing_payments_seller_status ON listing_payments (seller_id, status);
CREATE INDEX IF NOT EXISTS ix_listing_payments_status ON listing_payments (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_payments_paid_listing ON listing_payments (listing_id) WHERE status = 'paid';
CREATE INDEX IF NOT EXISTS ix_payment_transactions_listing_payment_id ON payment_transactions (listing_payment_id);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_provider ON payment_transactions (provider);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_provider_reference ON payment_transactions (provider_reference);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_seller_id ON payment_transactions (seller_id);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_status ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_subscription_id ON payment_transactions (subscription_id);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_transaction_type ON payment_transactions (transaction_type);

INSERT INTO packages (
  id, code, name, description, billing_type, price, currency, billing_interval, listing_limit, is_active, created_at, updated_at
) VALUES
  (
    'pkg-zytron-pro',
    'ZYTRON_PRO',
    'ZYTRON PRO',
    'Monthly subscription for regular and high-volume plastic-waste sellers.',
    'subscription',
    0,
    'LKR',
    'monthly',
    NULL,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'pkg-zytron-flex',
    'ZYTRON_FLEX',
    'ZYTRON FLEX',
    'Pay separately for each advertisement with no monthly commitment.',
    'per_listing',
    0,
    'LKR',
    NULL,
    1,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  billing_type = EXCLUDED.billing_type,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  listing_limit = EXCLUDED.listing_limit,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO plastic_materials (
  id, code, name, description, display_color, resin_code, is_active
) VALUES
  ('mat-pet', 'PET', 'Polyethylene terephthalate', 'Recovered Polyethylene terephthalate stream', '#458ed8', '1', TRUE),
  ('mat-hdpe', 'HDPE', 'High-density polyethylene', 'Recovered High-density polyethylene stream', '#f2a14a', '2', TRUE),
  ('mat-pvc', 'PVC', 'Polyvinyl chloride', 'Recovered Polyvinyl chloride stream', '#7a8a80', '3', TRUE),
  ('mat-ldpe', 'LDPE', 'Low-density polyethylene', 'Recovered Low-density polyethylene stream', '#8574e8', '4', TRUE),
  ('mat-pp', 'PP', 'Polypropylene', 'Recovered Polypropylene stream', '#19bf91', '5', TRUE),
  ('mat-ps', 'PS', 'Polystyrene', 'Recovered Polystyrene stream', '#ff7568', '6', TRUE),
  ('mat-mixed', 'MIXED', 'Mixed plastic', 'Recovered Mixed plastic stream', '#657770', '7', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_color = EXCLUDED.display_color,
  resin_code = EXCLUDED.resin_code,
  is_active = EXCLUDED.is_active;
