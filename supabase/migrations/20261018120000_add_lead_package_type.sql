-- Store the Basic/Premium preference for manually created and website leads.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS package_type TEXT;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_package_type_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_package_type_check
  CHECK (package_type IS NULL OR package_type IN ('basic', 'premium'));

-- Preserve the package selected with an existing website enquiry.
UPDATE public.leads AS lead
SET package_type = enquiry.plan_type
FROM public.celebration_enquiries AS enquiry
WHERE lead.celebration_enquiry_id = enquiry.id
  AND lead.package_type IS NULL
  AND enquiry.plan_type IN ('basic', 'premium');
