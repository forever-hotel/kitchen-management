-- DDP-260 KMS-owned additive migration. REVIEW before applying.
-- Apply to the isolated KMS test branch first. Schema synchronization stays disabled.
BEGIN;

CREATE TABLE IF NOT EXISTS kms_order_allergy_acknowledgements (
  acknowledgement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES kms_food_orders(order_id) ON DELETE RESTRICT,
  acknowledged_by VARCHAR(255) NOT NULL,
  warning_snapshot JSONB NOT NULL,
  warning_fingerprint CHAR(64) NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_kms_allergy_actor_nonempty CHECK (length(btrim(acknowledged_by)) > 0),
  CONSTRAINT chk_kms_allergy_fingerprint CHECK (warning_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT uq_kms_allergy_ack_order_warning UNIQUE (order_id, warning_fingerprint)
);

CREATE INDEX IF NOT EXISTS ix_kms_allergy_ack_order
  ON kms_order_allergy_acknowledgements (order_id);

COMMIT;
