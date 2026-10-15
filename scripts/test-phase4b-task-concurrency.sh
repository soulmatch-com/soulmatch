#!/usr/bin/env bash
set -euo pipefail
db='postgresql://postgres:postgres@127.0.0.1:54322/postgres'; ref="P4B-CONC-$(date +%s)-$$"; booking=''; task=''
cleanup(){ [ -n "$booking" ] && psql "$db" -X -q -c "DELETE FROM public.celebration_bookings WHERE id='$booking'; DELETE FROM public.quotations WHERE quotation_number='$ref'" >/dev/null 2>&1 || true; }
trap cleanup EXIT
booking=$(psql "$db" -X -qAt -v ON_ERROR_STOP=1 -c "INSERT INTO public.quotations(quotation_number,status,total_amount)VALUES('$ref','accepted',0) RETURNING id" | xargs -I{} psql "$db" -X -qAt -c "INSERT INTO public.celebration_bookings(booking_reference,quotation_id,status,quoted_total)VALUES('$ref', '{}','confirmed',0) RETURNING id")
task=$(psql "$db" -X -At -v ON_ERROR_STOP=1 -c "SELECT public.create_admin_event_task('$booking',NULL,'Concurrent task',NULL,'general_administration',NULL,NULL,'medium',NULL)")
psql "$db" -X -v ON_ERROR_STOP=1 -c "BEGIN;SELECT public.transition_admin_event_task('$task','in_progress',1,NULL);SELECT pg_sleep(3);COMMIT" >/tmp/p4b-a.log 2>&1 & a=$!;sleep .3
set +e; psql "$db" -X -v ON_ERROR_STOP=1 -c "SELECT public.transition_admin_event_task('$task','in_progress',1,NULL)" >/tmp/p4b-b.log 2>&1; code=$?;set -e;wait "$a"
[ "$code" -ne 0 ] && rg -q 'Task was updated by another administrator' /tmp/p4b-b.log && [ "$(psql "$db" -X -At -c "SELECT status FROM public.event_tasks WHERE id='$task'")" = in_progress ] && echo 'PASS: concurrent stale task update rejected after row lock'
