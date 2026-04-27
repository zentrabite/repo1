-- migration 013 — add delivery_fee + delivery_job_id to orders
-- These fields link an order to its delivery routing decision and store
-- the customer-facing fee so Orders/POS can display it without joining
-- to delivery_jobs every time.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee      numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_job_id   uuid          DEFAULT NULL
    REFERENCES delivery_jobs(id) ON DELETE SET NULL;

-- Index for joining orders ↔ delivery_jobs in analytics queries
CREATE INDEX IF NOT EXISTS orders_delivery_job_id_idx ON orders (delivery_job_id);
