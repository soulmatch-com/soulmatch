-- Phase 4A: booking headers, immutable service snapshots and server-controlled lifecycle.
CREATE TABLE public.celebration_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE,
  quotation_id UUID NOT NULL UNIQUE REFERENCES public.quotations(id) ON DELETE RESTRICT,
  primary_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ceremony_type TEXT,
  event_date DATE,
  customer_name TEXT,
  customer_contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  quoted_total NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT celebration_bookings_status_check CHECK (status IN ('pending_confirmation', 'confirmed', 'planning', 'ready', 'completed', 'cancelled')),
  CONSTRAINT celebration_bookings_customer_name_check CHECK (customer_name IS NULL OR char_length(btrim(customer_name)) BETWEEN 1 AND 150),
  CONSTRAINT celebration_bookings_customer_contact_check CHECK (customer_contact IS NULL OR char_length(btrim(customer_contact)) BETWEEN 1 AND 320),
  CONSTRAINT celebration_bookings_total_check CHECK (quoted_total >= 0),
  CONSTRAINT celebration_bookings_currency_check CHECK (currency = 'INR')
);

-- This snapshots a quotation's many-to-many lead links, even when no defensible primary exists.
CREATE TABLE public.celebration_booking_leads (
  booking_id UUID NOT NULL REFERENCES public.celebration_bookings(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, lead_id)
);

CREATE TABLE public.celebration_booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.celebration_bookings(id) ON DELETE CASCADE,
  quotation_item_id UUID NOT NULL REFERENCES public.quotation_items(id) ON DELETE RESTRICT,
  service_id UUID REFERENCES public.celebration_services(id) ON DELETE SET NULL,
  service_name_snapshot TEXT NOT NULL,
  service_code_snapshot TEXT NOT NULL,
  description_snapshot TEXT,
  quantity INTEGER NOT NULL,
  unit_price_snapshot NUMERIC(12,2) NOT NULL,
  total_price_snapshot NUMERIC(12,2) NOT NULL,
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT celebration_booking_services_quantity_check CHECK (quantity >= 1),
  CONSTRAINT celebration_booking_services_amount_check CHECK (unit_price_snapshot >= 0 AND total_price_snapshot >= 0),
  CONSTRAINT celebration_booking_services_fulfillment_check CHECK (fulfillment_status IN ('pending', 'in_progress', 'fulfilled', 'cancelled')),
  CONSTRAINT celebration_booking_services_notes_check CHECK (notes IS NULL OR char_length(notes) <= 2000),
  UNIQUE (booking_id, quotation_item_id)
);

CREATE TABLE public.celebration_booking_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.celebration_bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'status_transition')),
  previous_status TEXT,
  new_status TEXT,
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX celebration_bookings_status_created_at_idx ON public.celebration_bookings(status, created_at DESC);
CREATE INDEX celebration_bookings_event_date_idx ON public.celebration_bookings(event_date);
CREATE INDEX celebration_booking_services_booking_id_idx ON public.celebration_booking_services(booking_id);
CREATE INDEX celebration_booking_activities_booking_created_at_idx ON public.celebration_booking_activities(booking_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_celebration_booking_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER celebration_bookings_updated_at BEFORE UPDATE ON public.celebration_bookings FOR EACH ROW EXECUTE FUNCTION public.set_celebration_booking_updated_at();

ALTER TABLE public.celebration_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebration_booking_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebration_booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebration_booking_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.celebration_bookings, public.celebration_booking_leads, public.celebration_booking_services, public.celebration_booking_activities FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.celebration_bookings, public.celebration_booking_leads, public.celebration_booking_services, public.celebration_booking_activities TO service_role;

CREATE OR REPLACE FUNCTION public.create_admin_booking(p_quotation_id UUID, p_admin_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $create_booking$
DECLARE
  v_booking_id UUID; v_status TEXT; v_total NUMERIC(12,2); v_currency TEXT;
  v_lead_count INTEGER; v_primary_lead UUID; v_name TEXT; v_contact TEXT; v_type TEXT; v_date DATE;
  v_reference TEXT;
BEGIN
  SELECT status, total_amount, currency INTO v_status, v_total, v_currency FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002'; END IF;
  SELECT id INTO v_booking_id FROM public.celebration_bookings WHERE quotation_id = p_quotation_id;
  IF FOUND THEN RETURN v_booking_id; END IF;
  IF v_status <> 'accepted' THEN RAISE EXCEPTION 'Only accepted quotations can be converted to a booking' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id = p_quotation_id) THEN RAISE EXCEPTION 'Accepted quotation has no service items' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_lead_count FROM public.quotation_leads WHERE quotation_id = p_quotation_id;
  IF v_lead_count = 1 THEN
    SELECT lead.id, lead.contact_name, COALESCE(NULLIF(lead.mobile, ''), NULLIF(lead.email, '')), lead.event_type, lead.event_date
      INTO v_primary_lead, v_name, v_contact, v_type, v_date
      FROM public.quotation_leads ql JOIN public.leads lead ON lead.id = ql.lead_id WHERE ql.quotation_id = p_quotation_id;
  END IF;
  LOOP
    v_reference := 'BK-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));
    BEGIN
      INSERT INTO public.celebration_bookings (booking_reference, quotation_id, primary_lead_id, ceremony_type, event_date, customer_name, customer_contact, quoted_total, currency, created_by)
      VALUES (v_reference, p_quotation_id, v_primary_lead, v_type, v_date, v_name, v_contact, v_total, v_currency, p_admin_id) RETURNING id INTO v_booking_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_booking_id FROM public.celebration_bookings WHERE quotation_id = p_quotation_id;
      IF FOUND THEN RETURN v_booking_id; END IF;
    END;
  END LOOP;
  INSERT INTO public.celebration_booking_leads (booking_id, lead_id)
    SELECT v_booking_id, lead_id FROM public.quotation_leads WHERE quotation_id = p_quotation_id;
  INSERT INTO public.celebration_booking_services (booking_id, quotation_item_id, service_id, service_name_snapshot, service_code_snapshot, description_snapshot, quantity, unit_price_snapshot, total_price_snapshot)
    SELECT v_booking_id, qi.id, qi.celebration_service_id, qi.service_name, qi.service_code, service.description, qi.quantity, qi.unit_price, qi.line_total
    FROM public.quotation_items qi LEFT JOIN public.celebration_services service ON service.id = qi.celebration_service_id WHERE qi.quotation_id = p_quotation_id;
  INSERT INTO public.celebration_booking_activities (booking_id, event_type, new_status, admin_id, metadata)
    VALUES (v_booking_id, 'created', 'pending_confirmation', p_admin_id, jsonb_build_object('quotation_id', p_quotation_id, 'linked_lead_count', v_lead_count));
  RETURN v_booking_id;
END;
$create_booking$;

CREATE OR REPLACE FUNCTION public.transition_admin_booking(p_booking_id UUID, p_to_status TEXT, p_admin_id UUID, p_cancellation_reason TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $transition_booking$
DECLARE v_from_status TEXT;
BEGIN
  SELECT status INTO v_from_status FROM public.celebration_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF p_to_status NOT IN ('pending_confirmation', 'confirmed', 'planning', 'ready', 'completed', 'cancelled') THEN RAISE EXCEPTION 'Invalid booking status transition' USING ERRCODE = '22023'; END IF;
  IF (v_from_status = 'pending_confirmation' AND p_to_status NOT IN ('confirmed', 'cancelled')) OR
     (v_from_status = 'confirmed' AND p_to_status NOT IN ('planning', 'cancelled')) OR
     (v_from_status = 'planning' AND p_to_status NOT IN ('ready', 'cancelled')) OR
     (v_from_status = 'ready' AND p_to_status NOT IN ('completed', 'cancelled')) OR
     v_from_status IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'Status transition is not allowed' USING ERRCODE = '22023'; END IF;
  IF p_to_status = 'cancelled' AND NULLIF(btrim(p_cancellation_reason), '') IS NULL THEN RAISE EXCEPTION 'A cancellation reason is required' USING ERRCODE = '22023'; END IF;
  IF p_to_status <> 'cancelled' AND p_cancellation_reason IS NOT NULL THEN RAISE EXCEPTION 'A cancellation reason is only valid when cancelling' USING ERRCODE = '22023'; END IF;
  UPDATE public.celebration_bookings SET status = p_to_status WHERE id = p_booking_id;
  INSERT INTO public.celebration_booking_activities (booking_id, event_type, previous_status, new_status, admin_id, metadata)
    VALUES (p_booking_id, 'status_transition', v_from_status, p_to_status, p_admin_id, CASE WHEN p_to_status = 'cancelled' THEN jsonb_build_object('cancellation_reason', btrim(p_cancellation_reason)) ELSE '{}'::jsonb END);
  RETURN p_booking_id;
END;
$transition_booking$;

REVOKE ALL ON FUNCTION public.create_admin_booking(UUID, UUID), public.transition_admin_booking(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_booking(UUID, UUID), public.transition_admin_booking(UUID, TEXT, UUID, TEXT) TO service_role;
