-- Permit trusted system/test lifecycle calls without an administrator while retaining confirmation time.
ALTER TABLE public.event_vendor_assignments DROP CONSTRAINT IF EXISTS event_vendor_assignments_check1;
ALTER TABLE public.event_vendor_assignments ADD CONSTRAINT event_vendor_assignments_confirmation_timestamp_check CHECK ((status='confirmed')=(confirmed_at IS NOT NULL));
