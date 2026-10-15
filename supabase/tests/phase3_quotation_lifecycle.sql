-- Run after the Phase 1 and Phase 3 migrations in a local/test database only.
BEGIN;
DO $phase3$
DECLARE v_service UUID; v_lead UUID; v_quote UUID; v_expired UUID; v_count INTEGER;
BEGIN
  INSERT INTO public.celebration_services (code, name, location, is_active, display_order) VALUES ('phase3_' || substr(gen_random_uuid()::text, 1, 8), 'Phase 3 service', 'thirukadaiyur', TRUE, 99998) RETURNING id INTO v_service;
  INSERT INTO public.leads (source, contact_name) VALUES ('other', 'Phase 3 lead') RETURNING id INTO v_lead;
  SELECT public.create_admin_quotation('PHASE3-' || substr(gen_random_uuid()::text, 1, 8), CURRENT_DATE, NULL, NULL, jsonb_build_array(jsonb_build_object('service_id', v_service, 'quantity', 1, 'unit_price', 100)), ARRAY[v_lead]) INTO v_quote;
  PERFORM public.transition_admin_quotation(v_quote, 'sent', NULL);
  PERFORM public.transition_admin_quotation(v_quote, 'accepted', NULL);
  IF (SELECT status FROM public.quotations WHERE id = v_quote) <> 'accepted' THEN RAISE EXCEPTION 'Acceptance on validity date failed'; END IF;
  SELECT count(*) INTO v_count FROM public.quotation_activity WHERE quotation_id = v_quote;
  IF v_count <> 2 THEN RAISE EXCEPTION 'Expected lifecycle audit rows'; END IF;
  BEGIN PERFORM public.update_admin_quotation(v_quote, NULL, FALSE, NULL, TRUE, 'forbidden', FALSE, NULL, FALSE, ARRAY[]::UUID[]); RAISE EXCEPTION 'Terminal edit unexpectedly succeeded'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  INSERT INTO public.quotations (quotation_number, status, valid_until) VALUES ('PHASE3-EXPIRED-' || substr(gen_random_uuid()::text, 1, 8), 'sent', CURRENT_DATE - 1) RETURNING id INTO v_expired;
  BEGIN PERFORM public.transition_admin_quotation(v_expired, 'accepted', NULL); RAISE EXCEPTION 'Expired quotation accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  PERFORM public.transition_admin_quotation(v_expired, 'expired', NULL);
  PERFORM public.transition_admin_quotation(v_expired, 'draft', NULL, CURRENT_DATE + 7);
  IF (SELECT status FROM public.quotations WHERE id = v_expired) <> 'draft' OR (SELECT valid_until FROM public.quotations WHERE id = v_expired) <> CURRENT_DATE + 7 THEN RAISE EXCEPTION 'Reopen did not renew validity'; END IF;
  PERFORM public.record_admin_quotation_delivery(v_quote, 'Phase 3 recipient', '9876543210', 'manual', 'Handed to family', NULL);
  IF NOT EXISTS (SELECT 1 FROM public.quotation_deliveries WHERE quotation_id = v_quote AND delivery_kind = 'manual') THEN RAISE EXCEPTION 'Manual delivery missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotation_activity WHERE quotation_id = v_quote AND event_type = 'delivery_recorded') THEN RAISE EXCEPTION 'Delivery audit missing'; END IF;
END;
$phase3$;
ROLLBACK;
