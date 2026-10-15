-- Align an older deployed enquiry-status constraint with the RPC and column
-- default.  The replacement retains every status accepted by the existing
-- constraint and adds only the intended initial status, `new`.
DO $status_repair$
DECLARE
  v_constraint_definition TEXT;
  v_condition TEXT;
BEGIN
  SELECT pg_get_constraintdef(constraint_row.oid, TRUE)
  INTO v_constraint_definition
  FROM pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = 'public.celebration_enquiries'::regclass
    AND constraint_row.conname = 'celebration_enquiries_status_check';

  IF v_constraint_definition IS NOT NULL
    AND v_constraint_definition !~ '''new''' THEN
    v_condition := regexp_replace(v_constraint_definition, '^CHECK \((.*)\)$', '\1');
    IF v_condition = v_constraint_definition THEN
      RAISE EXCEPTION 'Unexpected celebration_enquiries_status_check definition: %', v_constraint_definition;
    END IF;

    EXECUTE 'ALTER TABLE public.celebration_enquiries DROP CONSTRAINT celebration_enquiries_status_check';
    EXECUTE format(
      'ALTER TABLE public.celebration_enquiries ADD CONSTRAINT celebration_enquiries_status_check CHECK ((%s) OR (status = %L))',
      v_condition,
      'new'
    );
  END IF;
END;
$status_repair$;

ALTER TABLE public.celebration_enquiries
  ALTER COLUMN status SET DEFAULT 'new';
