-- Run only after 20261009_phase1_admin_reliability.sql in an approved test database.
-- Every fixture and assertion is rolled back.
BEGIN;

CREATE FUNCTION public.phase1_test_reject_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.contact_name = 'Phase lead rollback' THEN
    RAISE EXCEPTION 'Forced lead insert failure';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER phase1_test_reject_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.phase1_test_reject_lead();

DO $$
DECLARE
  v_service_id UUID;
  v_enquiry_id UUID;
  v_repeat_enquiry_id UUID;
  v_lead_id UUID;
  v_quotation_id UUID;
  v_count INTEGER;
  v_service_name TEXT;
BEGIN
  INSERT INTO public.celebration_services (code, name, location, is_active, display_order)
  VALUES ('phase1_reliability_' || substr(gen_random_uuid()::text, 1, 8), 'Phase 1 reliability service', 'thirukadaiyur', TRUE, 99999)
  RETURNING id, name INTO v_service_id, v_service_name;

  SELECT public.create_celebration_enquiry(
    'thirukadaiyur', '60th-marriage', 'Phase Test Husband', 'Phase Test Wife',
    DATE '1960-01-01', DATE '1964-01-01', CURRENT_DATE + 30, '20-50',
    'ceremony-food', 'Phase Test Contact', '9876543210', 'phone', ARRAY[v_service_id],
    NULL, NULL, NULL, NULL, NULL, 'Chennai', 'phase@example.com', 'Son',
    'Original service detail', 'Original enquiry note', 25, 'basic', 1,
    'Original special requirement', 'one_session', 'phase1-enquiry-key'
  ) INTO v_enquiry_id;

  IF (SELECT status FROM public.celebration_enquiries WHERE id = v_enquiry_id) <> 'new' THEN
    RAISE EXCEPTION 'New celebration enquiries must use the new status';
  END IF;

  SELECT public.create_celebration_enquiry(
    'thirukadaiyur', 'not-sure', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, ARRAY[]::UUID[], NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'phase1-enquiry-key'
  ) INTO v_repeat_enquiry_id;
  IF v_repeat_enquiry_id <> v_enquiry_id THEN RAISE EXCEPTION 'Idempotency key did not return the original enquiry'; END IF;

  SELECT count(*) INTO v_count FROM public.leads WHERE celebration_enquiry_id = v_enquiry_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Expected exactly one linked lead, got %', v_count; END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE celebration_enquiry_id = v_enquiry_id;

  BEGIN
    PERFORM public.create_celebration_enquiry(
      'thirukadaiyur', '60th-marriage', 'Rollback Husband', 'Rollback Wife',
      DATE '1960-01-01', DATE '1964-01-01', CURRENT_DATE + 30, '20-50',
      'ceremony-food', 'Rollback Contact', '9876543211', 'phone', ARRAY['00000000-0000-4000-8000-000000000000'::UUID],
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, 'phase1-rollback-key'
    );
    RAISE EXCEPTION 'Invalid enquiry unexpectedly succeeded';
  EXCEPTION WHEN others THEN NULL;
  END;
  SELECT count(*) INTO v_count FROM public.celebration_enquiries WHERE idempotency_key = 'phase1-rollback-key';
  IF v_count <> 0 THEN RAISE EXCEPTION 'Failed enquiry was committed'; END IF;

  BEGIN
    PERFORM public.create_celebration_enquiry(
      'thirukadaiyur', '60th-marriage', 'Lead Rollback Husband', 'Lead Rollback Wife',
      DATE '1960-01-01', DATE '1964-01-01', CURRENT_DATE + 30, '20-50',
      'ceremony-food', 'Phase lead rollback', '9876543212', 'phone', ARRAY[v_service_id],
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, 'phase1-lead-rollback-key'
    );
    RAISE EXCEPTION 'Forced lead insert failure unexpectedly succeeded';
  EXCEPTION WHEN others THEN NULL;
  END;
  SELECT count(*) INTO v_count FROM public.celebration_enquiries WHERE idempotency_key = 'phase1-lead-rollback-key';
  IF v_count <> 0 THEN RAISE EXCEPTION 'Lead insert failure committed an enquiry'; END IF;

  SELECT public.create_admin_quotation(
    'PHASE1-' || substr(gen_random_uuid()::text, 1, 8), NULL, 'Phase 1 test', NULL,
    jsonb_build_array(jsonb_build_object('service_id', v_service_id, 'quantity', 2, 'unit_price', 123.45)), ARRAY[v_lead_id]
  ) INTO v_quotation_id;
  SELECT count(*) INTO v_count FROM public.quotation_items WHERE quotation_id = v_quotation_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Quotation item was not committed'; END IF;
  SELECT count(*) INTO v_count FROM public.quotation_leads WHERE quotation_id = v_quotation_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Quotation lead link was not committed'; END IF;

  PERFORM public.update_admin_quotation(
    v_quotation_id, 'sent', FALSE, NULL, TRUE, 'Updated Phase 1 test', TRUE,
    jsonb_build_array(jsonb_build_object('service_id', v_service_id, 'quantity', 3, 'unit_price', 150)),
    TRUE, ARRAY[v_lead_id]
  );
  IF (SELECT total_amount FROM public.quotations WHERE id = v_quotation_id) <> 450 THEN RAISE EXCEPTION 'Quotation update did not commit the recalculated total'; END IF;
  UPDATE public.celebration_services SET name = 'Changed after quote' WHERE id = v_service_id;
  IF (SELECT service_name FROM public.quotation_items WHERE quotation_id = v_quotation_id) <> v_service_name THEN RAISE EXCEPTION 'Quotation service snapshot changed after catalogue update'; END IF;

  BEGIN
    PERFORM public.update_admin_quotation(
      v_quotation_id, NULL, FALSE, NULL, FALSE, NULL, TRUE,
      jsonb_build_array(jsonb_build_object('service_id', '00000000-0000-4000-8000-000000000000', 'quantity', 1, 'unit_price', 1)),
      FALSE, ARRAY[]::UUID[]
    );
    RAISE EXCEPTION 'Invalid quotation update unexpectedly succeeded';
  EXCEPTION WHEN others THEN NULL;
  END;
  SELECT count(*) INTO v_count FROM public.quotation_items WHERE quotation_id = v_quotation_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Failed quotation update changed committed items'; END IF;

  BEGIN
    PERFORM public.update_admin_quotation(
      v_quotation_id, NULL, FALSE, NULL, FALSE, NULL, FALSE, NULL,
      TRUE, ARRAY['00000000-0000-4000-8000-000000000000'::UUID]
    );
    RAISE EXCEPTION 'Invalid quotation lead mapping unexpectedly succeeded';
  EXCEPTION WHEN others THEN NULL;
  END;
  SELECT count(*) INTO v_count FROM public.quotation_leads WHERE quotation_id = v_quotation_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Failed quotation lead mapping changed committed links'; END IF;
END;
$$;

ROLLBACK;
