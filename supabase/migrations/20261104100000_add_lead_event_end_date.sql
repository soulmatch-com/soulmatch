-- Two-session celebrations can span consecutive dates. Keep the first session
-- in event_date and store the final session date separately.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS event_end_date date;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_event_end_date_after_start;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_event_end_date_after_start
  CHECK (event_end_date IS NULL OR event_date IS NULL OR event_end_date > event_date);
