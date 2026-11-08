-- DDP-268: additive, KMS-owned availability column; review before running.
-- Approved only for KMS schema ownership. Apply to an isolated test database first.
-- Do not run before the corresponding backend deployment plan is approved.
BEGIN;
ALTER TABLE kms_meal_categories
  ADD COLUMN IF NOT EXISTS ordering_enabled BOOLEAN NOT NULL DEFAULT TRUE;
COMMENT ON COLUMN kms_meal_categories.ordering_enabled IS
  'Kitchen Manager category availability; FOSS must enforce on each new order request';
COMMIT;
