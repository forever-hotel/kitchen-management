-- DDP-108 read-only schema compatibility checks for an approved KMS test database.
-- Do not run CREATE TABLE or ALTER TABLE on the existing Neon KMS-Test database.
SELECT column_name, data_type, udt_name, is_nullable, column_default,
       character_maximum_length
FROM information_schema.columns
WHERE table_schema='public' AND table_name='kms_kot_prints'
ORDER BY ordinal_position;

SELECT e.enumlabel, e.enumsortorder FROM pg_type t
JOIN pg_enum e ON e.enumtypid=t.oid
JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typname='kot_print_status'
ORDER BY e.enumsortorder;

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.kms_kot_prints'::regclass;

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='kms_kot_prints';

SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgrelid='public.kms_kot_prints'::regclass AND NOT tgisinternal;
