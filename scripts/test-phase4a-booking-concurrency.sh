#!/usr/bin/env bash
set -euo pipefail

# Local Supabase only. Two independent psql processes call the production RPC
# against one accepted quotation; no existing records are reset or truncated.
db_url='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
fixture="PHASE4A-CONC-$(date +%s)-$$"
quote_id=''; lead_one=''; lead_two=''; service_id=''
cleanup() {
  if [ -n "$quote_id" ]; then psql "$db_url" -X -q -c "DELETE FROM public.celebration_bookings WHERE quotation_id = '$quote_id'; DELETE FROM public.quotations WHERE id = '$quote_id';" >/dev/null 2>&1 || true; fi
  if [ -n "$lead_one" ]; then psql "$db_url" -X -q -c "DELETE FROM public.leads WHERE id IN ('$lead_one', '$lead_two'); DELETE FROM public.celebration_services WHERE id = '$service_id';" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

IFS='|' read -r quote_id lead_one lead_two service_id < <(psql "$db_url" -X -At -v ON_ERROR_STOP=1 -c "
  WITH service AS (INSERT INTO public.celebration_services (code, name, location, is_active, display_order) VALUES ('$fixture', 'Phase 4A concurrency service', 'thirukadaiyur', TRUE, 99996) RETURNING id),
  lead_one AS (INSERT INTO public.leads (source, contact_name) VALUES ('other', 'Phase 4A concurrency lead one') RETURNING id),
  lead_two AS (INSERT INTO public.leads (source, contact_name) VALUES ('other', 'Phase 4A concurrency lead two') RETURNING id),
  quote AS (INSERT INTO public.quotations (quotation_number, status, valid_until, total_amount) VALUES ('$fixture', 'accepted', CURRENT_DATE + 7, 200) RETURNING id),
  item AS (INSERT INTO public.quotation_items (quotation_id, celebration_service_id, service_code, service_name, quantity, unit_price, line_total) SELECT quote.id, service.id, '$fixture', 'Phase 4A concurrency service', 2, 100, 200 FROM quote, service RETURNING id)
  SELECT quote.id || '|' || lead_one.id || '|' || lead_two.id || '|' || service.id FROM quote, lead_one, lead_two, service;" | tail -n1)

psql "$db_url" -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.quotation_leads (quotation_id, lead_id) VALUES ('$quote_id', '$lead_one'), ('$quote_id', '$lead_two');" >/dev/null

# Session A locks the quotation in create_admin_booking and keeps its transaction open.
psql "$db_url" -X -v ON_ERROR_STOP=1 -c "BEGIN; SELECT public.create_admin_booking('$quote_id', NULL); SELECT pg_sleep(3); COMMIT;" >/tmp/phase4a-concurrency-a.log 2>&1 &
first=$!
sleep 0.35

# Session B starts while A owns the row lock. Measure elapsed wall time to prove overlap.
started=$(date +%s)
second_id=$(psql "$db_url" -X -At -v ON_ERROR_STOP=1 -c "SELECT public.create_admin_booking('$quote_id', NULL);")
elapsed=$(( $(date +%s) - started ))
wait "$first"
first_id=$(rg -o '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' /tmp/phase4a-concurrency-a.log | sed -n '1p')

read -r booking_count service_count lead_count audit_count < <(psql "$db_url" -X -At -F ' ' -c "SELECT (SELECT count(*) FROM public.celebration_bookings WHERE quotation_id = '$quote_id'), (SELECT count(*) FROM public.celebration_booking_services s JOIN public.celebration_bookings b ON b.id = s.booking_id WHERE b.quotation_id = '$quote_id'), (SELECT count(*) FROM public.celebration_booking_leads l JOIN public.celebration_bookings b ON b.id = l.booking_id WHERE b.quotation_id = '$quote_id'), (SELECT count(*) FROM public.celebration_booking_activities a JOIN public.celebration_bookings b ON b.id = a.booking_id WHERE b.quotation_id = '$quote_id');")
if [ "$elapsed" -lt 2 ] || [ "$first_id" != "$second_id" ] || [ "$booking_count" != 1 ] || [ "$service_count" != 1 ] || [ "$lead_count" != 2 ] || [ "$audit_count" != 1 ]; then
  echo "FAIL: elapsed=${elapsed}s ids=$first_id/$second_id booking=$booking_count services=$service_count leads=$lead_count audit=$audit_count" >&2
  exit 1
fi
echo "PASS: two sessions overlapped for ${elapsed}s; one booking and immutable snapshots/audit were created; retry returned $second_id"
