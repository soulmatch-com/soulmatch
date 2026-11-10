-- Local/test databases only. Fixtures roll back.
BEGIN;
DO $test$
DECLARE
  a UUID; inactive UUID; s UUID; q UUID; b UUID; b2 UUID; e UUID;
  vendor UUID; assignment UUID; other_assignment UUID;
  original public.booking_expense_records%ROWTYPE;
  before_rejection JSONB;
  invalid_amount NUMERIC;
BEGIN
  IF has_function_privilege('anon','public.edit_admin_booking_expense(uuid,uuid,uuid,text,numeric,date,text,uuid)','EXECUTE')
      OR has_function_privilege('authenticated','public.edit_admin_booking_expense(uuid,uuid,uuid,text,numeric,date,text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Expense edit is publicly accessible';
  END IF;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('edit-expense-'||gen_random_uuid()||'@local.test','unused','Expense edit admin','admin',true) RETURNING id INTO a;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('edit-expense-inactive-'||gen_random_uuid()||'@local.test','unused','Inactive admin','admin',false) RETURNING id INTO inactive;
  INSERT INTO public.celebration_services(code,name,location,is_active,display_order)
    VALUES ('expense-'||substr(gen_random_uuid()::text,1,8),'Expense edit service','thirukadaiyur',true,99999) RETURNING id INTO s;
  FOR i IN 1..2 LOOP
    SELECT public.create_admin_quotation('EDIT-EXP-'||gen_random_uuid(),CURRENT_DATE+1,NULL,a,
      jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',1000)),ARRAY[]::UUID[]) INTO q;
    PERFORM public.transition_admin_quotation(q,'sent',a); PERFORM public.transition_admin_quotation(q,'accepted',a);
    IF i=1 THEN SELECT public.create_admin_booking(q,a) INTO b;
    ELSE SELECT public.create_admin_booking(q,a) INTO b2; END IF;
  END LOOP;
  PERFORM public.transition_admin_booking(b,'confirmed',a);
  PERFORM public.transition_admin_booking(b2,'confirmed',a);
  PERFORM public.record_admin_booking_payment(b,'expense-funds',1000,'INR','cash',NULL,now(),NULL,a);
  SELECT public.record_admin_booking_expense(b,NULL,'expense-first','Catering',600,CURRENT_DATE,'Original notes',a) INTO e;
  PERFORM public.record_admin_booking_expense(b,NULL,'expense-second','Transport',400,CURRENT_DATE,NULL,a);
  SELECT * INTO original FROM public.booking_expense_records WHERE id=e;
  INSERT INTO public.event_vendors(vendor_name,category,is_active) VALUES ('Expense vendor','catering',true) RETURNING id INTO vendor;
  SELECT public.create_admin_vendor_assignment(b,(SELECT id FROM public.celebration_booking_services WHERE booking_id=b LIMIT 1),vendor,600,CURRENT_DATE,NULL,NULL,a) INTO assignment;
  SELECT public.create_admin_vendor_assignment(b2,(SELECT id FROM public.celebration_booking_services WHERE booking_id=b2 LIMIT 1),vendor,600,CURRENT_DATE,NULL,NULL,a) INTO other_assignment;

  -- A fully allocated booking still allows corrections using the original allocation.
  PERFORM public.edit_admin_booking_expense(b,e,assignment,' Updated category ',600,CURRENT_DATE-1,' Updated notes ',a);
  IF NOT EXISTS (SELECT 1 FROM public.booking_expense_records WHERE id=e AND category='Updated category' AND amount=600
      AND expense_date=CURRENT_DATE-1 AND notes='Updated notes' AND vendor_assignment_id=assignment AND updated_by=a AND updated_at IS NOT NULL
      AND expense_reference=original.expense_reference AND recorded_by=original.recorded_by AND created_at=original.created_at) THEN
    RAISE EXCEPTION 'Expense correction lost details or original identity';
  END IF;
  SELECT to_jsonb(r) INTO before_rejection FROM public.booking_expense_records r WHERE id=e;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,'Invalid',600.01,CURRENT_DATE,NULL,a); RAISE EXCEPTION 'Overspend accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  FOREACH invalid_amount IN ARRAY ARRAY[0,-1,1.001,'NaN'::NUMERIC,'Infinity'::NUMERIC,10000000000,NULL] LOOP
    BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,'Invalid',invalid_amount,CURRENT_DATE,NULL,a); RAISE EXCEPTION 'Invalid amount accepted: %',invalid_amount; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  END LOOP;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,' ',600,CURRENT_DATE,NULL,a); RAISE EXCEPTION 'Blank category accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,repeat('x',101),600,CURRENT_DATE,NULL,a); RAISE EXCEPTION 'Long category accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,'Invalid',600,NULL,NULL,a); RAISE EXCEPTION 'Missing date accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,'Invalid',600,CURRENT_DATE,repeat('x',2001),a); RAISE EXCEPTION 'Long notes accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,'Invalid',600,CURRENT_DATE,NULL,inactive); RAISE EXCEPTION 'Inactive admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,'Invalid',600,CURRENT_DATE,NULL,NULL); RAISE EXCEPTION 'Missing admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_expense(b2,e,NULL,'Invalid',600,CURRENT_DATE,NULL,a); RAISE EXCEPTION 'Cross-booking expense accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,other_assignment,'Invalid',600,CURRENT_DATE,NULL,a); RAISE EXCEPTION 'Cross-booking vendor accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF (SELECT to_jsonb(r) FROM public.booking_expense_records r WHERE id=e) IS DISTINCT FROM before_rejection THEN RAISE EXCEPTION 'Rejected edit changed expense'; END IF;

  PERFORM public.edit_admin_booking_expense(b,e,NULL,'Reduced',500,CURRENT_DATE,' ',a);
  IF NOT EXISTS (SELECT 1 FROM public.booking_expense_summary(b) WHERE expenses_recorded=900 AND available_to_allocate=100)
      OR NOT EXISTS (SELECT 1 FROM public.booking_expense_records WHERE id=e AND notes IS NULL AND vendor_assignment_id IS NULL) THEN
    RAISE EXCEPTION 'Reduction did not free funds or clear optional fields';
  END IF;
  PERFORM public.edit_admin_booking_expense(b,e,assignment,'Increased',600,CURRENT_DATE,NULL,a);
  IF NOT EXISTS (SELECT 1 FROM public.booking_expense_summary(b) WHERE expenses_recorded=1000 AND available_to_allocate=0)
      OR (SELECT count(*) FROM public.booking_expense_records WHERE booking_id=b)<>2 THEN
    RAISE EXCEPTION 'Increase or expense count incorrect';
  END IF;
  PERFORM public.transition_admin_booking(b,'cancelled',a,'Test cancellation');
  BEGIN PERFORM public.edit_admin_booking_expense(b,e,NULL,'Invalid',500,CURRENT_DATE,NULL,a); RAISE EXCEPTION 'Cancelled booking accepted edit'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$test$;
ROLLBACK;
