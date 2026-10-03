-- One private workspace for website, WhatsApp, Instagram and manually entered leads.
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_enquiry_id UUID UNIQUE REFERENCES public.celebration_enquiries(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new',
  contact_name TEXT NOT NULL,
  mobile TEXT,
  email TEXT,
  requirement_summary TEXT,
  event_date DATE,
  event_type TEXT,
  event_session TEXT,
  total_members INTEGER,
  assigned_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  next_follow_up_at TIMESTAMPTZ,
  lost_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leads_source_check CHECK (source IN ('website', 'instagram', 'whatsapp', 'call', 'referral', 'other')),
  CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'follow_up', 'qualified', 'confirmed', 'completed', 'lost')),
  CONSTRAINT leads_contact_name_check CHECK (char_length(btrim(contact_name)) BETWEEN 1 AND 150),
  CONSTRAINT leads_mobile_length_check CHECK (mobile IS NULL OR char_length(btrim(mobile)) BETWEEN 7 AND 30),
  CONSTRAINT leads_email_length_check CHECK (email IS NULL OR char_length(email) <= 320),
  CONSTRAINT leads_requirement_summary_length_check CHECK (requirement_summary IS NULL OR char_length(requirement_summary) <= 2000),
  CONSTRAINT leads_lost_reason_length_check CHECK (lost_reason IS NULL OR char_length(lost_reason) <= 500)
);

-- Supports databases where the first lead migration was already applied.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS event_session TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_members INTEGER;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_event_type_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_event_type_check CHECK (event_type IS NULL OR event_type IN ('60th-marriage', '70th-marriage', '80th-marriage'));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_event_session_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_event_session_check CHECK (event_session IS NULL OR event_session IN ('one_session', 'two_sessions'));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_total_members_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_total_members_check CHECK (total_members IS NULL OR total_members BETWEEN 1 AND 10000);

CREATE INDEX IF NOT EXISTS idx_leads_status_created_at ON public.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads (next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_created_at ON public.leads (source, created_at DESC);

-- Keep this migration self-contained: older databases may not have the
-- celebration-specific updated-at helper installed.
CREATE OR REPLACE FUNCTION public.set_lead_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_lead_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_notes_body_check CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_created_at ON public.lead_notes (lead_id, created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.leads FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.lead_notes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.leads TO service_role;
GRANT ALL ON TABLE public.lead_notes TO service_role;

-- Make existing website enquiries available immediately after this migration.
INSERT INTO public.leads (celebration_enquiry_id, source, status, contact_name, mobile, email, requirement_summary, created_at, updated_at)
SELECT id, 'website',
  CASE status
    WHEN 'new' THEN 'new'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'planning' THEN 'qualified'
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'lost'
    ELSE 'new'
  END,
  contact_name, mobile, email,
  COALESCE(NULLIF(other_service_details, ''), NULLIF(special_requirements, ''), NULLIF(notes, '')),
  created_at, updated_at
FROM public.celebration_enquiries
ON CONFLICT (celebration_enquiry_id) DO NOTHING;

-- Fill event dates for leads created before this field was introduced.
UPDATE public.leads AS lead
SET event_date = enquiry.preferred_date
FROM public.celebration_enquiries AS enquiry
WHERE lead.celebration_enquiry_id = enquiry.id
  AND lead.event_date IS NULL;

UPDATE public.leads AS lead
SET event_type = CASE WHEN enquiry.celebration_type IN ('60th-marriage', '70th-marriage', '80th-marriage') THEN enquiry.celebration_type ELSE NULL END,
    event_session = enquiry.ceremony_duration,
    total_members = COALESCE(enquiry.expected_guest_count, lead.total_members)
FROM public.celebration_enquiries AS enquiry
WHERE lead.celebration_enquiry_id = enquiry.id
  AND (lead.event_type IS NULL OR lead.event_session IS NULL OR lead.total_members IS NULL);

COMMENT ON TABLE public.leads IS 'Private, unified sales and enquiry pipeline. Admin access only.';
COMMENT ON TABLE public.lead_notes IS 'Private, timestamped staff notes for a lead.';
