-- Run locally after 20261113120000. Every fixture rolls back.
BEGIN;
DO $test$
DECLARE
  v_service UUID; v_lead UUID; v_other_lead UUID; v_quote UUID;
  v_number TEXT := 'ATOMIC-' || gen_random_uuid();
  v_before JSONB; v_items JSONB;
BEGIN
  INSERT INTO public.celebration_services (code, name, location, is_active, display_order)
  VALUES (v_number, 'Atomic quotation service', 'thirukadaiyur', TRUE, 99999) RETURNING id INTO v_service;
  INSERT INTO public.leads (source, contact_name) VALUES ('other', 'Atomic original lead') RETURNING id INTO v_lead;
  INSERT INTO public.leads (source, contact_name) VALUES ('other', 'Atomic replacement lead') RETURNING id INTO v_other_lead;

  -- A description constraint failure must not leave an orphaned quotation.
  BEGIN
    PERFORM public.create_admin_quotation(v_number, NULL, NULL, NULL,
      jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 1, 'unit_price', 10, 'description_override', repeat('x', 1001))), ARRAY[v_lead]);
    RAISE EXCEPTION 'Invalid description creation unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.quotations WHERE quotation_number = v_number) THEN RAISE EXCEPTION 'Failed create left a partial quotation'; END IF;

  v_quote := public.create_admin_quotation(v_number, CURRENT_DATE + 10, 'Original notes', NULL,
    jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 2, 'unit_price', 12.50, 'description_override', '  Original description  ')), ARRAY[v_lead]);
  IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id = v_quote AND description_override = 'Original description' AND line_total = 25) THEN RAISE EXCEPTION 'Create did not persist the description'; END IF;
  SELECT to_jsonb(q) INTO v_before FROM public.quotations q WHERE id = v_quote;
  SELECT jsonb_agg(to_jsonb(i) ORDER BY item_order) INTO v_items FROM public.quotation_items i WHERE quotation_id = v_quote;

  BEGIN
    PERFORM public.update_admin_quotation(v_quote, NULL, TRUE, CURRENT_DATE + 20, TRUE, 'Changed notes', TRUE,
      jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 3, 'unit_price', 50, 'description_override', repeat('x', 1001))), TRUE, ARRAY[v_other_lead]);
    RAISE EXCEPTION 'Invalid description update unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT to_jsonb(q) FROM public.quotations q WHERE id = v_quote) IS DISTINCT FROM v_before
    OR (SELECT jsonb_agg(to_jsonb(i) ORDER BY item_order) FROM public.quotation_items i WHERE quotation_id = v_quote) IS DISTINCT FROM v_items
    OR NOT EXISTS (SELECT 1 FROM public.quotation_leads WHERE quotation_id = v_quote AND lead_id = v_lead) THEN
    RAISE EXCEPTION 'Failed description update changed quotation details, items or leads';
  END IF;

  PERFORM public.update_admin_quotation(v_quote, NULL, FALSE, NULL, TRUE, 'Changed notes', TRUE,
    jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 3, 'unit_price', 50, 'description_override', '  Revised description  ')), TRUE, ARRAY[v_other_lead]);
  IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id = v_quote AND description_override = 'Revised description' AND line_total = 150)
    OR NOT EXISTS (SELECT 1 FROM public.quotations WHERE id = v_quote AND notes = 'Changed notes' AND total_amount = 150)
    OR NOT EXISTS (SELECT 1 FROM public.quotation_leads WHERE quotation_id = v_quote AND lead_id = v_other_lead) THEN
    RAISE EXCEPTION 'Valid update did not persist all quotation details';
  END IF;
  IF has_function_privilege('anon', 'public.create_admin_quotation(text,date,text,uuid,jsonb,uuid[])', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.update_admin_quotation(uuid,text,boolean,date,boolean,text,boolean,jsonb,boolean,uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Quotation writes are exposed to non-server callers';
  END IF;
END;
$test$;
ROLLBACK;
