-- Correct receipts by appending a reversal and replacement, keeping the ledger intact.
ALTER TABLE public.booking_payment_activities
  DROP CONSTRAINT booking_payment_activities_event_type_check;
ALTER TABLE public.booking_payment_activities
  ADD CONSTRAINT booking_payment_activities_event_type_check
  CHECK (event_type IN ('recorded', 'refunded', 'reversed', 'edited'));

CREATE OR REPLACE FUNCTION public.edit_admin_booking_payment(
  p_booking_id UUID, p_payment_id UUID, p_idempotency_key TEXT,
  p_amount NUMERIC, p_method TEXT, p_external_reference TEXT,
  p_payment_date TIMESTAMPTZ, p_notes TEXT, p_reason TEXT, p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $edit_payment$
DECLARE
  v_booking public.celebration_bookings%ROWTYPE;
  v_original public.booking_payment_records%ROWTYPE;
  v_replacement public.booking_payment_records%ROWTYPE;
  v_replacement_id UUID;
  v_reversal_id UUID;
  v_net NUMERIC;
  v_expenses NUMERIC;
  v_key TEXT;
BEGIN
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id=p_admin_id AND is_active) THEN
    RAISE EXCEPTION 'An active administrator is required' USING ERRCODE='42501';
  END IF;
  IF NULLIF(btrim(p_idempotency_key),'') IS NULL OR char_length(p_idempotency_key)>160 THEN
    RAISE EXCEPTION 'A valid request key is required' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_original FROM public.booking_payment_records
  WHERE id=p_payment_id AND booking_id=p_booking_id AND transaction_type='receipt';
  IF NOT FOUND THEN RAISE EXCEPTION 'Receipt not found for this booking' USING ERRCODE='P0002'; END IF;
  SELECT (metadata->>'replacement_payment_id')::UUID INTO v_replacement_id
  FROM public.booking_payment_activities
  WHERE payment_id=p_payment_id AND event_type='edited' AND metadata->>'idempotency_key'=p_idempotency_key;
  IF FOUND THEN RETURN v_replacement_id; END IF;
  IF v_booking.status IN ('pending_confirmation','cancelled') THEN
    RAISE EXCEPTION 'Booking is not eligible for payment edits' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.booking_payment_records WHERE original_payment_id=p_payment_id) THEN
    RAISE EXCEPTION 'This receipt already has a refund, reversal or edit. Refresh and select an unadjusted receipt.' USING ERRCODE='22023';
  END IF;
  IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<=0
      OR p_amount>9999999999.99 OR p_amount<>round(p_amount,2)
      OR p_method IS NULL OR p_method NOT IN ('cash','upi','bank_transfer','card_external','other')
      OR p_payment_date IS NULL OR NOT isfinite(p_payment_date)
      OR char_length(p_external_reference)>200 OR char_length(p_notes)>2000
      OR NULLIF(btrim(p_reason),'') IS NULL OR char_length(btrim(p_reason))>2000 THEN
    RAISE EXCEPTION 'Check the payment details and provide a reason for the edit' USING ERRCODE='22023';
  END IF;
  IF p_amount=v_original.amount AND p_method=v_original.payment_method
      AND p_payment_date=v_original.payment_date
      AND NULLIF(btrim(p_external_reference),'') IS NOT DISTINCT FROM v_original.external_reference
      AND NULLIF(btrim(p_notes),'') IS NOT DISTINCT FROM v_original.notes THEN
    RAISE EXCEPTION 'Change at least one payment detail before saving' USING ERRCODE='22023';
  END IF;
  SELECT net_received INTO v_net FROM public.booking_payment_summary(p_booking_id);
  IF v_net-v_original.amount+p_amount>v_booking.quoted_total THEN
    RAISE EXCEPTION 'The corrected payment exceeds the booking balance' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(sum(amount),0) INTO v_expenses FROM public.booking_expense_records WHERE booking_id=p_booking_id;
  IF p_amount<v_original.amount AND v_net-v_original.amount+p_amount<v_expenses THEN
    RAISE EXCEPTION 'The corrected payment would reduce received funds below recorded expenses' USING ERRCODE='22023';
  END IF;

  v_key := p_payment_id::TEXT||':edit:'||p_idempotency_key;
  v_reversal_id := public.reverse_admin_booking_payment(p_booking_id,p_payment_id,v_key||':reverse',
    v_original.amount,v_original.currency,btrim(p_reason),now(),p_admin_id);
  v_replacement_id := public.record_admin_booking_payment(p_booking_id,v_key||':receipt',p_amount,
    v_original.currency,p_method,p_external_reference,p_payment_date,p_notes,p_admin_id);
  SELECT * INTO v_replacement FROM public.booking_payment_records WHERE id=v_replacement_id;
  INSERT INTO public.booking_payment_activities(payment_id,event_type,actor_id,metadata)
  VALUES (p_payment_id,'edited',p_admin_id,jsonb_build_object(
    'idempotency_key',p_idempotency_key, 'reason',btrim(p_reason),
    'replacement_payment_id',v_replacement_id, 'reversal_payment_id',v_reversal_id,
    'previous_payment',jsonb_build_object('reference',v_original.payment_reference,'amount',v_original.amount,
      'method',v_original.payment_method,'external_reference',v_original.external_reference,
      'payment_date',v_original.payment_date,'notes',v_original.notes),
    'new_payment',jsonb_build_object('reference',v_replacement.payment_reference,'amount',v_replacement.amount,
      'method',v_replacement.payment_method,'external_reference',v_replacement.external_reference,
      'payment_date',v_replacement.payment_date,'notes',v_replacement.notes)));
  RETURN v_replacement_id;
END;
$edit_payment$;

REVOKE ALL ON FUNCTION public.edit_admin_booking_payment(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_admin_booking_payment(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,UUID) TO service_role;
