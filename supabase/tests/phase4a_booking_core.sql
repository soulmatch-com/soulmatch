-- Run after Phase 1, Phase 3 and Phase 4A migrations in a local/test database only.
-- This rolls all fixture data back. Concurrency is rehearsed by issuing the same
-- create_admin_booking RPC in two local sessions against the same accepted quote.
BEGIN;
DO $phase4a$
DECLARE v_service UUID; v_lead_one UUID; v_lead_two UUID; v_quote UUID; v_draft_quote UUID; v_failed_quote UUID; v_booking UUID; v_count INTEGER;
BEGIN
  INSERT INTO public.celebration_services (code, name, description, location, is_active, display_order) VALUES ('phase4a_' || substr(gen_random_uuid()::text, 1, 8), 'Phase 4A service', 'snapshot description', 'thirukadaiyur', TRUE, 99997) RETURNING id INTO v_service;
  INSERT INTO public.leads (source, contact_name, mobile, event_type, event_date) VALUES ('other', 'Phase 4A primary', '9876543210', '70th-marriage', CURRENT_DATE + 30) RETURNING id INTO v_lead_one;
  INSERT INTO public.leads (source, contact_name) VALUES ('other', 'Phase 4A second lead') RETURNING id INTO v_lead_two;
  SELECT public.create_admin_quotation('PHASE4A-DRAFT-' || substr(gen_random_uuid()::text, 1, 8), CURRENT_DATE + 1, NULL, NULL, jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 1, 'unit_price', 100)), ARRAY[]::UUID[]) INTO v_draft_quote;
  BEGIN PERFORM public.create_admin_booking(v_draft_quote, NULL); RAISE EXCEPTION 'Non-accepted quotation unexpectedly booked'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  SELECT public.create_admin_quotation('PHASE4A-' || substr(gen_random_uuid()::text, 1, 8), CURRENT_DATE + 1, NULL, NULL, jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 2, 'unit_price', 100)), ARRAY[v_lead_one, v_lead_two]) INTO v_quote;
  PERFORM public.transition_admin_quotation(v_quote, 'sent', NULL); PERFORM public.transition_admin_quotation(v_quote, 'accepted', NULL);
  SELECT public.create_admin_booking(v_quote, NULL) INTO v_booking;
  IF (SELECT status FROM public.celebration_bookings WHERE id = v_booking) <> 'pending_confirmation' THEN RAISE EXCEPTION 'Booking creation failed'; END IF;
  IF (SELECT primary_lead_id FROM public.celebration_bookings WHERE id = v_booking) IS NOT NULL THEN RAISE EXCEPTION 'Multi-lead quote selected an unsafe primary lead'; END IF;
  IF (SELECT count(*) FROM public.celebration_booking_leads WHERE booking_id = v_booking) <> 2 THEN RAISE EXCEPTION 'Lead relationship snapshot missing'; END IF;
  IF (SELECT count(*) FROM public.celebration_booking_services WHERE booking_id = v_booking AND total_price_snapshot = 200) <> 1 THEN RAISE EXCEPTION 'Service price snapshot missing'; END IF;
  UPDATE public.celebration_services SET name = 'changed catalogue name', description = 'changed catalogue description' WHERE id = v_service;
  IF (SELECT service_name_snapshot FROM public.celebration_booking_services WHERE booking_id = v_booking) <> 'Phase 4A service' THEN RAISE EXCEPTION 'Booking snapshot changed with catalogue'; END IF;
  IF (SELECT public.create_admin_booking(v_quote, NULL)) <> v_booking OR (SELECT count(*) FROM public.celebration_bookings WHERE quotation_id = v_quote) <> 1 THEN RAISE EXCEPTION 'Idempotent duplicate prevention failed'; END IF;
  BEGIN PERFORM public.transition_admin_booking(v_booking, 'cancelled', NULL, NULL); RAISE EXCEPTION 'Cancellation without reason succeeded'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  PERFORM public.transition_admin_booking(v_booking, 'confirmed', NULL); PERFORM public.transition_admin_booking(v_booking, 'planning', NULL); PERFORM public.transition_admin_booking(v_booking, 'ready', NULL); PERFORM public.transition_admin_booking(v_booking, 'completed', NULL);
  SELECT count(*) INTO v_count FROM public.celebration_booking_activities WHERE booking_id = v_booking;
  IF v_count <> 5 THEN RAISE EXCEPTION 'Booking audit history is incomplete'; END IF;
  BEGIN PERFORM public.create_admin_booking(gen_random_uuid(), NULL); RAISE EXCEPTION 'Missing quotation unexpectedly booked'; EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL; END;

  -- Force the service-copy insert to fail and verify the header did not escape the RPC transaction.
  SELECT public.create_admin_quotation('PHASE4A-ROLLBACK-' || substr(gen_random_uuid()::text, 1, 8), CURRENT_DATE + 1, NULL, NULL, jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 1, 'unit_price', 100)), ARRAY[]::UUID[]) INTO v_failed_quote;
  PERFORM public.transition_admin_quotation(v_failed_quote, 'sent', NULL); PERFORM public.transition_admin_quotation(v_failed_quote, 'accepted', NULL);
  CREATE OR REPLACE FUNCTION pg_temp.fail_booking_service_copy() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced copy failure'; END $$;
  CREATE TRIGGER phase4a_forced_service_copy_failure BEFORE INSERT ON public.celebration_booking_services FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_booking_service_copy();
  BEGIN PERFORM public.create_admin_booking(v_failed_quote, NULL); RAISE EXCEPTION 'Forced service copy failure unexpectedly succeeded'; EXCEPTION WHEN OTHERS THEN NULL; END;
  DROP TRIGGER phase4a_forced_service_copy_failure ON public.celebration_booking_services;
  IF EXISTS (SELECT 1 FROM public.celebration_bookings WHERE quotation_id = v_failed_quote) THEN RAISE EXCEPTION 'Service-copy failure did not roll back booking header'; END IF;
END;
$phase4a$;
ROLLBACK;
