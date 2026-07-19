-- Run this once against your Postgres database (Neon, Supabase, etc.)
-- to create the tables the API depends on.

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  category      TEXT NOT NULL,             -- 'Living Room' | 'Bedroom' | 'Office'
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),  -- price stored in cents to avoid float rounding issues
  currency      TEXT NOT NULL DEFAULT 'USD',
  image_url     TEXT NOT NULL,
  stock         INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  order_ref       TEXT UNIQUE NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  items_json      JSONB NOT NULL,           -- snapshot of validated {id, name, unit_price_cents, qty}
  subtotal_cents  INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | contacted | confirmed | cancelled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(order_ref);
