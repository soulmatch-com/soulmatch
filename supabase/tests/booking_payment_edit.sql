-- Local/test databases only. All fixtures and failure triggers roll back.
BEGIN;
DO $test$
DECLARE
  a UUID; inactive UUID; s UUID; q UUID; q2 UUID; b UUID; b2 UUID;
  receipt UUID; corrected UUID; corrected2 UUID; refunded UUID; reversal UUID;
  example_receipt UUID; example_corrected UUID; example_final UUID;
  before_receipt JSONB; total NUMERIC; n INTEGER; activity JSONB;
  received_at TIMESTAMPTZ := date_trunc('second', now()) - interval '1 day';
BEGIN
  IF has_function_privilege('anon','public.edit_admin_booking_payment(uuid,uuid,text,numeric,text,text,timestamptz,text,text,uuid)','EXECUTE')
      OR has_function_privilege('authenticated','public.edit_admin_booking_payment(uuid,uuid,text,numeric,text,text,timestamptz,text,text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Payment edit is publicly accessible';
  END IF;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('edit-payment-'||gen_random_uuid()||'@local.test','unused','Payment edit admin','admin',true) RETURNING id INTO a;
  INSERT INTO public.admins(email,password_hash,name,role,is_active)
    VALUES ('edit-inactive-'||gen_random_uuid()||'@local.test','unused','Inactive payment admin','admin',false) RETURNING id INTO inactive;
  INSERT INTO public.celebration_services(code,name,location,is_active,display_order)
    VALUES ('edit-'||substr(gen_random_uuid()::text,1,8),'Payment edit service','thirukadaiyur',true,99999) RETURNING id INTO s;
  SELECT public.create_admin_quotation('EDIT-'||gen_random_uuid(),CURRENT_DATE+1,NULL,a,
    jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',1000)),ARRAY[]::UUID[]) INTO q;
  PERFORM public.transition_admin_quotation(q,'sent',a); PERFORM public.transition_admin_quotation(q,'accepted',a);
  SELECT public.create_admin_booking(q,a) INTO b;
  PERFORM public.transition_admin_booking(b,'confirmed',a);
  SELECT public.record_admin_booking_payment(b,'edit-original',400,'INR','cash','old-reference',received_at,'Original remarks',a) INTO receipt;
  SELECT to_jsonb(p) INTO before_receipt FROM public.booking_payment_records p WHERE id=receipt;

  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'no-admin',450,'upi',NULL,received_at,NULL,'Correction',NULL); RAISE EXCEPTION 'Missing admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'inactive-admin',450,'upi',NULL,received_at,NULL,'Correction',inactive); RAISE EXCEPTION 'Inactive admin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'blank-reason',450,'upi',NULL,received_at,NULL,'  ',a); RAISE EXCEPTION 'Blank reason accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'invalid-amount',450.001,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Fractional paise accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'invalid-method',450,'invalid',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Invalid method accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'same-details',400,'cash','old-reference',received_at,'Original remarks','No change',a); RAISE EXCEPTION 'Unchanged edit accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'overpayment',1000.01,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Overpayment accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF (SELECT count(*) FROM public.booking_payment_records WHERE booking_id=b)<>1 THEN RAISE EXCEPTION 'Rejected edits changed ledger'; END IF;

  SELECT public.edit_admin_booking_payment(b,receipt,'first-edit',600,'upi','new-reference',received_at+interval '1 hour','Corrected remarks','  Wrong amount and method  ',a) INTO corrected;
  IF (SELECT to_jsonb(p) FROM public.booking_payment_records p WHERE id=receipt) IS DISTINCT FROM before_receipt THEN
    RAISE EXCEPTION 'Original receipt was modified';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_records WHERE id=corrected AND amount=600 AND payment_method='upi'
      AND external_reference='new-reference' AND notes='Corrected remarks' AND payment_date=received_at+interval '1 hour' AND recorded_by=a) THEN
    RAISE EXCEPTION 'Corrected receipt details are wrong';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_records WHERE original_payment_id=receipt AND transaction_type='reversal' AND amount=400) THEN
    RAISE EXCEPTION 'Original receipt was not reversed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b) WHERE gross_received=600 AND total_reversed=0 AND net_received=600 AND outstanding_balance=400) THEN
    RAISE EXCEPTION 'Payment summary did not reflect edit';
  END IF;
  SELECT metadata INTO activity FROM public.booking_payment_activities WHERE payment_id=receipt AND event_type='edited' AND actor_id=a;
  IF activity IS NULL OR activity->>'reason'<>'Wrong amount and method'
      OR (activity->'previous_payment'->>'amount')::numeric<>400 OR (activity->'new_payment'->>'amount')::numeric<>600
      OR activity->'previous_payment'->>'notes'<>'Original remarks' OR activity->'new_payment'->>'notes'<>'Corrected remarks'
      OR (activity->>'replacement_payment_id')::uuid<>corrected THEN
    RAISE EXCEPTION 'Edit audit history is incomplete';
  END IF;
  IF public.edit_admin_booking_payment(b,receipt,'first-edit',600,'upi','new-reference',received_at+interval '1 hour','Corrected remarks','Wrong amount and method',a)<>corrected
      OR (SELECT count(*) FROM public.booking_payment_records WHERE booking_id=b)<>3 THEN
    RAISE EXCEPTION 'Edit retry duplicated correction';
  END IF;
  BEGIN PERFORM public.edit_admin_booking_payment(b,receipt,'stale-edit',500,'upi',NULL,received_at,NULL,'Stale',a); RAISE EXCEPTION 'Stale edit accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  -- A second correction links to the latest receipt and retains the first edit.
  SELECT public.edit_admin_booking_payment(b,corrected,'second-edit',500,'bank_transfer','bank-reference',received_at,'Updated remarks','Reduced amount',a) INTO corrected2;
  IF (SELECT count(*) FROM public.booking_payment_activities WHERE payment_id IN (receipt,corrected) AND event_type='edited')<>2
      OR NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b) WHERE gross_received=500 AND total_reversed=0 AND net_received=500 AND outstanding_balance=500) THEN
    RAISE EXCEPTION 'Repeated correction or balance is incorrect';
  END IF;

  -- Reject edits of receipts with partial refunds and cross-booking IDs.
  SELECT public.record_admin_booking_payment(b,'refund-original',100,'INR','cash',NULL,received_at,NULL,a) INTO refunded;
  PERFORM public.record_admin_booking_payment_refund(b,refunded,'partial-refund',10,'INR','Refund',now(),a);
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b) WHERE gross_received=600 AND total_refunded=10 AND total_reversed=0 AND net_received=590) THEN
    RAISE EXCEPTION 'Edited and independent receipts or genuine refunds were counted incorrectly';
  END IF;
  BEGIN PERFORM public.edit_admin_booking_payment(b,refunded,'refund-edit',90,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Refunded receipt edited'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  SELECT public.create_admin_quotation('EDIT-OTHER-'||gen_random_uuid(),CURRENT_DATE+1,NULL,a,
    jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',3000)),ARRAY[]::UUID[]) INTO q2;
  PERFORM public.transition_admin_quotation(q2,'sent',a); PERFORM public.transition_admin_quotation(q2,'accepted',a);
  SELECT public.create_admin_booking(q2,a) INTO b2;
  PERFORM public.transition_admin_booking(b2,'confirmed',a);
  BEGIN PERFORM public.edit_admin_booking_payment(b2,corrected2,'wrong-booking',500,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Cross-booking edit accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN PERFORM public.edit_admin_booking_payment(b2,receipt,'first-edit',600,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Cross-booking retry accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;

  -- Do not let a correction consume funds already allocated to expenses.
  PERFORM public.record_admin_booking_expense(b,NULL,'edit-expense','Catering',580,CURRENT_DATE,NULL,a);
  BEGIN PERFORM public.edit_admin_booking_payment(b,corrected2,'below-expenses',400,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Payment below expenses accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  -- A failure writing the audit record must roll back both ledger additions.
  SELECT count(*) INTO n FROM public.booking_payment_records WHERE booking_id=b;
  CREATE FUNCTION pg_temp.fail_payment_edit_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Forced payment edit failure' USING ERRCODE='ZX002'; END;
  $$;
  CREATE TRIGGER payment_edit_test_failure BEFORE INSERT ON public.booking_payment_activities
    FOR EACH ROW WHEN (NEW.event_type='edited') EXECUTE FUNCTION pg_temp.fail_payment_edit_audit();
  BEGIN PERFORM public.edit_admin_booking_payment(b,corrected2,'audit-failure',550,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Audit failure ignored'; EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL; END;
  DROP TRIGGER payment_edit_test_failure ON public.booking_payment_activities;
  IF (SELECT count(*) FROM public.booking_payment_records WHERE booking_id=b)<>n
      OR NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b) WHERE net_received=590) THEN
    RAISE EXCEPTION 'Failed audit left partial corrections';
  END IF;
  PERFORM public.transition_admin_booking(b,'cancelled',a,'Test cancellation');
  BEGIN PERFORM public.edit_admin_booking_payment(b,corrected2,'cancelled-edit',500,'upi',NULL,received_at,NULL,'Correction',a); RAISE EXCEPTION 'Cancelled booking accepted edit'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  -- Regression: correcting 1000 to 2000 is a single 2000 receipt in totals.
  SELECT public.record_admin_booking_payment(b2,'example-original',1000,'INR','cash',NULL,received_at,NULL,a) INTO example_receipt;
  SELECT public.edit_admin_booking_payment(b2,example_receipt,'example-edit',2000,'cash',NULL,received_at,NULL,'Correct amount',a) INTO example_corrected;
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b2) WHERE gross_received=2000 AND total_reversed=0 AND net_received=2000 AND outstanding_balance=1000) THEN
    RAISE EXCEPTION '1000 corrected to 2000 must show gross received of 2000, not 3000';
  END IF;
  SELECT public.edit_admin_booking_payment(b2,example_corrected,'example-notes-edit',2000,'cash',NULL,received_at,'Updated remarks','Correct remarks',a) INTO example_final;
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b2) WHERE gross_received=2000 AND total_reversed=0 AND net_received=2000) THEN
    RAISE EXCEPTION 'Editing remarks inflated gross received';
  END IF;
  PERFORM public.reverse_admin_booking_payment(b2,example_final,'example-manual-reversal',125,'INR','Actual reversal',now(),a);
  PERFORM public.record_admin_booking_payment_refund(b2,example_final,'example-refund',75,'INR','Actual refund',now(),a);
  PERFORM public.record_admin_booking_payment(b2,'example-extra-receipt',300,'INR','cash',NULL,received_at,NULL,a);
  IF NOT EXISTS (SELECT 1 FROM public.booking_payment_summary(b2) WHERE gross_received=2300 AND total_refunded=75 AND total_reversed=125 AND net_received=2100 AND outstanding_balance=900) THEN
    RAISE EXCEPTION 'True refunds, reversals or independent payments were hidden by edit exclusions';
  END IF;
END;
$test$;
ROLLBACK;
