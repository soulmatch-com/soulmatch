BEGIN;
DO $t$
DECLARE s UUID;l UUID;q UUID;b UUID;bs UUID;v UUID;v2 UUID;a UUID;c INTEGER;price NUMERIC;
BEGIN
 INSERT INTO public.celebration_services(code,name,location,is_active,display_order) VALUES('p4v'||substr(gen_random_uuid()::text,1,6),'Vendor service','thirukadaiyur',true,99990) RETURNING id INTO s;
 INSERT INTO public.leads(source,contact_name) VALUES('other','Vendor lead') RETURNING id INTO l;
 SELECT public.create_admin_quotation('P4V'||substr(gen_random_uuid()::text,1,6),CURRENT_DATE+1,NULL,NULL,jsonb_build_array(jsonb_build_object('service_id',s,'quantity',1,'unit_price',99)),ARRAY[l]) INTO q; PERFORM public.transition_admin_quotation(q,'sent',NULL); PERFORM public.transition_admin_quotation(q,'accepted',NULL); SELECT public.create_admin_booking(q,NULL) INTO b; SELECT id,total_price_snapshot INTO bs,price FROM public.celebration_booking_services WHERE booking_id=b; PERFORM public.transition_admin_booking(b,'confirmed',NULL,NULL);
 INSERT INTO public.event_vendors(vendor_name,category,is_active) VALUES('Vendor A','catering',true) RETURNING id INTO v; INSERT INTO public.event_vendors(vendor_name,category,is_active) VALUES('Vendor B','catering',false) RETURNING id INTO v2;
 SELECT public.create_admin_vendor_assignment(b,bs,v,100,CURRENT_DATE+1,'dietary','note',NULL) INTO a;
 BEGIN PERFORM public.create_admin_vendor_assignment(b,bs,v,100,NULL,NULL,NULL,NULL); RAISE EXCEPTION 'duplicate active assignment accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.create_admin_vendor_assignment(b,bs,v2,NULL,NULL,NULL,NULL,NULL); RAISE EXCEPTION 'inactive vendor accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 PERFORM public.update_admin_vendor_assignment(a,120,CURRENT_DATE+2,'updated','updated',1,NULL); PERFORM public.transition_admin_vendor_assignment(a,'confirmed',2,NULL); IF NOT EXISTS(SELECT 1 FROM public.event_vendor_assignments WHERE id=a AND status='confirmed' AND agreed_cost=120) THEN RAISE EXCEPTION 'assignment lifecycle failed'; END IF;
 BEGIN PERFORM public.update_admin_vendor_assignment(a,1,NULL,NULL,NULL,3,NULL); RAISE EXCEPTION 'confirmed assignment updated'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 IF (SELECT total_price_snapshot FROM public.celebration_booking_services WHERE id=bs)<>price THEN RAISE EXCEPTION 'customer snapshot changed'; END IF; SELECT count(*) INTO c FROM public.event_vendor_assignment_activities WHERE assignment_id=a; IF c<>3 THEN RAISE EXCEPTION 'assignment audit missing'; END IF;
END $t$;
ROLLBACK;
