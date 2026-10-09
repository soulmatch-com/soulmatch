-- Phase 1: make public enquiry-to-lead conversion and quotation writes atomic.
-- Apply only after the celebration, lead-management, expired-lead, and quotation migrations.

ALTER TABLE public.celebration_enquiries
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS celebration_enquiries_idempotency_key_unique
  ON public.celebration_enquiries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Replace the Plan V2 signature with an additive, optional idempotency key.
DROP FUNCTION IF EXISTS public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.create_celebration_enquiry(
  p_location TEXT, p_celebration_type TEXT, p_husband_name TEXT, p_wife_name TEXT,
  p_husband_dob DATE, p_wife_dob DATE, p_preferred_date DATE, p_guest_count_range TEXT,
  p_arrangement_preference TEXT, p_contact_name TEXT, p_mobile TEXT,
  p_preferred_contact_method TEXT, p_service_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_alternative_date DATE DEFAULT NULL, p_husband_nakshatra TEXT DEFAULT NULL,
  p_wife_nakshatra TEXT DEFAULT NULL, p_husband_rasi TEXT DEFAULT NULL,
  p_wife_rasi TEXT DEFAULT NULL, p_travelling_from TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL, p_relationship TEXT DEFAULT NULL,
  p_other_service_details TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_expected_guest_count INTEGER DEFAULT NULL, p_plan_type TEXT DEFAULT NULL,
  p_plan_version INTEGER DEFAULT NULL, p_special_requirements TEXT DEFAULT NULL,
  p_ceremony_duration TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enquiry_id UUID;
  v_service_ids UUID[];
  v_valid_service_count INTEGER;
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := NULLIF(btrim(p_idempotency_key), '');
  IF v_idempotency_key IS NOT NULL AND char_length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE = '22023';
  END IF;

  -- Reusing a key returns the original committed enquiry without a duplicate lead.
  IF v_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_enquiry_id
    FROM public.celebration_enquiries
    WHERE idempotency_key = v_idempotency_key;
    IF FOUND THEN RETURN v_enquiry_id; END IF;
  END IF;

  IF p_location IS DISTINCT FROM 'thirukadaiyur' THEN RAISE EXCEPTION 'Unsupported celebration location' USING ERRCODE = '22023'; END IF;
  IF p_celebration_type IS NULL OR p_celebration_type NOT IN ('60th-marriage', '70th-marriage', '80th-marriage', 'not-sure') THEN RAISE EXCEPTION 'Invalid celebration type' USING ERRCODE = '22023'; END IF;
  IF NULLIF(btrim(p_husband_name), '') IS NULL OR NULLIF(btrim(p_wife_name), '') IS NULL THEN RAISE EXCEPTION 'Couple names are required' USING ERRCODE = '22023'; END IF;
  IF p_husband_dob IS NULL OR p_wife_dob IS NULL OR p_preferred_date IS NULL THEN RAISE EXCEPTION 'Dates of birth and preferred date are required' USING ERRCODE = '22023'; END IF;
  IF p_guest_count_range IS NULL OR p_guest_count_range NOT IN ('below-20', '20-50', '51-100', '100-plus') THEN RAISE EXCEPTION 'Invalid guest count range' USING ERRCODE = '22023'; END IF;
  IF p_expected_guest_count IS NOT NULL AND (p_expected_guest_count < 1 OR p_expected_guest_count > 1000) THEN RAISE EXCEPTION 'Invalid expected guest count' USING ERRCODE = '22023'; END IF;
  IF p_plan_type IS NOT NULL AND p_plan_type NOT IN ('basic', 'premium') THEN RAISE EXCEPTION 'Invalid plan type' USING ERRCODE = '22023'; END IF;
  IF p_plan_version IS NOT NULL AND (p_plan_version < 1 OR p_plan_version > 100) THEN RAISE EXCEPTION 'Invalid plan version' USING ERRCODE = '22023'; END IF;
  IF p_ceremony_duration IS NOT NULL AND p_ceremony_duration NOT IN ('one_session', 'two_sessions') THEN RAISE EXCEPTION 'Invalid ceremony duration' USING ERRCODE = '22023'; END IF;
  IF p_arrangement_preference IS NULL OR p_arrangement_preference NOT IN ('ceremony-only', 'ceremony-food', 'ceremony-stay', 'complete-arrangement', 'need-guidance') THEN RAISE EXCEPTION 'Invalid arrangement preference' USING ERRCODE = '22023'; END IF;
  IF NULLIF(btrim(p_contact_name), '') IS NULL OR NULLIF(btrim(p_mobile), '') IS NULL THEN RAISE EXCEPTION 'Contact name and mobile are required' USING ERRCODE = '22023'; END IF;
  IF p_preferred_contact_method IS NULL OR p_preferred_contact_method NOT IN ('phone', 'whatsapp', 'email') THEN RAISE EXCEPTION 'Invalid preferred contact method' USING ERRCODE = '22023'; END IF;
  IF array_position(p_service_ids, NULL) IS NOT NULL THEN RAISE EXCEPTION 'Service IDs cannot contain null values' USING ERRCODE = '22023'; END IF;

  SELECT COALESCE(array_agg(submitted_id ORDER BY submitted_id), ARRAY[]::UUID[]) INTO v_service_ids
  FROM (SELECT DISTINCT submitted_id FROM unnest(COALESCE(p_service_ids, ARRAY[]::UUID[])) AS submitted_services(submitted_id)) AS unique_services;
  IF cardinality(v_service_ids) = 0 AND p_arrangement_preference <> 'need-guidance' THEN RAISE EXCEPTION 'At least one service is required unless guidance is requested' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_valid_service_count FROM public.celebration_services WHERE id = ANY(v_service_ids) AND location = p_location AND is_active = TRUE;
  IF v_valid_service_count <> cardinality(v_service_ids) THEN RAISE EXCEPTION 'One or more services are invalid, inactive, or unavailable for this location' USING ERRCODE = '22023'; END IF;

  BEGIN
    INSERT INTO public.celebration_enquiries (
      location, celebration_type, husband_name, wife_name, husband_dob, wife_dob,
      husband_nakshatra, wife_nakshatra, husband_rasi, wife_rasi, preferred_date,
      alternative_date, guest_count_range, travelling_from, arrangement_preference,
      expected_guest_count, plan_type, plan_version, contact_name, mobile, email,
      relationship, preferred_contact_method, other_service_details, notes,
      special_requirements, ceremony_duration, status, idempotency_key
    ) VALUES (
      p_location, p_celebration_type, btrim(p_husband_name), btrim(p_wife_name),
      p_husband_dob, p_wife_dob, NULLIF(btrim(p_husband_nakshatra), ''),
      NULLIF(btrim(p_wife_nakshatra), ''), NULLIF(btrim(p_husband_rasi), ''),
      NULLIF(btrim(p_wife_rasi), ''), p_preferred_date, p_alternative_date,
      p_guest_count_range, NULLIF(btrim(p_travelling_from), ''), p_arrangement_preference,
      p_expected_guest_count, p_plan_type, p_plan_version, btrim(p_contact_name),
      btrim(p_mobile), NULLIF(btrim(p_email), ''), NULLIF(btrim(p_relationship), ''),
      p_preferred_contact_method, NULLIF(btrim(p_other_service_details), ''),
      NULLIF(btrim(p_notes), ''), NULLIF(btrim(p_special_requirements), ''),
      p_ceremony_duration, 'new', v_idempotency_key
    ) RETURNING id INTO v_enquiry_id;
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent request with the same key committed first.
    SELECT id INTO v_enquiry_id FROM public.celebration_enquiries WHERE idempotency_key = v_idempotency_key;
    IF FOUND THEN RETURN v_enquiry_id; END IF;
    RAISE;
  END;

  INSERT INTO public.celebration_enquiry_services (enquiry_id, service_id)
  SELECT v_enquiry_id, service_id FROM unnest(v_service_ids) AS selected_services(service_id);

  -- This is deliberately inside the same function transaction as the enquiry.
  INSERT INTO public.leads (
    celebration_enquiry_id, source, status, contact_name, mobile, email,
    requirement_summary, event_date, event_type, event_session, total_members
  ) VALUES (
    v_enquiry_id, 'website', 'new', btrim(p_contact_name), btrim(p_mobile),
    NULLIF(btrim(p_email), ''), COALESCE(NULLIF(btrim(p_other_service_details), ''),
    NULLIF(btrim(p_special_requirements), ''), NULLIF(btrim(p_notes), '')),
    p_preferred_date,
    CASE WHEN p_celebration_type IN ('60th-marriage', '70th-marriage', '80th-marriage') THEN p_celebration_type ELSE NULL END,
    p_ceremony_duration, p_expected_guest_count
  ) ON CONFLICT (celebration_enquiry_id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE celebration_enquiry_id = v_enquiry_id) THEN
    RAISE EXCEPTION 'Unable to create linked lead' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_enquiry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, TEXT, INTEGER, TEXT, TEXT, TEXT
) TO service_role;

-- Each RPC validates its inputs before changing rows. A PostgreSQL function call
-- is atomic, so any error rolls back the header, service snapshots, and lead links.
CREATE OR REPLACE FUNCTION public.create_admin_quotation(
  p_quotation_number TEXT, p_valid_until DATE, p_notes TEXT, p_created_by UUID,
  p_items JSONB, p_lead_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_quotation_id UUID; v_item_count INTEGER; v_service_count INTEGER; v_lead_count INTEGER; v_total NUMERIC(12,2);
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 THEN RAISE EXCEPTION 'At least one quotation item is required' USING ERRCODE = '22023'; END IF;
  SELECT count(*), count(DISTINCT service_id) INTO v_item_count, v_service_count FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
  IF v_item_count <> v_service_count THEN RAISE EXCEPTION 'Duplicate services are not allowed' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) WHERE service_id IS NULL OR quantity IS NULL OR quantity < 1 OR unit_price IS NULL OR unit_price < 0) THEN RAISE EXCEPTION 'Invalid quotation item' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_service_count FROM public.celebration_services service JOIN jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) ON item.service_id = service.id WHERE service.is_active = TRUE;
  IF v_service_count <> v_item_count THEN RAISE EXCEPTION 'One or more selected services are no longer available' USING ERRCODE = '22023'; END IF;
  IF cardinality(p_lead_ids) <> cardinality(ARRAY(SELECT DISTINCT unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])))) THEN RAISE EXCEPTION 'Duplicate leads are not allowed' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_lead_count FROM public.leads WHERE id = ANY(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AND status <> 'expired';
  IF v_lead_count <> cardinality(COALESCE(p_lead_ids, ARRAY[]::UUID[])) THEN RAISE EXCEPTION 'One or more selected leads could not be found' USING ERRCODE = '22023'; END IF;
  SELECT COALESCE(sum(round(item.quantity * item.unit_price, 2)), 0) INTO v_total FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
  INSERT INTO public.quotations (quotation_number, valid_until, notes, total_amount, created_by) VALUES (p_quotation_number, p_valid_until, NULLIF(btrim(p_notes), ''), v_total, p_created_by) RETURNING id INTO v_quotation_id;
  INSERT INTO public.quotation_items (quotation_id, celebration_service_id, service_code, service_name, quantity, unit_price, line_total)
  SELECT v_quotation_id, service.id, service.code, service.name, item.quantity, item.unit_price, round(item.quantity * item.unit_price, 2)
  FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) JOIN public.celebration_services service ON service.id = item.service_id;
  INSERT INTO public.quotation_leads (quotation_id, lead_id) SELECT v_quotation_id, lead_id FROM unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AS link(lead_id);
  RETURN v_quotation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admin_quotation(
  p_quotation_id UUID, p_status TEXT, p_set_valid_until BOOLEAN, p_valid_until DATE,
  p_set_notes BOOLEAN, p_notes TEXT, p_replace_items BOOLEAN, p_items JSONB,
  p_replace_leads BOOLEAN, p_lead_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_item_count INTEGER; v_service_count INTEGER; v_lead_count INTEGER; v_total NUMERIC(12,2);
BEGIN
  PERFORM 1 FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('draft', 'sent', 'accepted', 'rejected', 'expired') THEN RAISE EXCEPTION 'Invalid quotation status' USING ERRCODE = '22023'; END IF;
  IF p_replace_items THEN
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 THEN RAISE EXCEPTION 'At least one quotation item is required' USING ERRCODE = '22023'; END IF;
    SELECT count(*), count(DISTINCT service_id) INTO v_item_count, v_service_count FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
    IF v_item_count <> v_service_count OR EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) WHERE service_id IS NULL OR quantity IS NULL OR quantity < 1 OR unit_price IS NULL OR unit_price < 0) THEN RAISE EXCEPTION 'Invalid quotation items' USING ERRCODE = '22023'; END IF;
    SELECT count(*) INTO v_service_count FROM public.celebration_services service JOIN jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) ON item.service_id = service.id;
    IF v_service_count <> v_item_count THEN RAISE EXCEPTION 'One or more selected services could not be found' USING ERRCODE = '22023'; END IF;
    SELECT COALESCE(sum(round(quantity * unit_price, 2)), 0) INTO v_total FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
    DELETE FROM public.quotation_items WHERE quotation_id = p_quotation_id;
    INSERT INTO public.quotation_items (quotation_id, celebration_service_id, service_code, service_name, quantity, unit_price, line_total)
    SELECT p_quotation_id, service.id, service.code, service.name, item.quantity, item.unit_price, round(item.quantity * item.unit_price, 2)
    FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) JOIN public.celebration_services service ON service.id = item.service_id;
  END IF;
  IF p_replace_leads THEN
    IF cardinality(p_lead_ids) <> cardinality(ARRAY(SELECT DISTINCT unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])))) THEN RAISE EXCEPTION 'Duplicate leads are not allowed' USING ERRCODE = '22023'; END IF;
    SELECT count(*) INTO v_lead_count FROM public.leads WHERE id = ANY(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AND status <> 'expired';
    IF v_lead_count <> cardinality(COALESCE(p_lead_ids, ARRAY[]::UUID[])) THEN RAISE EXCEPTION 'One or more selected leads could not be found' USING ERRCODE = '22023'; END IF;
    DELETE FROM public.quotation_leads WHERE quotation_id = p_quotation_id;
    INSERT INTO public.quotation_leads (quotation_id, lead_id) SELECT p_quotation_id, lead_id FROM unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AS link(lead_id);
  END IF;
  UPDATE public.quotations SET
    status = COALESCE(p_status, status),
    valid_until = CASE WHEN p_set_valid_until THEN p_valid_until ELSE valid_until END,
    notes = CASE WHEN p_set_notes THEN NULLIF(btrim(p_notes), '') ELSE notes END,
    total_amount = CASE WHEN p_replace_items THEN v_total ELSE total_amount END
  WHERE id = p_quotation_id;
  RETURN p_quotation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_quotation(TEXT, DATE, TEXT, UUID, JSONB, UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_admin_quotation(UUID, TEXT, BOOLEAN, DATE, BOOLEAN, TEXT, BOOLEAN, JSONB, BOOLEAN, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_quotation(TEXT, DATE, TEXT, UUID, JSONB, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_quotation(UUID, TEXT, BOOLEAN, DATE, BOOLEAN, TEXT, BOOLEAN, JSONB, BOOLEAN, UUID[]) TO service_role;
