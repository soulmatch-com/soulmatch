-- Local/test databases only. Fixtures roll back.
BEGIN;
DO $test$
DECLARE
  a UUID; inactive UUID; s UUID; q UUID; b UUID; b2 UUID; e UUID; remaining UUID; deleted UUID;
  before_rejection JSONB;
BEGIN
  IF has_function_privilege('anon','public.delete_admin_booking_expense(uuid,uuid,uuid)','EXECUTE')
      OR has_function_privilege('authenticated','public.delete_admin_booking_expense(uuid,uuid,uuid)','EXECUTE')
      OR NOT has_function_privilege('service_role','public.delete_admin_booking_expense(uuid,uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Expense delete permissions are incorrect';
  END IF;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('delete-expense-'||gen_random_uuid()||'@local.test','unused','Expense delete admin','admin',true) RETURNING id INTO a;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('delete-expense-inactive-'||gen_random_uuid()||'@local.test','unused','Inactive admin','admin',false) RETURNING id INTO inactive;
  INSERT INTO public.celebration_services(code,name,location,is_active,display_order)
    VALUES ('expense-del-'||substr(gen_random_uuid()::text,1,8),'Expense delete service','thirukadaiyur',true,99999) RETURNING id INTO s;
  FOR i IN 1..2 LOOP
    SELECT public.create_admin_quotation('DELETE-EXP-'||gen_random_uuid(),CURRENT_DATE+1,NULL,a,
      jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',1000)),ARRAY[]::UUID[]) INTO q;
    PERFORM public.transition_admin_quotation(q,'sent',a); PERFORM public.transition_admin_quotation(q,'accepted',a);
    IF i=1 THEN SELECT public.create_admin_booking(q,a) INTO b;
    ELSE SELECT public.create_admin_booking(q,a) INTO b2; END IF;
  END LOOP;
  PERFORM public.transition_admin_booking(b,'confirmed',a);
  PERFORM public.transition_admin_booking(b2,'confirmed',a);
  PERFORM public.record_admin_booking_payment(b,'delete-expense-funds',1000,'INR','cash',NULL,now(),NULL,a);
  SELECT public.record_admin_booking_expense(b,NULL,'delete-expense-first','Catering',600,CURRENT_DATE,NULL,a) INTO e;
  SELECT public.record_admin_booking_expense(b,NULL,'delete-expense-second','Transport',400,CURRENT_DATE,NULL,a) INTO remaining;
  SELECT to_jsonb(r) INTO before_rejection FROM public.booking_expense_records r WHERE id=e;

  BEGIN PERFORM public.delete_admin_booking_expense(b,e,NULL); RAISE EXCEPTION 'Missing admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.delete_admin_booking_expense(b,e,inactive); RAISE EXCEPTION 'Inactive admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.delete_admin_booking_expense(b2,e,a); RAISE EXCEPTION 'Cross-booking deletion accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN PERFORM public.delete_admin_booking_expense(gen_random_uuid(),e,a); RAISE EXCEPTION 'Missing booking accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN PERFORM public.delete_admin_booking_expense(b,gen_random_uuid(),a); RAISE EXCEPTION 'Missing expense accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  IF (SELECT to_jsonb(r) FROM public.booking_expense_records r WHERE id=e) IS DISTINCT FROM before_rejection THEN
    RAISE EXCEPTION 'Rejected deletion changed the expense';
  END IF;

  deleted := public.delete_admin_booking_expense(b,e,a);
  IF deleted<>e OR EXISTS (SELECT 1 FROM public.booking_expense_records WHERE id=e) THEN
    RAISE EXCEPTION 'Expense was not deleted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_expense_records WHERE id=remaining AND amount=400)
      OR NOT EXISTS (SELECT 1 FROM public.booking_expense_summary(b) WHERE net_received=1000 AND expenses_recorded=400 AND available_to_allocate=600)
      OR NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b) WHERE net_received=1000) THEN
    RAISE EXCEPTION 'Deletion changed other expenses or receipts, or failed to release funds';
  END IF;
  BEGIN PERFORM public.delete_admin_booking_expense(b,e,a); RAISE EXCEPTION 'Repeated deletion accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  -- Freed funds can be allocated again.
  PERFORM public.record_admin_booking_expense(b,NULL,'delete-expense-reallocate','Replacement',600,CURRENT_DATE,NULL,a);
  IF NOT EXISTS (SELECT 1 FROM public.booking_expense_summary(b) WHERE expenses_recorded=1000 AND available_to_allocate=0) THEN
    RAISE EXCEPTION 'Freed funds were not reusable';
  END IF;
  PERFORM public.transition_admin_booking(b,'cancelled',a,'Test cancellation');
  BEGIN PERFORM public.delete_admin_booking_expense(b,remaining,a); RAISE EXCEPTION 'Cancelled booking accepted deletion'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF NOT EXISTS (SELECT 1 FROM public.booking_expense_records WHERE id=remaining) THEN RAISE EXCEPTION 'Rejected cancellation delete removed expense'; END IF;
END;
$test$;
ROLLBACK;
