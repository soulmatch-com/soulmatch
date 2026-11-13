-- Run against the local database after 20261113100000. Fixtures roll back.
BEGIN;
DO $test$
DECLARE
  v_service UUID; v_other_service UUID; v_lead UUID; v_other_lead UUID;
  v_source UUID; v_copy UUID; v_booking UUID; v_before JSONB; v_items JSONB;
  v_count INTEGER; v_status TEXT;
BEGIN
  INSERT INTO public.celebration_services (code, name, location, is_active, display_order)
  VALUES ('copy_' || substr(gen_random_uuid()::text, 1, 8), 'Original service', 'thirukadaiyur', TRUE, 99998) RETURNING id INTO v_service;
  INSERT INTO public.celebration_services (code, name, location, is_active, display_order)
  VALUES ('copy_' || substr(gen_random_uuid()::text, 1, 8), 'Second service', 'thirukadaiyur', TRUE, 99999) RETURNING id INTO v_other_service;
  INSERT INTO public.leads (source, contact_name) VALUES ('other', 'Original customer') RETURNING id INTO v_lead;
  INSERT INTO public.leads (source, contact_name) VALUES ('other', 'New customer') RETURNING id INTO v_other_lead;
  v_source := public.create_admin_quotation('COPY-SOURCE-' || gen_random_uuid(), CURRENT_DATE + 10, 'Review family notes', NULL,
    jsonb_build_array(jsonb_build_object('service_id', v_other_service, 'quantity', 3, 'unit_price', 123.45),
                     jsonb_build_object('service_id', v_service, 'quantity', 2, 'unit_price', 456.78)), ARRAY[v_lead]);
  UPDATE public.quotation_items SET description_override = 'Customer-specific description' WHERE quotation_id = v_source AND celebration_service_id = v_service;
  -- The catalogue may change after the original offer was made.
  UPDATE public.celebration_services SET name = 'Renamed catalogue service' WHERE id = v_service;
  PERFORM public.transition_admin_quotation(v_source, 'sent', NULL);
  PERFORM public.record_admin_quotation_delivery(v_source, 'Original customer', '9876543210', 'manual', NULL, NULL);
  PERFORM public.transition_admin_quotation(v_source, 'accepted', NULL);
  v_booking := public.create_admin_booking(v_source, NULL);
  SELECT to_jsonb(q) INTO v_before FROM public.quotations q WHERE id = v_source;
  SELECT jsonb_agg(to_jsonb(i) - 'id' - 'quotation_id' - 'created_at' ORDER BY item_order) INTO v_items FROM public.quotation_items i WHERE quotation_id = v_source;

  v_copy := public.copy_admin_quotation(v_source, 'COPY-NEW-' || gen_random_uuid(), NULL);
  IF v_copy = v_source THEN RAISE EXCEPTION 'Copy reused source ID'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotations WHERE id = v_copy AND status = 'draft' AND valid_until IS NULL AND notes = 'Review family notes' AND total_amount = 1283.91) THEN
    RAISE EXCEPTION 'Copy did not reset lifecycle or preserve commercial details';
  END IF;
  IF (SELECT jsonb_agg(to_jsonb(i) - 'id' - 'quotation_id' - 'created_at' ORDER BY item_order) FROM public.quotation_items i WHERE quotation_id = v_copy) IS DISTINCT FROM v_items THEN
    RAISE EXCEPTION 'Copied snapshots, descriptions or item order differ';
  END IF;
  IF EXISTS (SELECT 1 FROM public.quotation_leads WHERE quotation_id = v_copy)
    OR EXISTS (SELECT 1 FROM public.quotation_activity WHERE quotation_id = v_copy)
    OR EXISTS (SELECT 1 FROM public.quotation_deliveries WHERE quotation_id = v_copy)
    OR EXISTS (SELECT 1 FROM public.celebration_bookings WHERE quotation_id = v_copy) THEN
    RAISE EXCEPTION 'Customer or lifecycle records leaked to copy';
  END IF;
  INSERT INTO public.quotation_leads (quotation_id, lead_id) VALUES (v_copy, v_other_lead);
  BEGIN
    INSERT INTO public.quotation_leads (quotation_id, lead_id) VALUES (v_copy, v_lead);
    RAISE EXCEPTION 'Second customer link unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  IF (SELECT to_jsonb(q) FROM public.quotations q WHERE id = v_source) IS DISTINCT FROM v_before
    OR NOT EXISTS (SELECT 1 FROM public.quotation_leads WHERE quotation_id = v_source AND lead_id = v_lead)
    OR NOT EXISTS (SELECT 1 FROM public.celebration_bookings WHERE id = v_booking AND quotation_id = v_source) THEN
    RAISE EXCEPTION 'Source was changed by copying or remapping';
  END IF;

  -- RPC callers also cannot create a new multi-customer quotation.
  SELECT count(*) INTO v_count FROM public.quotations;
  BEGIN
    PERFORM public.create_admin_quotation('COPY-MULTI-' || gen_random_uuid(), NULL, NULL, NULL,
      jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 1, 'unit_price', 1)), ARRAY[v_lead, v_other_lead]);
    RAISE EXCEPTION 'Multi-customer creation unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  IF (SELECT count(*) FROM public.quotations) <> v_count THEN RAISE EXCEPTION 'Failed creation left a partial quotation'; END IF;

  -- Copying does not depend on the source's lifecycle status or old validity.
  FOREACH v_status IN ARRAY ARRAY['draft', 'sent', 'rejected', 'expired', 'cancelled'] LOOP
    UPDATE public.quotations SET status = v_status, valid_until = CURRENT_DATE - 1 WHERE id = v_source;
    v_copy := public.copy_admin_quotation(v_source, 'COPY-STATUS-' || gen_random_uuid(), NULL);
    IF NOT EXISTS (SELECT 1 FROM public.quotations WHERE id = v_copy AND status = 'draft' AND valid_until IS NULL) THEN RAISE EXCEPTION 'Copy failed for source status %', v_status; END IF;
  END LOOP;

  SELECT count(*) INTO v_count FROM public.quotations;
  UPDATE public.celebration_services SET is_active = FALSE WHERE id = v_service;
  BEGIN
    PERFORM public.copy_admin_quotation(v_source, 'COPY-INACTIVE-' || gen_random_uuid(), NULL);
    RAISE EXCEPTION 'Inactive service copy unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    PERFORM public.copy_admin_quotation(gen_random_uuid(), 'COPY-MISSING-' || gen_random_uuid(), NULL);
    RAISE EXCEPTION 'Missing source copy unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL;
  END;
  IF (SELECT count(*) FROM public.quotations) <> v_count THEN RAISE EXCEPTION 'Failed copy left a partial quotation'; END IF;
  UPDATE public.celebration_services SET is_active = TRUE WHERE id = v_service;
  CREATE FUNCTION pg_temp.fail_quotation_copy_item() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Forced item copy failure' USING ERRCODE = '23514'; END $$;
  CREATE TRIGGER test_copy_item_failure BEFORE INSERT ON public.quotation_items FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_quotation_copy_item();
  BEGIN
    PERFORM public.copy_admin_quotation(v_source, 'COPY-ROLLBACK-' || gen_random_uuid(), NULL);
    RAISE EXCEPTION 'Forced item copy failure unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '23514' THEN NULL;
  END;
  DROP TRIGGER test_copy_item_failure ON public.quotation_items;
  IF (SELECT count(*) FROM public.quotations) <> v_count THEN RAISE EXCEPTION 'Item copy failure left an orphan quotation'; END IF;
  IF has_function_privilege('anon', 'public.copy_admin_quotation(uuid,text,uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.copy_admin_quotation(uuid,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Copy RPC is exposed to non-server callers';
  END IF;
END;
$test$;
ROLLBACK;
