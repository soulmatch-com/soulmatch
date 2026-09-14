-- Adds the customer-facing daily reference without changing the UUID primary key.
-- This migration is intentionally not applied by Codex. Verify the approved
-- Supabase project before applying it remotely.

ALTER TABLE public.celebration_enquiries
  ADD COLUMN IF NOT EXISTS enquiry_reference TEXT;

CREATE TABLE IF NOT EXISTS public.celebration_enquiry_reference_counters (
  reference_date DATE PRIMARY KEY,
  last_number INTEGER NOT NULL,
  CONSTRAINT celebration_enquiry_reference_counters_last_number_check CHECK (last_number > 0 AND last_number <= 99999)
);

CREATE UNIQUE INDEX IF NOT EXISTS celebration_enquiries_enquiry_reference_unique
  ON public.celebration_enquiries (enquiry_reference)
  WHERE enquiry_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_celebration_enquiry_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reference_date DATE;
  v_sequence_number INTEGER;
BEGIN
  IF NEW.enquiry_reference IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_reference_date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;

  INSERT INTO public.celebration_enquiry_reference_counters (reference_date, last_number)
  VALUES (v_reference_date, 1)
  ON CONFLICT (reference_date)
  DO UPDATE SET last_number = public.celebration_enquiry_reference_counters.last_number + 1
  RETURNING last_number INTO v_sequence_number;

  IF v_sequence_number > 99999 THEN
    RAISE EXCEPTION 'Daily enquiry reference limit reached' USING ERRCODE = '22023';
  END IF;

  NEW.enquiry_reference := 'MYT-' || to_char(v_reference_date, 'DDMMYYYY') || '-' || lpad(v_sequence_number::text, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_celebration_enquiry_reference ON public.celebration_enquiries;
CREATE TRIGGER assign_celebration_enquiry_reference
  BEFORE INSERT ON public.celebration_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_celebration_enquiry_reference();

ALTER TABLE public.celebration_enquiry_reference_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.celebration_enquiry_reference_counters FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_celebration_enquiry_reference() FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.celebration_enquiries.enquiry_reference IS 'Customer-facing MYT-DDMMYYYY-00001 reference; NULL for historical enquiries.';
COMMENT ON TABLE public.celebration_enquiry_reference_counters IS 'Private atomic daily sequence for celebration enquiry references.';
