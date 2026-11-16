-- KMS -> WKMS event reliability (apply to an ISOLATED test branch first).
-- KMS owns this table. This migration is additive and intentionally not run by startup.
-- Apply only before setting KMS_ORDER_READY_ENABLED=true.
BEGIN;
CREATE TABLE IF NOT EXISTS kms_order_ready_outbox (
  food_order_id UUID PRIMARY KEY REFERENCES kms_food_orders(order_id) ON DELETE RESTRICT,
  room_number VARCHAR(10) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  CONSTRAINT chk_kms_order_ready_room_nonempty CHECK (length(btrim(room_number)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_kms_order_ready_outbox_pending
  ON kms_order_ready_outbox(next_attempt_at, occurred_at)
  WHERE published_at IS NULL;
COMMIT;
