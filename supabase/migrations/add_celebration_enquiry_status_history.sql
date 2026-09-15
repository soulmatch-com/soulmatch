-- Phase 1 foundation for MyThirumanam celebration enquiry status tracking.
-- NOT APPLIED by Codex. Apply only to the explicitly approved Supabase project.

-- Preserve the pre-Phase-1 status lifecycle values instead of pretending old
-- operational states are part of the new four-state lifecycle.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'celebration_enquiries'
      AND column_name = 'status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'celebration_enquiries'
      AND column_name = 'legacy_status'
  ) THEN
    ALTER TABLE public.celebration_enquiries
      RENAME COLUMN status TO legacy_status;
  END IF;
END
$$;

ALTER TABLE public.celebration_enquiries
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES public.admins(id) ON DELETE SET NULL;

ALTER TABLE public.celebration_enquiries
  ALTER COLUMN status SET DEFAULT 'pending';

DO $$
BEGIN
  ALTER TABLE public.celebration_enquiries
    DROP CONSTRAINT IF EXISTS celebration_enquiries_status_check;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'celebration_enquiries_status_check'
      AND conrelid = 'public.celebration_enquiries'::regclass
  ) THEN
    ALTER TABLE public.celebration_enquiries
      ADD CONSTRAINT celebration_enquiries_status_check
      CHECK (status IS NULL OR status IN ('pending', 'contacted', 'confirmed', 'cancelled'));
  END IF;
END
$$;

COMMENT ON COLUMN public.celebration_enquiries.legacy_status IS 'Pre-Phase-1 operational status preserved during migration; not part of the current admin lifecycle.';
COMMENT ON COLUMN public.celebration_enquiries.status IS 'Current admin lifecycle status: pending, contacted, confirmed, or cancelled. NULL may exist only for legacy rows awaiting explicit review/backfill.';
COMMENT ON COLUMN public.celebration_enquiries.status_updated_at IS 'Timestamp of the latest admin lifecycle status change.';
COMMENT ON COLUMN public.celebration_enquiries.status_updated_by IS 'Admin record that made the latest lifecycle status change.';

CREATE TABLE IF NOT EXISTS public.celebration_enquiry_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES public.celebration_enquiries(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  remarks TEXT NOT NULL,
  changed_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT celebration_enquiry_status_history_from_status_check
    CHECK (from_status IS NULL OR from_status IN ('pending', 'contacted', 'confirmed', 'cancelled')),
  CONSTRAINT celebration_enquiry_status_history_to_status_check
    CHECK (to_status IN ('pending', 'contacted', 'confirmed', 'cancelled')),
  CONSTRAINT celebration_enquiry_status_history_remarks_check
    CHECK (char_length(btrim(remarks)) BETWEEN 1 AND 1000)
);

ALTER TABLE public.celebration_enquiry_status_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.celebration_enquiry_status_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.celebration_enquiry_status_history TO service_role;

CREATE INDEX IF NOT EXISTS idx_celebration_enquiries_status
  ON public.celebration_enquiries (status);
CREATE INDEX IF NOT EXISTS idx_celebration_enquiries_preferred_date
  ON public.celebration_enquiries (preferred_date);
CREATE INDEX IF NOT EXISTS idx_celebration_enquiries_status_preferred_date
  ON public.celebration_enquiries (status, preferred_date);
CREATE INDEX IF NOT EXISTS idx_celebration_enquiry_status_history_enquiry_changed_at
  ON public.celebration_enquiry_status_history (enquiry_id, changed_at DESC);

-- Keep the existing created_at index coverage from idx_celebration_enquiries_status_created_at.

DROP FUNCTION IF EXISTS public.update_celebration_enquiry_status(UUID, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.update_celebration_enquiry_status(
  p_enquiry_id UUID,
  p_new_status TEXT,
  p_remarks TEXT,
  p_changed_by UUID
)
RETURNS TABLE (
  enquiry_id UUID,
  status TEXT,
  status_updated_at TIMESTAMPTZ,
  history_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_status TEXT;
  v_changed_at TIMESTAMPTZ := NOW();
  v_history_id UUID;
BEGIN
  IF p_new_status IS NULL OR p_new_status NOT IN ('pending', 'contacted', 'confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(btrim(COALESCE(p_remarks, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Remarks are required' USING ERRCODE = '22023';
  END IF;

  IF char_length(btrim(p_remarks)) > 1000 THEN
    RAISE EXCEPTION 'Remarks must be 1000 characters or fewer' USING ERRCODE = '22023';
  END IF;

  IF p_changed_by IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE id = p_changed_by
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Active admin is required' USING ERRCODE = '42501';
  END IF;

  SELECT ce.status
    INTO v_current_status
  FROM public.celebration_enquiries ce
  WHERE ce.id = p_enquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Celebration enquiry not found' USING ERRCODE = '02000';
  END IF;

  IF v_current_status IS NOT DISTINCT FROM p_new_status THEN
    RAISE EXCEPTION 'No status change detected' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.celebration_enquiry_status_history (
    enquiry_id,
    from_status,
    to_status,
    remarks,
    changed_by,
    changed_at
  ) VALUES (
    p_enquiry_id,
    v_current_status,
    p_new_status,
    btrim(p_remarks),
    p_changed_by,
    v_changed_at
  )
  RETURNING id INTO v_history_id;

  UPDATE public.celebration_enquiries
  SET
    status = p_new_status,
    status_updated_at = v_changed_at,
    status_updated_by = p_changed_by
  WHERE id = p_enquiry_id;

  RETURN QUERY
  SELECT p_enquiry_id, p_new_status, v_changed_at, v_history_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_celebration_enquiry_status(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_celebration_enquiry_status(UUID, TEXT, TEXT, UUID) TO service_role;

COMMENT ON FUNCTION public.update_celebration_enquiry_status(UUID, TEXT, TEXT, UUID) IS 'Atomically updates the current celebration enquiry status and appends immutable status history. Execute only from a verified server-side admin path.';
COMMENT ON TABLE public.celebration_enquiry_status_history IS 'Private append-only operational history of celebration enquiry lifecycle status changes.';

DROP FUNCTION IF EXISTS public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.create_celebration_enquiry(
  p_location TEXT,
  p_celebration_type TEXT,
  p_husband_name TEXT,
  p_wife_name TEXT,
  p_husband_dob DATE,
  p_wife_dob DATE,
  p_preferred_date DATE,
  p_guest_count_range TEXT,
  p_arrangement_preference TEXT,
  p_contact_name TEXT,
  p_mobile TEXT,
  p_preferred_contact_method TEXT,
  p_service_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_alternative_date DATE DEFAULT NULL,
  p_husband_nakshatra TEXT DEFAULT NULL,
  p_wife_nakshatra TEXT DEFAULT NULL,
  p_husband_rasi TEXT DEFAULT NULL,
  p_wife_rasi TEXT DEFAULT NULL,
  p_travelling_from TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_relationship TEXT DEFAULT NULL,
  p_other_service_details TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_expected_guest_count INTEGER DEFAULT NULL,
  p_plan_type TEXT DEFAULT NULL,
  p_plan_version INTEGER DEFAULT NULL,
  p_special_requirements TEXT DEFAULT NULL,
  p_ceremony_duration TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enquiry_id UUID;
  v_created_at TIMESTAMPTZ;
  v_service_ids UUID[];
  v_valid_service_count INTEGER;
BEGIN
  IF p_location IS DISTINCT FROM 'thirukadaiyur' THEN
    RAISE EXCEPTION 'Unsupported celebration location' USING ERRCODE = '22023';
  END IF;

  IF p_celebration_type IS NULL OR p_celebration_type NOT IN ('60th-marriage', '70th-marriage', '80th-marriage', 'not-sure') THEN
    RAISE EXCEPTION 'Invalid celebration type' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(btrim(p_husband_name), '') IS NULL OR NULLIF(btrim(p_wife_name), '') IS NULL THEN
    RAISE EXCEPTION 'Couple names are required' USING ERRCODE = '22023';
  END IF;

  IF p_husband_dob IS NULL OR p_wife_dob IS NULL OR p_preferred_date IS NULL THEN
    RAISE EXCEPTION 'Dates of birth and preferred date are required' USING ERRCODE = '22023';
  END IF;

  IF p_guest_count_range IS NULL OR p_guest_count_range NOT IN ('below-20', '20-50', '51-100', '100-plus') THEN
    RAISE EXCEPTION 'Invalid guest count range' USING ERRCODE = '22023';
  END IF;

  IF p_expected_guest_count IS NOT NULL AND (p_expected_guest_count < 1 OR p_expected_guest_count > 1000) THEN
    RAISE EXCEPTION 'Invalid expected guest count' USING ERRCODE = '22023';
  END IF;

  IF p_plan_type IS NOT NULL AND p_plan_type NOT IN ('basic', 'premium') THEN
    RAISE EXCEPTION 'Invalid plan type' USING ERRCODE = '22023';
  END IF;

  IF p_plan_version IS NOT NULL AND (p_plan_version < 1 OR p_plan_version > 100) THEN
    RAISE EXCEPTION 'Invalid plan version' USING ERRCODE = '22023';
  END IF;

  IF p_ceremony_duration IS NOT NULL AND p_ceremony_duration NOT IN ('one_session', 'two_sessions') THEN
    RAISE EXCEPTION 'Invalid ceremony duration' USING ERRCODE = '22023';
  END IF;

  IF p_arrangement_preference IS NULL OR p_arrangement_preference NOT IN ('ceremony-only', 'ceremony-food', 'ceremony-stay', 'complete-arrangement', 'need-guidance') THEN
    RAISE EXCEPTION 'Invalid arrangement preference' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(btrim(p_contact_name), '') IS NULL OR NULLIF(btrim(p_mobile), '') IS NULL THEN
    RAISE EXCEPTION 'Contact name and mobile are required' USING ERRCODE = '22023';
  END IF;

  IF p_preferred_contact_method IS NULL OR p_preferred_contact_method NOT IN ('phone', 'whatsapp', 'email') THEN
    RAISE EXCEPTION 'Invalid preferred contact method' USING ERRCODE = '22023';
  END IF;

  IF array_position(p_service_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Service IDs cannot contain null values' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(submitted_id ORDER BY submitted_id), ARRAY[]::UUID[])
    INTO v_service_ids
  FROM (
    SELECT DISTINCT submitted_id
    FROM unnest(COALESCE(p_service_ids, ARRAY[]::UUID[])) AS submitted_services(submitted_id)
  ) AS unique_services;

  IF cardinality(v_service_ids) = 0 AND p_arrangement_preference <> 'need-guidance' THEN
    RAISE EXCEPTION 'At least one service is required unless guidance is requested' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)
    INTO v_valid_service_count
  FROM public.celebration_services
  WHERE id = ANY(v_service_ids)
    AND location = p_location
    AND is_active = TRUE;

  IF v_valid_service_count <> cardinality(v_service_ids) THEN
    RAISE EXCEPTION 'One or more services are invalid, inactive, or unavailable for this location' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.celebration_enquiries (
    location, celebration_type, husband_name, wife_name, husband_dob, wife_dob,
    husband_nakshatra, wife_nakshatra, husband_rasi, wife_rasi,
    preferred_date, alternative_date, guest_count_range, travelling_from,
    arrangement_preference, expected_guest_count, plan_type, plan_version,
    contact_name, mobile, email, relationship, preferred_contact_method,
    other_service_details, notes, special_requirements, ceremony_duration,
    status, status_updated_at, status_updated_by
  ) VALUES (
    p_location, p_celebration_type, btrim(p_husband_name), btrim(p_wife_name),
    p_husband_dob, p_wife_dob, NULLIF(btrim(p_husband_nakshatra), ''),
    NULLIF(btrim(p_wife_nakshatra), ''), NULLIF(btrim(p_husband_rasi), ''),
    NULLIF(btrim(p_wife_rasi), ''), p_preferred_date, p_alternative_date,
    p_guest_count_range, NULLIF(btrim(p_travelling_from), ''),
    p_arrangement_preference, p_expected_guest_count, p_plan_type, p_plan_version,
    btrim(p_contact_name), btrim(p_mobile), NULLIF(btrim(p_email), ''),
    NULLIF(btrim(p_relationship), ''), p_preferred_contact_method,
    NULLIF(btrim(p_other_service_details), ''), NULLIF(btrim(p_notes), ''),
    NULLIF(btrim(p_special_requirements), ''), p_ceremony_duration,
    'pending', NOW(), NULL
  )
  RETURNING id, created_at INTO v_enquiry_id, v_created_at;

  INSERT INTO public.celebration_enquiry_status_history (
    enquiry_id,
    from_status,
    to_status,
    remarks,
    changed_by,
    changed_at
  ) VALUES (
    v_enquiry_id,
    NULL,
    'pending',
    'Enquiry submitted',
    NULL,
    v_created_at
  );

  INSERT INTO public.celebration_enquiry_services (enquiry_id, service_id)
  SELECT v_enquiry_id, service_id
  FROM unnest(v_service_ids) AS selected_services(service_id);

  RETURN v_enquiry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT
) IS 'Atomically creates a private Thirukadaiyur celebration enquiry, initial pending lifecycle history, and validated service relationships.';
