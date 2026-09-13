-- Thirukadaiyur Celebrations database foundation.
-- This feature is intentionally independent from matrimonial profiles.

-- Keep the Celebrations migration self-contained without replacing the shared
-- historical update_updated_at_column() function used by unrelated tables.
CREATE OR REPLACE FUNCTION public.set_celebration_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public service catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.celebration_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  location TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT celebration_services_location_code_key UNIQUE (location, code),
  CONSTRAINT celebration_services_code_not_blank CHECK (char_length(btrim(code)) BETWEEN 1 AND 100),
  CONSTRAINT celebration_services_name_not_blank CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
  CONSTRAINT celebration_services_location_not_blank CHECK (char_length(btrim(location)) BETWEEN 1 AND 100),
  CONSTRAINT celebration_services_description_length CHECK (description IS NULL OR char_length(description) <= 500),
  CONSTRAINT celebration_services_icon_length CHECK (icon IS NULL OR char_length(icon) <= 100),
  CONSTRAINT celebration_services_display_order_nonnegative CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_celebration_services_public_listing
  ON public.celebration_services (location, is_active, display_order);

DROP TRIGGER IF EXISTS update_celebration_services_updated_at ON public.celebration_services;
CREATE TRIGGER update_celebration_services_updated_at
  BEFORE UPDATE ON public.celebration_services
  FOR EACH ROW
  EXECUTE FUNCTION public.set_celebration_updated_at();

-- ---------------------------------------------------------------------------
-- Private customer enquiries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.celebration_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  celebration_type TEXT NOT NULL,
  husband_name TEXT NOT NULL,
  wife_name TEXT NOT NULL,
  husband_dob DATE NOT NULL,
  wife_dob DATE NOT NULL,
  husband_nakshatra TEXT,
  wife_nakshatra TEXT,
  husband_rasi TEXT,
  wife_rasi TEXT,
  preferred_date DATE NOT NULL,
  alternative_date DATE,
  guest_count_range TEXT NOT NULL,
  travelling_from TEXT,
  arrangement_preference TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  relationship TEXT,
  preferred_contact_method TEXT NOT NULL,
  other_service_details TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT celebration_enquiries_location_not_blank CHECK (char_length(btrim(location)) BETWEEN 1 AND 100),
  CONSTRAINT celebration_enquiries_type_check CHECK (celebration_type IN ('60th-marriage', '70th-marriage', '80th-marriage', 'not-sure')),
  CONSTRAINT celebration_enquiries_husband_name_check CHECK (char_length(btrim(husband_name)) BETWEEN 1 AND 150),
  CONSTRAINT celebration_enquiries_wife_name_check CHECK (char_length(btrim(wife_name)) BETWEEN 1 AND 150),
  CONSTRAINT celebration_enquiries_husband_dob_check CHECK (husband_dob <= CURRENT_DATE),
  CONSTRAINT celebration_enquiries_wife_dob_check CHECK (wife_dob <= CURRENT_DATE),
  CONSTRAINT celebration_enquiries_alternative_date_check CHECK (alternative_date IS NULL OR alternative_date <> preferred_date),
  CONSTRAINT celebration_enquiries_guest_count_check CHECK (guest_count_range IN ('below-20', '20-50', '51-100', '100-plus')),
  CONSTRAINT celebration_enquiries_arrangement_check CHECK (arrangement_preference IN ('ceremony-only', 'ceremony-food', 'ceremony-stay', 'complete-arrangement', 'need-guidance')),
  CONSTRAINT celebration_enquiries_contact_name_check CHECK (char_length(btrim(contact_name)) BETWEEN 1 AND 150),
  CONSTRAINT celebration_enquiries_mobile_check CHECK (char_length(btrim(mobile)) BETWEEN 7 AND 30),
  CONSTRAINT celebration_enquiries_email_length CHECK (email IS NULL OR char_length(email) <= 320),
  CONSTRAINT celebration_enquiries_contact_method_check CHECK (preferred_contact_method IN ('phone', 'whatsapp', 'email')),
  CONSTRAINT celebration_enquiries_status_check CHECK (status IN ('new', 'contacted', 'planning', 'confirmed', 'completed', 'cancelled')),
  CONSTRAINT celebration_enquiries_short_text_lengths CHECK (
    (husband_nakshatra IS NULL OR char_length(husband_nakshatra) <= 100) AND
    (wife_nakshatra IS NULL OR char_length(wife_nakshatra) <= 100) AND
    (husband_rasi IS NULL OR char_length(husband_rasi) <= 100) AND
    (wife_rasi IS NULL OR char_length(wife_rasi) <= 100) AND
    (travelling_from IS NULL OR char_length(travelling_from) <= 200) AND
    (relationship IS NULL OR char_length(relationship) <= 100)
  ),
  CONSTRAINT celebration_enquiries_long_text_lengths CHECK (
    (other_service_details IS NULL OR char_length(other_service_details) <= 1000) AND
    (notes IS NULL OR char_length(notes) <= 2000)
  )
);

CREATE INDEX IF NOT EXISTS idx_celebration_enquiries_status_created_at
  ON public.celebration_enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_celebration_enquiries_location_created_at
  ON public.celebration_enquiries (location, created_at DESC);

DROP TRIGGER IF EXISTS update_celebration_enquiries_updated_at ON public.celebration_enquiries;
CREATE TRIGGER update_celebration_enquiries_updated_at
  BEFORE UPDATE ON public.celebration_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_celebration_updated_at();

-- ---------------------------------------------------------------------------
-- Enquiry-to-service relationship
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.celebration_enquiry_services (
  enquiry_id UUID NOT NULL REFERENCES public.celebration_enquiries(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.celebration_services(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT celebration_enquiry_services_pkey PRIMARY KEY (enquiry_id, service_id)
);

-- The primary key already indexes enquiry_id; this index supports reverse
-- lookups from a catalogue service to its enquiries.
CREATE INDEX IF NOT EXISTS idx_celebration_enquiry_services_service_id
  ON public.celebration_enquiry_services (service_id);

-- ---------------------------------------------------------------------------
-- RLS and least-privilege table grants
-- ---------------------------------------------------------------------------
ALTER TABLE public.celebration_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebration_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebration_enquiry_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active celebration services" ON public.celebration_services;
CREATE POLICY "Public can view active celebration services"
  ON public.celebration_services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

-- Deliberately no anon/authenticated policies exist on either private table.
-- Submission is possible only through the narrowly granted RPC below.
REVOKE ALL ON TABLE public.celebration_services FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.celebration_enquiries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.celebration_enquiry_services FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.celebration_services TO anon, authenticated;
GRANT ALL ON TABLE public.celebration_services TO service_role;
GRANT ALL ON TABLE public.celebration_enquiries TO service_role;
GRANT ALL ON TABLE public.celebration_enquiry_services TO service_role;

-- ---------------------------------------------------------------------------
-- Transactional public submission RPC
-- ---------------------------------------------------------------------------
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
  p_notes TEXT DEFAULT NULL
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
  -- The initial release supports only this trusted location. Future locations
  -- must be enabled deliberately in a database migration and server flow.
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

  -- Normalize duplicate IDs. The junction primary key remains final protection.
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
    arrangement_preference, contact_name, mobile, email, relationship,
    preferred_contact_method, other_service_details, notes, status
  ) VALUES (
    p_location, p_celebration_type, btrim(p_husband_name), btrim(p_wife_name),
    p_husband_dob, p_wife_dob, NULLIF(btrim(p_husband_nakshatra), ''),
    NULLIF(btrim(p_wife_nakshatra), ''), NULLIF(btrim(p_husband_rasi), ''),
    NULLIF(btrim(p_wife_rasi), ''), p_preferred_date, p_alternative_date,
    p_guest_count_range, NULLIF(btrim(p_travelling_from), ''),
    p_arrangement_preference, btrim(p_contact_name), btrim(p_mobile),
    NULLIF(btrim(p_email), ''), NULLIF(btrim(p_relationship), ''),
    p_preferred_contact_method, NULLIF(btrim(p_other_service_details), ''),
    NULLIF(btrim(p_notes), ''), 'new'
  )
  RETURNING id INTO v_enquiry_id;

  INSERT INTO public.celebration_enquiry_services (enquiry_id, service_id)
  SELECT v_enquiry_id, service_id
  FROM unnest(v_service_ids) AS selected_services(service_id);

  RETURN v_enquiry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.create_celebration_enquiry(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID[], DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) IS 'Atomically creates a private Thirukadaiyur celebration enquiry and its validated service relationships.';

-- ---------------------------------------------------------------------------
-- Idempotent Thirukadaiyur catalogue seed
-- ---------------------------------------------------------------------------
INSERT INTO public.celebration_services
  (location, code, name, description, icon, is_active, display_order)
VALUES
  ('thirukadaiyur', 'vadhyar', 'Vadhyar / Priest', 'Request assistance coordinating a Vadhyar or priest.', 'priest', TRUE, 1),
  ('thirukadaiyur', 'pooja_materials', 'Pooja Materials', 'Request the materials needed for the agreed ceremonies.', 'pooja', TRUE, 2),
  ('thirukadaiyur', 'marriage_hall', 'Marriage Hall', 'Request help identifying a suitable marriage hall.', 'venue', TRUE, 3),
  ('thirukadaiyur', 'temple_coordination', 'Temple Coordination', 'Request assistance coordinating applicable temple arrangements.', 'temple', TRUE, 4),
  ('thirukadaiyur', 'catering', 'Catering', 'Request meal and catering arrangements for guests.', 'food', TRUE, 5),
  ('thirukadaiyur', 'decoration', 'Decoration', 'Request traditional or event decoration arrangements.', 'decoration', TRUE, 6),
  ('thirukadaiyur', 'photography', 'Photography', 'Request photography coverage for the celebration.', 'camera', TRUE, 7),
  ('thirukadaiyur', 'videography', 'Videography', 'Request video coverage for the celebration.', 'video', TRUE, 8),
  ('thirukadaiyur', 'nadaswaram', 'Nadaswaram', 'Request traditional Nadaswaram music arrangements.', 'music', TRUE, 9),
  ('thirukadaiyur', 'accommodation', 'Accommodation', 'Request accommodation coordination for the family or guests.', 'hotel', TRUE, 10),
  ('thirukadaiyur', 'transportation', 'Transportation', 'Request local transportation coordination.', 'transport', TRUE, 11),
  ('thirukadaiyur', 'invitations', 'Invitations', 'Request assistance with celebration invitations.', 'invitation', TRUE, 12),
  ('thirukadaiyur', 'return_gifts', 'Return Gifts', 'Request help arranging return gifts for guests.', 'gift', TRUE, 13),
  ('thirukadaiyur', 'complete_arrangement', 'Complete Arrangement', 'Request guidance on coordinating the celebration as a complete arrangement.', 'complete', TRUE, 14)
ON CONFLICT (location, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

COMMENT ON TABLE public.celebration_services IS 'Location-specific public catalogue of celebration services.';
COMMENT ON TABLE public.celebration_enquiries IS 'Private celebration enquiries, independent from matrimonial profiles.';
COMMENT ON TABLE public.celebration_enquiry_services IS 'Private relationship between celebration enquiries and requested catalogue services.';
