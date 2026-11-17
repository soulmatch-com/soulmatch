-- Couple names and dates of birth are optional for celebration enquiries.
ALTER TABLE public.celebration_enquiries
  ALTER COLUMN husband_name DROP NOT NULL,
  ALTER COLUMN wife_name DROP NOT NULL,
  ALTER COLUMN husband_dob DROP NOT NULL,
  ALTER COLUMN wife_dob DROP NOT NULL;

ALTER TABLE public.celebration_enquiries
  DROP CONSTRAINT IF EXISTS celebration_enquiries_husband_name_check,
  DROP CONSTRAINT IF EXISTS celebration_enquiries_wife_name_check,
  DROP CONSTRAINT IF EXISTS celebration_enquiries_contact_name_check,
  DROP CONSTRAINT IF EXISTS celebration_enquiries_mobile_check;

ALTER TABLE public.celebration_enquiries
  ADD CONSTRAINT celebration_enquiries_husband_name_check CHECK (husband_name IS NULL OR char_length(btrim(husband_name)) BETWEEN 1 AND 50),
  ADD CONSTRAINT celebration_enquiries_wife_name_check CHECK (wife_name IS NULL OR char_length(btrim(wife_name)) BETWEEN 1 AND 50),
  ADD CONSTRAINT celebration_enquiries_contact_name_check CHECK (char_length(btrim(contact_name)) BETWEEN 1 AND 50),
  ADD CONSTRAINT celebration_enquiries_mobile_check CHECK (mobile ~ '^[6-9][0-9]{9}$');

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
  p_ceremony_duration TEXT DEFAULT NULL
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
BEGIN
  IF p_location IS DISTINCT FROM 'thirukadaiyur' THEN RAISE EXCEPTION 'Unsupported celebration location' USING ERRCODE = '22023'; END IF;
  IF p_celebration_type IS NULL OR p_celebration_type NOT IN ('60th-marriage', '70th-marriage', '80th-marriage', 'not-sure') THEN RAISE EXCEPTION 'Invalid celebration type' USING ERRCODE = '22023'; END IF;
  IF p_preferred_date IS NULL THEN RAISE EXCEPTION 'Preferred date is required' USING ERRCODE = '22023'; END IF;
  IF p_guest_count_range IS NULL OR p_guest_count_range NOT IN ('below-20', '20-50', '51-100', '100-plus') THEN RAISE EXCEPTION 'Invalid guest count range' USING ERRCODE = '22023'; END IF;
  IF p_expected_guest_count IS NOT NULL AND (p_expected_guest_count < 1 OR p_expected_guest_count > 1000) THEN RAISE EXCEPTION 'Invalid expected guest count' USING ERRCODE = '22023'; END IF;
  IF p_plan_type IS NOT NULL AND p_plan_type NOT IN ('basic', 'premium') THEN RAISE EXCEPTION 'Invalid plan type' USING ERRCODE = '22023'; END IF;
  IF p_plan_version IS NOT NULL AND (p_plan_version < 1 OR p_plan_version > 100) THEN RAISE EXCEPTION 'Invalid plan version' USING ERRCODE = '22023'; END IF;
  IF p_ceremony_duration IS NOT NULL AND p_ceremony_duration NOT IN ('one_session', 'two_sessions') THEN RAISE EXCEPTION 'Invalid ceremony duration' USING ERRCODE = '22023'; END IF;
  IF p_arrangement_preference IS NULL OR p_arrangement_preference NOT IN ('ceremony-only', 'ceremony-food', 'ceremony-stay', 'complete-arrangement', 'need-guidance') THEN RAISE EXCEPTION 'Invalid arrangement preference' USING ERRCODE = '22023'; END IF;
  IF NULLIF(btrim(p_contact_name), '') IS NULL OR p_mobile !~ '^[6-9][0-9]{9}$' THEN RAISE EXCEPTION 'Contact name and valid Indian mobile are required' USING ERRCODE = '22023'; END IF;
  IF p_preferred_contact_method IS NULL OR p_preferred_contact_method NOT IN ('phone', 'whatsapp', 'email') THEN RAISE EXCEPTION 'Invalid preferred contact method' USING ERRCODE = '22023'; END IF;
  IF array_position(p_service_ids, NULL) IS NOT NULL THEN RAISE EXCEPTION 'Service IDs cannot contain null values' USING ERRCODE = '22023'; END IF;

  SELECT COALESCE(array_agg(submitted_id ORDER BY submitted_id), ARRAY[]::UUID[]) INTO v_service_ids
  FROM (SELECT DISTINCT submitted_id FROM unnest(COALESCE(p_service_ids, ARRAY[]::UUID[])) AS submitted_services(submitted_id)) AS unique_services;
  IF cardinality(v_service_ids) = 0 AND p_arrangement_preference <> 'need-guidance' THEN RAISE EXCEPTION 'At least one service is required unless guidance is requested' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_valid_service_count FROM public.celebration_services WHERE id = ANY(v_service_ids) AND location = p_location AND is_active = TRUE;
  IF v_valid_service_count <> cardinality(v_service_ids) THEN RAISE EXCEPTION 'One or more services are invalid, inactive, or unavailable for this location' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.celebration_enquiries (
    location, celebration_type, husband_name, wife_name, husband_dob, wife_dob,
    husband_nakshatra, wife_nakshatra, husband_rasi, wife_rasi, preferred_date,
    alternative_date, guest_count_range, travelling_from, arrangement_preference,
    expected_guest_count, plan_type, plan_version, contact_name, mobile, email,
    relationship, preferred_contact_method, other_service_details, notes,
    special_requirements, ceremony_duration, status
  ) VALUES (
    p_location, p_celebration_type, NULLIF(btrim(p_husband_name), ''), NULLIF(btrim(p_wife_name), ''),
    p_husband_dob, p_wife_dob, NULLIF(btrim(p_husband_nakshatra), ''),
    NULLIF(btrim(p_wife_nakshatra), ''), NULLIF(btrim(p_husband_rasi), ''),
    NULLIF(btrim(p_wife_rasi), ''), p_preferred_date, p_alternative_date,
    p_guest_count_range, NULLIF(btrim(p_travelling_from), ''), p_arrangement_preference,
    p_expected_guest_count, p_plan_type, p_plan_version, btrim(p_contact_name), p_mobile,
    NULLIF(btrim(p_email), ''), NULLIF(btrim(p_relationship), ''), p_preferred_contact_method,
    NULLIF(btrim(p_other_service_details), ''), NULLIF(btrim(p_notes), ''),
    NULLIF(btrim(p_special_requirements), ''), p_ceremony_duration, 'new'
  ) RETURNING id INTO v_enquiry_id;

  INSERT INTO public.celebration_enquiry_services (enquiry_id, service_id)
  SELECT v_enquiry_id, service_id FROM unnest(v_service_ids) AS selected_services(service_id);
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
