-- Phase 3: server-enforced quotation lifecycle, audit history, and manual delivery records.
-- A DATE is valid through that whole database CURRENT_DATE calendar day.

ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'));
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.quotation_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('status_transition', 'expired', 'reopened', 'delivery_recorded')),
  previous_status TEXT,
  new_status TEXT,
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quotation_activity_quotation_created_at_idx
  ON public.quotation_activity (quotation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.quotation_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL CHECK (char_length(btrim(recipient_name)) BETWEEN 1 AND 150),
  recipient_contact TEXT NOT NULL CHECK (char_length(btrim(recipient_contact)) BETWEEN 1 AND 320),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'manual')),
  delivery_kind TEXT NOT NULL DEFAULT 'manual' CHECK (delivery_kind IN ('manual', 'provider_verified')),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quotation_deliveries_quotation_delivered_at_idx
  ON public.quotation_deliveries (quotation_id, delivered_at DESC);

ALTER TABLE public.quotation_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.quotation_activity, public.quotation_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.quotation_activity, public.quotation_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.create_admin_quotation(
  p_quotation_number TEXT, p_valid_until DATE, p_notes TEXT, p_created_by UUID,
  p_items JSONB, p_lead_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $create_quote$
DECLARE v_quotation_id UUID; v_item_count INTEGER; v_service_count INTEGER; v_lead_count INTEGER; v_total NUMERIC(12,2);
BEGIN
  IF p_valid_until IS NOT NULL AND p_valid_until < CURRENT_DATE THEN RAISE EXCEPTION 'Validity date cannot be in the past' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 THEN RAISE EXCEPTION 'At least one quotation item is required' USING ERRCODE = '22023'; END IF;
  SELECT count(*), count(DISTINCT service_id) INTO v_item_count, v_service_count FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
  IF v_item_count <> v_service_count THEN RAISE EXCEPTION 'Duplicate services are not allowed' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) WHERE service_id IS NULL OR quantity IS NULL OR quantity < 1 OR unit_price IS NULL OR unit_price < 0) THEN RAISE EXCEPTION 'Invalid quotation item' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_service_count FROM public.celebration_services service JOIN jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) ON item.service_id = service.id WHERE service.is_active = TRUE;
  IF v_service_count <> v_item_count THEN RAISE EXCEPTION 'One or more selected services are no longer available' USING ERRCODE = '22023'; END IF;
  IF cardinality(p_lead_ids) <> cardinality(ARRAY(SELECT DISTINCT unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])))) THEN RAISE EXCEPTION 'Duplicate leads are not allowed' USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO v_lead_count FROM public.leads WHERE id = ANY(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AND status <> 'expired';
  IF v_lead_count <> cardinality(COALESCE(p_lead_ids, ARRAY[]::UUID[])) THEN RAISE EXCEPTION 'One or more selected leads could not be found' USING ERRCODE = '22023'; END IF;
  SELECT COALESCE(sum(round(item.quantity * item.unit_price, 2)), 0) INTO v_total FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
  INSERT INTO public.quotations (quotation_number, valid_until, notes, total_amount, created_by) VALUES (p_quotation_number, p_valid_until, NULLIF(btrim(p_notes), ''), v_total, p_created_by) RETURNING id INTO v_quotation_id;
  INSERT INTO public.quotation_items (quotation_id, celebration_service_id, service_code, service_name, quantity, unit_price, line_total) SELECT v_quotation_id, service.id, service.code, service.name, item.quantity, item.unit_price, round(item.quantity * item.unit_price, 2) FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) JOIN public.celebration_services service ON service.id = item.service_id;
  INSERT INTO public.quotation_leads (quotation_id, lead_id) SELECT v_quotation_id, lead_id FROM unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AS link(lead_id);
  RETURN v_quotation_id;
END;
$create_quote$;

CREATE OR REPLACE FUNCTION public.update_admin_quotation(
  p_quotation_id UUID, p_status TEXT, p_set_valid_until BOOLEAN, p_valid_until DATE,
  p_set_notes BOOLEAN, p_notes TEXT, p_replace_items BOOLEAN, p_items JSONB,
  p_replace_leads BOOLEAN, p_lead_ids UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $update_quote$
DECLARE v_item_count INTEGER; v_service_count INTEGER; v_lead_count INTEGER; v_total NUMERIC(12,2); v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002'; END IF;
  IF p_status IS NOT NULL THEN RAISE EXCEPTION 'Use the quotation lifecycle transition operation to change status' USING ERRCODE = '22023'; END IF;
  IF v_status IN ('accepted', 'rejected', 'cancelled') AND (p_set_valid_until OR p_set_notes OR p_replace_items OR p_replace_leads) THEN RAISE EXCEPTION 'Terminal quotations cannot be edited' USING ERRCODE = '22023'; END IF;
  IF p_set_valid_until AND p_valid_until IS NOT NULL AND p_valid_until < CURRENT_DATE THEN RAISE EXCEPTION 'Validity date cannot be in the past' USING ERRCODE = '22023'; END IF;
  IF p_replace_items THEN
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 THEN RAISE EXCEPTION 'At least one quotation item is required' USING ERRCODE = '22023'; END IF;
    SELECT count(*), count(DISTINCT service_id) INTO v_item_count, v_service_count FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
    IF v_item_count <> v_service_count OR EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) WHERE service_id IS NULL OR quantity IS NULL OR quantity < 1 OR unit_price IS NULL OR unit_price < 0) THEN RAISE EXCEPTION 'Invalid quotation items' USING ERRCODE = '22023'; END IF;
    SELECT count(*) INTO v_service_count FROM public.celebration_services service JOIN jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) ON item.service_id = service.id;
    IF v_service_count <> v_item_count THEN RAISE EXCEPTION 'One or more selected services could not be found' USING ERRCODE = '22023'; END IF;
    SELECT COALESCE(sum(round(quantity * unit_price, 2)), 0) INTO v_total FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC);
    DELETE FROM public.quotation_items WHERE quotation_id = p_quotation_id;
    INSERT INTO public.quotation_items (quotation_id, celebration_service_id, service_code, service_name, quantity, unit_price, line_total) SELECT p_quotation_id, service.id, service.code, service.name, item.quantity, item.unit_price, round(item.quantity * item.unit_price, 2) FROM jsonb_to_recordset(p_items) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC) JOIN public.celebration_services service ON service.id = item.service_id;
  END IF;
  IF p_replace_leads THEN
    IF cardinality(p_lead_ids) <> cardinality(ARRAY(SELECT DISTINCT unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])))) THEN RAISE EXCEPTION 'Duplicate leads are not allowed' USING ERRCODE = '22023'; END IF;
    SELECT count(*) INTO v_lead_count FROM public.leads WHERE id = ANY(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AND status <> 'expired';
    IF v_lead_count <> cardinality(COALESCE(p_lead_ids, ARRAY[]::UUID[])) THEN RAISE EXCEPTION 'One or more selected leads could not be found' USING ERRCODE = '22023'; END IF;
    DELETE FROM public.quotation_leads WHERE quotation_id = p_quotation_id;
    INSERT INTO public.quotation_leads (quotation_id, lead_id) SELECT p_quotation_id, lead_id FROM unnest(COALESCE(p_lead_ids, ARRAY[]::UUID[])) AS link(lead_id);
  END IF;
  UPDATE public.quotations SET valid_until = CASE WHEN p_set_valid_until THEN p_valid_until ELSE valid_until END, notes = CASE WHEN p_set_notes THEN NULLIF(btrim(p_notes), '') ELSE notes END, total_amount = CASE WHEN p_replace_items THEN v_total ELSE total_amount END, updated_at = NOW() WHERE id = p_quotation_id;
  RETURN p_quotation_id;
END;
$update_quote$;

CREATE OR REPLACE FUNCTION public.transition_admin_quotation(
  p_quotation_id UUID, p_to_status TEXT, p_admin_id UUID, p_reopen_valid_until DATE DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $transition_quote$
DECLARE v_from_status TEXT; v_valid_until DATE; v_event_type TEXT;
BEGIN
  SELECT status, valid_until INTO v_from_status, v_valid_until FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002'; END IF;
  IF p_to_status NOT IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled') THEN RAISE EXCEPTION 'Invalid quotation status transition' USING ERRCODE = '22023'; END IF;
  IF (v_from_status = 'draft' AND p_to_status NOT IN ('sent', 'cancelled')) OR (v_from_status = 'sent' AND p_to_status NOT IN ('accepted', 'rejected', 'expired', 'cancelled')) OR (v_from_status = 'expired' AND p_to_status <> 'draft') OR v_from_status IN ('accepted', 'rejected', 'cancelled') THEN RAISE EXCEPTION 'Status transition is not allowed' USING ERRCODE = '22023'; END IF;
  IF p_to_status = 'accepted' AND v_valid_until IS NOT NULL AND v_valid_until < CURRENT_DATE THEN RAISE EXCEPTION 'An expired quotation cannot be accepted' USING ERRCODE = '22023'; END IF;
  IF v_from_status = 'expired' THEN
    IF p_reopen_valid_until IS NULL OR p_reopen_valid_until < CURRENT_DATE THEN RAISE EXCEPTION 'Reopening requires a new validity date that is today or later' USING ERRCODE = '22023'; END IF;
    v_valid_until := p_reopen_valid_until;
  ELSIF p_reopen_valid_until IS NOT NULL THEN
    RAISE EXCEPTION 'A new validity date is only allowed when reopening an expired quotation' USING ERRCODE = '22023';
  END IF;
  v_event_type := CASE WHEN p_to_status = 'expired' THEN 'expired' WHEN v_from_status = 'expired' THEN 'reopened' ELSE 'status_transition' END;
  UPDATE public.quotations SET status = p_to_status, valid_until = v_valid_until, status_changed_at = NOW(), updated_at = NOW() WHERE id = p_quotation_id;
  INSERT INTO public.quotation_activity (quotation_id, event_type, previous_status, new_status, admin_id, metadata) VALUES (p_quotation_id, v_event_type, v_from_status, p_to_status, p_admin_id, CASE WHEN v_from_status = 'expired' THEN jsonb_build_object('valid_until', v_valid_until) ELSE '{}'::jsonb END);
  RETURN p_quotation_id;
END;
$transition_quote$;

CREATE OR REPLACE FUNCTION public.record_admin_quotation_delivery(
  p_quotation_id UUID, p_recipient_name TEXT, p_recipient_contact TEXT, p_channel TEXT, p_notes TEXT, p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $record_delivery$
DECLARE v_delivery_id UUID;
BEGIN
  PERFORM 1 FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002'; END IF;
  IF NULLIF(btrim(p_recipient_name), '') IS NULL OR NULLIF(btrim(p_recipient_contact), '') IS NULL OR p_channel NOT IN ('email', 'whatsapp', 'manual') THEN RAISE EXCEPTION 'Invalid delivery details' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.quotation_deliveries (quotation_id, recipient_name, recipient_contact, channel, delivery_kind, notes, recorded_by) VALUES (p_quotation_id, btrim(p_recipient_name), btrim(p_recipient_contact), p_channel, 'manual', NULLIF(btrim(p_notes), ''), p_admin_id) RETURNING id INTO v_delivery_id;
  INSERT INTO public.quotation_activity (quotation_id, event_type, admin_id, metadata) VALUES (p_quotation_id, 'delivery_recorded', p_admin_id, jsonb_build_object('delivery_id', v_delivery_id, 'channel', p_channel, 'delivery_kind', 'manual'));
  RETURN v_delivery_id;
END;
$record_delivery$;

REVOKE ALL ON FUNCTION public.transition_admin_quotation(UUID, TEXT, UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_admin_quotation_delivery(UUID, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_admin_quotation(UUID, TEXT, UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_admin_quotation_delivery(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
