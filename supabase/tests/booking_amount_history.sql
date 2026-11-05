-- Run after the booking, payments, add-on quotation, and amount history migrations.
-- Use a local/test database only; fixtures and forced-failure triggers roll back.
BEGIN;
DO $test$
DECLARE
  a UUID; inactive UUID; s UUID; q UUID; addon UUID; b UUID; activity UUID;
  current_history JSONB;
BEGIN
  IF has_function_privilege('anon', 'public.alter_admin_booking_amount(uuid,numeric,numeric,text,uuid)', 'EXECUTE')
      OR has_function_privilege('authenticated', 'public.alter_admin_booking_amount(uuid,numeric,numeric,text,uuid)', 'EXECUTE')
      OR NOT has_function_privilege('service_role', 'public.alter_admin_booking_amount(uuid,numeric,numeric,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Amount RPC permissions are incorrect';
  END IF;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('amount-'||gen_random_uuid()||'@local.test','unused','Amount test admin','admin',true) RETURNING id INTO a;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('amount-inactive-'||gen_random_uuid()||'@local.test','unused','Inactive admin','admin',false) RETURNING id INTO inactive;
  INSERT INTO public.celebration_services(code,name,location,is_active,display_order)
    VALUES ('amount-'||substr(gen_random_uuid()::text,1,8),'Amount test service','thirukadaiyur',true,99999) RETURNING id INTO s;
  SELECT public.create_admin_quotation('AMOUNT-'||gen_random_uuid(),CURRENT_DATE+1,NULL,a,
    jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',1000)),ARRAY[]::UUID[]) INTO q;
  PERFORM public.transition_admin_quotation(q,'sent',a);
  PERFORM public.transition_admin_quotation(q,'accepted',a);
  SELECT public.create_admin_booking(q,a) INTO b;
  SELECT public.alter_admin_booking_amount(b,1000,900,'  Customer discount  ',a) INTO activity;
  IF NOT EXISTS (SELECT 1 FROM public.celebration_booking_activities WHERE id=activity AND booking_id=b
      AND event_type='amount_changed' AND admin_id=a AND created_at IS NOT NULL
      AND metadata=jsonb_build_object('previous_total',1000,'new_total',900,'currency','INR','reason','Customer discount')) THEN
    RAISE EXCEPTION 'Amount change lacks old/new totals, reason, administrator or timestamp';
  END IF;
  SELECT jsonb_agg(to_jsonb(x) ORDER BY id) INTO current_history
    FROM public.celebration_booking_activities x WHERE booking_id=b;

  BEGIN PERFORM public.alter_admin_booking_amount(b,900,950,'No admin',NULL); RAISE EXCEPTION 'Missing admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,950,'Inactive admin',inactive); RAISE EXCEPTION 'Inactive admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(gen_random_uuid(),900,950,'Missing booking',a); RAISE EXCEPTION 'Missing booking accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,1000,950,'Stale edit',a); RAISE EXCEPTION 'Stale edit accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,NULL,950,'Missing expected total',a); RAISE EXCEPTION 'Missing expected total accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,900,'No change',a); RAISE EXCEPTION 'Unchanged amount accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,950,'  ',a); RAISE EXCEPTION 'Blank reason accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,950,repeat('x',2001),a); RAISE EXCEPTION 'Long reason accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,-1,'Negative',a); RAISE EXCEPTION 'Negative amount accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,950.001,'Fractional paise',a); RAISE EXCEPTION 'Excess precision accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,'NaN'::numeric,'NaN',a); RAISE EXCEPTION 'NaN accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,10000000000,'Overflow',a); RAISE EXCEPTION 'Overflow accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF (SELECT quoted_total FROM public.celebration_bookings WHERE id=b) <> 900
      OR (SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM public.celebration_booking_activities x WHERE booking_id=b) <> current_history THEN
    RAISE EXCEPTION 'Rejected edits changed the total or audit history';
  END IF;

  PERFORM public.transition_admin_booking(b,'confirmed',a);
  PERFORM public.record_admin_booking_payment(b,'amount-test-receipt',300,'INR','cash',NULL,now(),NULL,a);
  BEGIN PERFORM public.alter_admin_booking_amount(b,900,299.99,'Below receipts',a); RAISE EXCEPTION 'Amount below payments accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.alter_admin_booking_amount(b,900,800,'Revised discount',a);
  PERFORM public.alter_admin_booking_amount(b,800,1200,'Extra arrangements',a);
  IF (SELECT count(*) FROM public.celebration_booking_activities WHERE booking_id=b AND event_type='amount_changed') <> 3
      OR NOT EXISTS (SELECT 1 FROM public.celebration_booking_activities WHERE id=activity AND metadata->>'new_total'='900') THEN
    RAISE EXCEPTION 'Repeated edits did not retain earlier history';
  END IF;

  SELECT public.create_admin_quotation('AMOUNT-ADDON-'||gen_random_uuid(),CURRENT_DATE+1,NULL,a,
    jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',100)),ARRAY[]::UUID[]) INTO addon;
  PERFORM public.transition_admin_quotation(addon,'sent',a);
  PERFORM public.transition_admin_quotation(addon,'accepted',a);
  PERFORM public.add_admin_booking_quotation(b,addon,a);
  IF NOT EXISTS (SELECT 1 FROM public.celebration_booking_activities WHERE booking_id=b AND event_type='additional_quotation_linked'
      AND admin_id=a AND metadata->>'previous_total'='1200.00' AND metadata->>'new_total'='1300.00'
      AND metadata->>'added_total'='100.00') THEN
    RAISE EXCEPTION 'Additional quotation amount change was not audited';
  END IF;
  BEGIN PERFORM public.add_admin_booking_quotation(b,addon,a); RAISE EXCEPTION 'Duplicate add-on accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b) WHERE booking_total=1300 AND net_received=300 AND outstanding_balance=1000)
      OR (SELECT total_amount FROM public.quotations WHERE id=q) <> 1000
      OR (SELECT total_price_snapshot FROM public.celebration_booking_services WHERE booking_id=b AND quotation_item_id IN (SELECT id FROM public.quotation_items WHERE quotation_id=q)) <> 1000 THEN
    RAISE EXCEPTION 'Payment summary or original quotation/service snapshot is incorrect';
  END IF;

  -- If writing the audit entry fails, the total must also roll back.
  CREATE FUNCTION pg_temp.fail_amount_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Forced audit failure' USING ERRCODE='ZX001'; END;
  $$;
  CREATE TRIGGER amount_test_audit_failure BEFORE INSERT ON public.celebration_booking_activities
    FOR EACH ROW WHEN (NEW.event_type='amount_changed') EXECUTE FUNCTION pg_temp.fail_amount_audit();
  BEGIN PERFORM public.alter_admin_booking_amount(b,1300,1400,'Must roll back',a); RAISE EXCEPTION 'Audit failure ignored'; EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
  DROP TRIGGER amount_test_audit_failure ON public.celebration_booking_activities;
  IF (SELECT quoted_total FROM public.celebration_bookings WHERE id=b) <> 1300
      OR (SELECT count(*) FROM public.celebration_booking_activities WHERE booking_id=b AND event_type='amount_changed') <> 3 THEN
    RAISE EXCEPTION 'Audit failure left an unaudited amount change';
  END IF;

  PERFORM public.transition_admin_booking(b,'planning',a);
  PERFORM public.transition_admin_booking(b,'ready',a);
  PERFORM public.transition_admin_booking(b,'completed',a);
  BEGIN PERFORM public.alter_admin_booking_amount(b,1300,1400,'Completed edit',a); RAISE EXCEPTION 'Completed booking changed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$test$;
ROLLBACK;
