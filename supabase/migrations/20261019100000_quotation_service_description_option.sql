ALTER TABLE public.celebration_services
  ADD COLUMN IF NOT EXISTS show_description_in_quotation BOOLEAN NOT NULL DEFAULT true;
