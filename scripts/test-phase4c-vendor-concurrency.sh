#!/usr/bin/env bash
set -euo pipefail
db='postgresql://postgres:postgres@127.0.0.1:54322/postgres'; ref="P4C-CONC-$(date +%s)-$$"
service=$(psql "$db" -X -qAt -c "INSERT INTO public.celebration_services(code,name,location,is_active,display_order)VALUES('p4c'||substr(gen_random_uuid()::text,1,6),'Concurrency service','thirukadaiyur',true,99989) RETURNING id")
lead=$(psql "$db" -X -qAt -c "INSERT INTO public.leads(source,contact_name)VALUES('other','Concurrency lead') RETURNING id")
quote=$(psql "$db" -X -qAt -c "SELECT public.create_admin_quotation('$ref',CURRENT_DATE+1,NULL,NULL,jsonb_build_array(jsonb_build_object('service_id','$service'::uuid,'quantity',1,'unit_price',1)),ARRAY['$lead'::uuid])")
psql "$db" -X -qAt -c "SELECT public.transition_admin_quotation('$quote','sent',NULL); SELECT public.transition_admin_quotation('$quote','accepted',NULL)" >/dev/null
booking=$(psql "$db" -X -qAt -c "SELECT public.create_admin_booking('$quote',NULL)")
psql "$db" -X -qAt -c "SELECT public.transition_admin_booking('$booking','confirmed',NULL,NULL)" >/dev/null
vendor=$(psql "$db" -X -qAt -c "INSERT INTO public.event_vendors(vendor_name,category)VALUES('Concurrency $ref','test') RETURNING id")
sid=$(psql "$db" -X -qAt -c "SELECT id FROM public.celebration_booking_services WHERE booking_id='$booking' LIMIT 1")
assignment=$(psql "$db" -X -qAt -c "SELECT public.create_admin_vendor_assignment('$booking','$sid','$vendor',NULL,NULL,NULL,NULL,NULL)")
psql "$db" -X -v ON_ERROR_STOP=1 -c "BEGIN;SELECT public.update_admin_vendor_assignment('$assignment',10,NULL,NULL,NULL,1,NULL);SELECT pg_sleep(2);COMMIT" >/tmp/p4c-a.log 2>&1 & p=$!; sleep .2
set +e; psql "$db" -X -v ON_ERROR_STOP=1 -c "SELECT public.update_admin_vendor_assignment('$assignment',20,NULL,NULL,NULL,1,NULL)" >/tmp/p4c-b.log 2>&1; code=$?; set -e; wait "$p"
[ "$code" -ne 0 ] && rg -q 'updated by another administrator' /tmp/p4c-b.log && echo 'PASS: stale vendor assignment update rejected'
