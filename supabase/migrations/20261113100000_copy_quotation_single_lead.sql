-- Preserve historical multi-lead quotations; prevent adding new shared links.
-- Lock the parent to serialize concurrent attempts to link different leads.
CREATE OR REPLACE FUNCTION public.enforce_quotation_single_lead()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $single_lead$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.quotation_id = OLD.quotation_id THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.quotations WHERE id = NEW.quotation_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.quotation_leads WHERE quotation_id = NEW.quotation_id AND lead_id <> NEW.lead_id) THEN
    RAISE EXCEPTION 'A quotation can be linked to only one lead. Copy it for another customer.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$single_lead$;

CREATE TRIGGER quotation_single_lead
BEFORE INSERT OR UPDATE OF quotation_id ON public.quotation_leads
FOR EACH ROW EXECUTE FUNCTION public.enforce_quotation_single_lead();

-- Copy commercial snapshots in one transaction. All lifecycle and customer
-- records belong to the source; the new draft starts without leads or validity.
CREATE OR REPLACE FUNCTION public.copy_admin_quotation(
  p_source_quotation_id UUID, p_quotation_number TEXT, p_admin_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $copy_quote$
DECLARE v_source public.quotations%ROWTYPE; v_quotation_id UUID; v_total NUMERIC(12,2);
BEGIN
  SELECT * INTO v_source FROM public.quotations WHERE id = p_source_quotation_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002'; END IF;
  SELECT sum(line_total) INTO v_total FROM public.quotation_items WHERE quotation_id = p_source_quotation_id;
  IF v_total IS NULL THEN RAISE EXCEPTION 'A quotation without service items cannot be copied' USING ERRCODE = '22023'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.quotation_items item
    JOIN public.celebration_services service ON service.id = item.celebration_service_id
    WHERE item.quotation_id = p_source_quotation_id AND NOT service.is_active
  ) THEN
    RAISE EXCEPTION 'This quotation contains inactive services. Create a new quotation with available services.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.quotations (quotation_number, status, currency, valid_until, notes, total_amount, created_by)
  VALUES (p_quotation_number, 'draft', v_source.currency, NULL, v_source.notes, v_total, p_admin_id)
  RETURNING id INTO v_quotation_id;

  INSERT INTO public.quotation_items (
    quotation_id, celebration_service_id, service_code, service_name,
    description_override, quantity, unit_price, line_total, item_order
  )
  SELECT v_quotation_id, celebration_service_id, service_code, service_name,
    description_override, quantity, unit_price, line_total, item_order
  FROM public.quotation_items WHERE quotation_id = p_source_quotation_id;

  RETURN v_quotation_id;
END;
$copy_quote$;

REVOKE ALL ON FUNCTION public.copy_admin_quotation(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.copy_admin_quotation(UUID, TEXT, UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
