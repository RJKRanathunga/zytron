-- PolyLoop shared API schema.
-- This SQL mirrors the Flask-SQLAlchemy models in src/server/app/models and is
-- intended as readable reference for PostgreSQL/local development.

CREATE TABLE organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  organization_type VARCHAR(32) NOT NULL,
  registration_number VARCHAR(80),
  description TEXT,
  phone VARCHAR(40),
  email VARCHAR(160),
  address VARCHAR(255),
  district VARCHAR(80),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE users (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE plastic_materials (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  display_color VARCHAR(24) NOT NULL DEFAULT '#19bf91',
  resin_code VARCHAR(16),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE collection_points (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE smart_bins (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE bin_compartments (
  id VARCHAR(64) PRIMARY KEY,
  smart_bin_id VARCHAR(64) NOT NULL REFERENCES smart_bins(id),
  material_id VARCHAR(64) NOT NULL REFERENCES plastic_materials(id),
  capacity_kg NUMERIC(10, 2) NOT NULL,
  current_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fill_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  threshold_percentage NUMERIC(5, 2) NOT NULL DEFAULT 80,
  status VARCHAR(32) NOT NULL DEFAULT 'growing',
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE device_alerts (
  id VARCHAR(64) PRIMARY KEY,
  smart_bin_id VARCHAR(64) NOT NULL REFERENCES smart_bins(id),
  severity VARCHAR(32) NOT NULL DEFAULT 'info',
  alert_type VARCHAR(80) NOT NULL DEFAULT 'device',
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE plastic_lots (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  material_id VARCHAR(64) NOT NULL REFERENCES plastic_materials(id),
  source_compartment_id VARCHAR(64) REFERENCES bin_compartments(id),
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
  reserved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  views INTEGER NOT NULL DEFAULT 0,
  fill_level INTEGER NOT NULL DEFAULT 80,
  demand_score INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE lot_plastic_items (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id) ON DELETE CASCADE,
  plastic_type VARCHAR(32) NOT NULL,
  custom_plastic_type VARCHAR(120),
  weight NUMERIC(10, 2) NOT NULL,
  weight_unit VARCHAR(8) NOT NULL DEFAULT 'kg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT ck_lot_plastic_items_weight_positive CHECK (weight > 0),
  CONSTRAINT ck_lot_plastic_items_weight_unit CHECK (weight_unit IN ('kg')),
  CONSTRAINT uq_lot_plastic_item_type UNIQUE (lot_id, plastic_type)
);

CREATE TABLE collector_offers (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  offered_price_per_kg NUMERIC(10, 2) NOT NULL,
  proposed_pickup_at TIMESTAMP WITH TIME ZONE,
  pickup_window VARCHAR(120),
  message TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE reservations (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE pickups (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE route_plans (
  id VARCHAR(64) PRIMARY KEY,
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  name VARCHAR(160) NOT NULL,
  route_date VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  estimated_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0,
  estimated_total_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estimated_total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE route_stops (
  id VARCHAR(64) PRIMARY KEY,
  route_plan_id VARCHAR(64) NOT NULL REFERENCES route_plans(id),
  pickup_id VARCHAR(64) REFERENCES pickups(id),
  lot_id VARCHAR(64) NOT NULL REFERENCES plastic_lots(id),
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  stop_order INTEGER NOT NULL,
  estimated_arrival_at VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'planned',
  notes TEXT,
  CONSTRAINT uq_route_stop_order UNIQUE (route_plan_id, stop_order)
);

CREATE TABLE transactions (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE demand_alerts (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  type VARCHAR(64) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  resource_type VARCHAR(64),
  resource_id VARCHAR(64),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE message_threads (
  id VARCHAR(64) PRIMARY KEY,
  lot_id VARCHAR(64) REFERENCES plastic_lots(id),
  pickup_id VARCHAR(64) REFERENCES pickups(id),
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE messages (
  id VARCHAR(64) PRIMARY KEY,
  thread_id VARCHAR(64) NOT NULL REFERENCES message_threads(id),
  sender_id VARCHAR(64) NOT NULL REFERENCES users(id),
  recipient_id VARCHAR(64) NOT NULL REFERENCES users(id),
  body VARCHAR(1000) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE impact_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) REFERENCES users(id),
  collector_id VARCHAR(64) REFERENCES users(id),
  period VARCHAR(32) NOT NULL DEFAULT 'month',
  total_plastic_collected_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_completed_pickups INTEGER NOT NULL DEFAULT 0,
  estimated_landfill_diversion_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estimated_co2_savings_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
  community_participants INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE saved_collection_points (
  collector_id VARCHAR(64) NOT NULL REFERENCES users(id),
  collection_point_id VARCHAR(64) NOT NULL REFERENCES collection_points(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (collector_id, collection_point_id)
);

CREATE TABLE revoked_tokens (
  jti VARCHAR(128) PRIMARY KEY,
  token_type VARCHAR(16) NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX ix_users_role ON users(role);
CREATE UNIQUE INDEX ix_users_firebase_uid ON users(firebase_uid);
CREATE INDEX ix_collection_points_owner_id ON collection_points(owner_id);
CREATE INDEX ix_collection_points_district ON collection_points(district);
CREATE INDEX ix_smart_bins_collection_point_id ON smart_bins(collection_point_id);
CREATE INDEX ix_bin_compartments_smart_bin_id ON bin_compartments(smart_bin_id);
CREATE INDEX ix_plastic_lots_owner_id ON plastic_lots(owner_id);
CREATE INDEX ix_plastic_lots_status ON plastic_lots(status);
CREATE INDEX ix_plastic_lots_material_id ON plastic_lots(material_id);
CREATE INDEX ix_lot_plastic_items_lot_id ON lot_plastic_items(lot_id);
CREATE INDEX ix_lot_plastic_items_plastic_type ON lot_plastic_items(plastic_type);
CREATE INDEX ix_collector_offers_lot_id ON collector_offers(lot_id);
CREATE INDEX ix_collector_offers_collector_id ON collector_offers(collector_id);
CREATE INDEX ix_reservations_lot_id ON reservations(lot_id);
CREATE INDEX ix_pickups_owner_id ON pickups(owner_id);
CREATE INDEX ix_pickups_collector_id ON pickups(collector_id);
CREATE INDEX ix_pickups_status ON pickups(status);
CREATE INDEX ix_route_plans_collector_id ON route_plans(collector_id);
CREATE INDEX ix_transactions_owner_id ON transactions(owner_id);
CREATE INDEX ix_transactions_collector_id ON transactions(collector_id);
CREATE INDEX ix_notifications_user_id ON notifications(user_id);
CREATE INDEX ix_notifications_is_read ON notifications(is_read);
CREATE INDEX ix_messages_thread_id ON messages(thread_id);
