#!/usr/bin/env bash
set -euo pipefail
db="${LOCAL_SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
admin=$(psql "$db" -X -qAt -c "SELECT id FROM public.admins WHERE is_active LIMIT 1")
if [ -z "$admin" ]; then admin=$(psql "$db" -X -qAt -c "INSERT INTO public.admins(email,password_hash,name,role,is_active) VALUES('phase4d-concurrency-'||gen_random_uuid()||'@local.test','not-used','Phase 4D concurrency','admin',true) RETURNING id"); fi
ref="P4D-CONC-$(date +%s)-$$"
service=$(psql "$db" -X -qAt -c "INSERT INTO public.celebration_services(code,name,location,is_active,display_order) VALUES('p4d'||substr(gen_random_uuid()::text,1,8),'Payment concurrency service','thirukadaiyur',true,99987) RETURNING id")
lead=$(psql "$db" -X -qAt -c "INSERT INTO public.leads(source,contact_name) VALUES('other','Payment concurrency lead') RETURNING id")
quote=$(psql "$db" -X -qAt -c "SELECT public.create_admin_quotation('$ref',CURRENT_DATE+1,NULL,NULL,jsonb_build_array(jsonb_build_object('service_id','$service'::uuid,'quantity',1,'unit_price',100)),ARRAY['$lead'::uuid])")
psql "$db" -X -qAt -c "SELECT public.transition_admin_quotation('$quote','sent','$admin'); SELECT public.transition_admin_quotation('$quote','accepted','$admin')" >/dev/null
psql "$db" -X -qAt -c "SELECT public.create_admin_booking('$quote','$admin'); SELECT public.transition_admin_booking((SELECT id FROM public.celebration_bookings WHERE quotation_id='$quote'),'confirmed','$admin',NULL)" >/dev/null
booking=$(psql "$db" -X -qAt -c "SELECT id FROM public.celebration_bookings WHERE quotation_id='$quote'")
psql "$db" -X -v ON_ERROR_STOP=1 -c "BEGIN; SELECT public.record_admin_booking_payment('$booking','p4d-conc-a',60,'INR','upi',NULL,now(),NULL,'$admin'); SELECT pg_sleep(2); COMMIT" >/tmp/p4d-payment-a.log 2>&1 & first=$!
sleep .2
set +e
psql "$db" -X -v ON_ERROR_STOP=1 -c "SELECT public.record_admin_booking_payment('$booking','p4d-conc-b',60,'INR','upi',NULL,now(),NULL,'$admin')" >/tmp/p4d-payment-b.log 2>&1
second=$?
set -e
wait "$first"
[ "$second" -ne 0 ] && rg -q 'Payment exceeds outstanding balance' /tmp/p4d-payment-b.log
[ "$(psql "$db" -X -qAt -c "SELECT count(*) FROM public.booking_payment_records WHERE booking_id='$booking'")" = 1 ]
[ "$(psql "$db" -X -qAt -c "SELECT count(*) FROM public.booking_payment_activities a JOIN public.booking_payment_records p ON p.id=a.payment_id WHERE p.booking_id='$booking'")" = 1 ]
[ "$(psql "$db" -X -qAt -c "SELECT net_received=60 AND outstanding_balance=40 FROM public.booking_payment_summary('$booking')")" = t ]
echo 'PASS: competing receipt requests serialized with no partial financial records'
