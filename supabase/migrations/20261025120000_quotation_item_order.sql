-- Preserve the order in which service lines are supplied for a quotation.
-- `created_at` is identical for most rows inserted by the quotation RPC, so it
-- cannot reliably represent the order selected by an administrator.
ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS item_order INTEGER;

WITH ordered_items AS (
  SELECT id, row_number() OVER (PARTITION BY quotation_id ORDER BY created_at, id) AS item_order
  FROM public.quotation_items
)
UPDATE public.quotation_items AS quotation_item
SET item_order = ordered_items.item_order
FROM ordered_items
WHERE quotation_item.id = ordered_items.id
  AND quotation_item.item_order IS NULL;

ALTER TABLE public.quotation_items
  ALTER COLUMN item_order SET NOT NULL;

ALTER TABLE public.quotation_items
  ADD CONSTRAINT quotation_items_item_order_positive CHECK (item_order > 0),
  ADD CONSTRAINT quotation_items_quotation_id_item_order_key UNIQUE (quotation_id, item_order);

CREATE INDEX quotation_items_quotation_id_item_order_idx
  ON public.quotation_items (quotation_id, item_order);

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
  INSERT INTO public.quotation_items (quotation_id, celebration_service_id, service_code, service_name, quantity, unit_price, line_total, item_order)
  SELECT v_quotation_id, service.id, service.code, service.name, item.quantity, item.unit_price, round(item.quantity * item.unit_price, 2), entry.item_order::INTEGER
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS entry(value, item_order)
  CROSS JOIN LATERAL jsonb_to_record(entry.value) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC)
  JOIN public.celebration_services service ON service.id = item.service_id;
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
    INSERT INTO public.quotation_items (quotation_id, celebration_service_id, service_code, service_name, quantity, unit_price, line_total, item_order)
    SELECT p_quotation_id, service.id, service.code, service.name, item.quantity, item.unit_price, round(item.quantity * item.unit_price, 2), entry.item_order::INTEGER
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS entry(value, item_order)
    CROSS JOIN LATERAL jsonb_to_record(entry.value) AS item(service_id UUID, quantity INTEGER, unit_price NUMERIC)
    JOIN public.celebration_services service ON service.id = item.service_id;
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
