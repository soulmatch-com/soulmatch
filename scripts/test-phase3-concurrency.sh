#!/usr/bin/env bash
set -euo pipefail

# Local Supabase only. Requires psql and the Phase 3 migration.
db_url='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
fixture="PHASE3-CONC-$(date +%s)-$$"
quote_id=''
cleanup() { if [ -n "$quote_id" ]; then psql "$db_url" -X -q -c "DELETE FROM public.quotations WHERE id = '$quote_id'" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT

quote_id=$(psql "$db_url" -X -At -v ON_ERROR_STOP=1 -c "INSERT INTO public.quotations (quotation_number, status, valid_until) VALUES ('$fixture', 'draft', CURRENT_DATE + 7) RETURNING id")

# Session one obtains the row lock, transitions Draft -> Sent, then holds it.
psql "$db_url" -X -v ON_ERROR_STOP=1 -c "BEGIN; SELECT public.transition_admin_quotation('$quote_id', 'sent', NULL); SELECT pg_sleep(2); COMMIT;" >/tmp/phase3-concurrency-a.log 2>&1 &
first=$!
sleep 0.25

# Independent session overlaps while the lock is held. A second Send is invalid after session one commits.
set +e
psql "$db_url" -X -v ON_ERROR_STOP=1 -c "SELECT public.transition_admin_quotation('$quote_id', 'sent', NULL);" >/tmp/phase3-concurrency-b.log 2>&1
second_status=$?
set -e
wait "$first"

if [ "$second_status" -eq 0 ]; then echo 'Expected concurrent duplicate transition to fail' >&2; exit 1; fi
final_status=$(psql "$db_url" -X -At -c "SELECT status FROM public.quotations WHERE id = '$quote_id'")
audit_count=$(psql "$db_url" -X -At -c "SELECT count(*) FROM public.quotation_activity WHERE quotation_id = '$quote_id'")
if [ "$final_status" != sent ] || [ "$audit_count" != 1 ]; then echo "Unexpected final state: status=$final_status audit=$audit_count" >&2; exit 1; fi
grep -q 'Status transition is not allowed' /tmp/phase3-concurrency-b.log
echo "PASS: independent sessions serialized; final=$final_status, committed_audit_events=$audit_count"
