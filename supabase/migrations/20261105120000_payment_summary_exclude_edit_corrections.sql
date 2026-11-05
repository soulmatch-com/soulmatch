-- A payment edit replaces a receipt; it does not represent another collection.
-- Keep both ledger entries for audit, but exclude the superseded receipt and
-- its automatic reversal from gross receipts and reversal totals. Genuine
-- refunds and manually recorded reversals continue to count normally.
CREATE OR REPLACE FUNCTION public.booking_payment_summary(p_booking_id UUID)
RETURNS TABLE (
  booking_total NUMERIC, gross_received NUMERIC, total_refunded NUMERIC,
  total_reversed NUMERIC, net_received NUMERIC, outstanding_balance NUMERIC,
  payment_status TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $summary$
  WITH edit_corrections AS (
    SELECT a.payment_id AS original_payment_id, a.metadata->>'reversal_payment_id' AS reversal_payment_id
    FROM public.booking_payment_activities a
    JOIN public.booking_payment_records original ON original.id=a.payment_id
    WHERE original.booking_id=p_booking_id AND a.event_type='edited'
  ), totals AS (
    SELECT b.quoted_total AS booking_total,
      COALESCE(sum(p.amount) FILTER (
        WHERE p.transaction_type='receipt' AND NOT EXISTS (
          SELECT 1 FROM edit_corrections e WHERE e.original_payment_id=p.id
        )
      ),0) AS gross_received,
      COALESCE(sum(p.amount) FILTER (WHERE p.transaction_type='refund'),0) AS total_refunded,
      COALESCE(sum(p.amount) FILTER (
        WHERE p.transaction_type='reversal' AND NOT EXISTS (
          SELECT 1 FROM edit_corrections e WHERE e.reversal_payment_id=p.id::TEXT
        )
      ),0) AS total_reversed
    FROM public.celebration_bookings b
    LEFT JOIN public.booking_payment_records p ON p.booking_id=b.id
    WHERE b.id=p_booking_id
    GROUP BY b.id
  ), balances AS (
    SELECT totals.*, gross_received-total_refunded-total_reversed AS net_received FROM totals
  )
  SELECT booking_total, gross_received, total_refunded, total_reversed, net_received,
    booking_total-net_received AS outstanding_balance,
    CASE WHEN net_received=0 THEN 'unpaid' WHEN net_received>=booking_total THEN 'paid' ELSE 'partially_paid' END
  FROM balances;
$summary$;

REVOKE ALL ON FUNCTION public.booking_payment_summary(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_payment_summary(UUID) TO service_role;
