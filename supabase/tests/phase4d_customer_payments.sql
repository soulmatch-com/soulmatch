-- Run in a transaction against local Supabase only: psql "$LOCAL_DB" -f this-file
BEGIN;
DO $test$
DECLARE s UUID;l UUID;q UUID;b UUID;a UUID;r1 UUID;r2 UUID;rf UUID;rv UUID; total NUMERIC; snapshot NUMERIC; n INTEGER;
BEGIN
  SELECT id INTO a FROM public.admins WHERE is_active LIMIT 1;
  IF a IS NULL THEN INSERT INTO public.admins(email,password_hash,name,role,is_active) VALUES('phase4d-'||gen_random_uuid()||'@local.test','not-used','Phase 4D test','admin',true) RETURNING id INTO a; END IF;
  INSERT INTO public.celebration_services(code,name,location,is_active,display_order) VALUES('p4d'||substr(gen_random_uuid()::text,1,8),'Payment test service','thirukadaiyur',true,99988) RETURNING id INTO s;
  INSERT INTO public.leads(source,contact_name) VALUES('other','Payment test customer') RETURNING id INTO l;
  SELECT public.create_admin_quotation('P4D'||substr(gen_random_uuid()::text,1,8),CURRENT_DATE+1,NULL,NULL,jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',100)),ARRAY[l]) INTO q;
  PERFORM public.transition_admin_quotation(q,'sent',a); PERFORM public.transition_admin_quotation(q,'accepted',a); SELECT public.create_admin_booking(q,a) INTO b;
  BEGIN PERFORM public.record_admin_booking_payment(b,'p4d-ineligible',1,'INR','cash',NULL,now(),NULL,a); RAISE EXCEPTION 'pending booking accepted a payment'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  PERFORM public.transition_admin_booking(b,'confirmed',a,NULL);
  SELECT total_price_snapshot INTO snapshot FROM public.celebration_booking_services WHERE booking_id=b;
  SELECT public.record_admin_booking_payment(b,'p4d-r1',30,'INR','upi','x',now(),'advance',a) INTO r1;
  SELECT public.record_admin_booking_payment(b,'p4d-r2-'||gen_random_uuid(),70,'INR','cash',NULL,now(),'settlement',a) INTO r2;
  SELECT net_received INTO total FROM public.booking_payment_summary(b); IF total<>100 THEN RAISE EXCEPTION 'partial/complete settlement summary failed: %',total; END IF;
  BEGIN PERFORM public.record_admin_booking_payment(b,'p4d-over-'||gen_random_uuid(),1,'INR','cash',NULL,now(),NULL,a); RAISE EXCEPTION 'overpayment accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  IF public.record_admin_booking_payment(b,'p4d-r1',30,'INR','upi','x',now(),'advance',a)<>r1 THEN RAISE EXCEPTION 'duplicate idempotency did not return original receipt'; END IF;
  SELECT public.record_admin_booking_payment_refund(b,r1,'p4d-refund',10,'INR','customer cancellation',now(),a) INTO rf;
  SELECT public.reverse_admin_booking_payment(b,r2,'p4d-reversal',20,'INR','entry correction',now(),a) INTO rv;
  SELECT net_received INTO total FROM public.booking_payment_summary(b); IF total<>70 THEN RAISE EXCEPTION 'refund/reversal summary failed: %',total; END IF;
  BEGIN PERFORM public.record_admin_booking_payment_refund(b,r1,'p4d-refund-too-much',21,'INR','invalid',now(),a); RAISE EXCEPTION 'excess refund accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  IF public.record_admin_booking_payment_refund(b,r1,'p4d-refund',10,'INR','customer cancellation',now(),a)<>rf THEN RAISE EXCEPTION 'duplicate refund was not idempotent'; END IF;
  BEGIN PERFORM public.reverse_admin_booking_payment(b,r2,'p4d-currency',1,'USD','currency mismatch',now(),a); RAISE EXCEPTION 'currency mismatch accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  IF (SELECT total_price_snapshot FROM public.celebration_booking_services WHERE booking_id=b)<>snapshot OR (SELECT quoted_total FROM public.celebration_bookings WHERE id=b)<>100 THEN RAISE EXCEPTION 'booking or quotation snapshot changed'; END IF;
  SELECT count(*) INTO n FROM public.booking_payment_activities WHERE payment_id IN(r1,r2,rf,rv); IF n<>4 THEN RAISE EXCEPTION 'audit records are inconsistent: %',n; END IF;
END $test$;
ROLLBACK;
