-- Past event dates close only leads that are still in the active sales pipeline.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'follow_up', 'qualified', 'confirmed', 'completed', 'lost', 'expired'));

CREATE INDEX IF NOT EXISTS idx_leads_event_date_active ON public.leads (event_date)
  WHERE status IN ('new', 'contacted', 'follow_up', 'qualified');
