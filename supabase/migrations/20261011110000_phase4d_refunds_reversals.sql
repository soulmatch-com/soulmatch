-- Phase 4D follow-up: append-only corrections of an already committed receipt.
-- Both functions lock the booking header before calculating a balance.  This is
-- deliberately the same serialization point as record_admin_booking_payment.
-- Check idempotency before balance validation: a retry remains safe even after
-- later receipts have settled the booking.
CREATE OR REPLACE FUNCTION public.record_admin_booking_payment(p_booking_id UUID,p_idempotency_key TEXT,p_amount NUMERIC,p_currency TEXT,p_method TEXT,p_external_reference TEXT,p_payment_date TIMESTAMPTZ,p_notes TEXT,p_admin_id UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v public.celebration_bookings%ROWTYPE; v_id UUID; v_net NUMERIC;
BEGIN
  SELECT * INTO v FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  SELECT id INTO v_id FROM public.booking_payment_records WHERE booking_id=p_booking_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN RETURN v_id; END IF;
  IF v.status IN('pending_confirmation','cancelled') OR v.currency <> 'INR' OR p_currency<>v.currency THEN RAISE EXCEPTION 'Booking is not eligible for payments' USING ERRCODE='22023'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.admins WHERE id=p_admin_id AND is_active) THEN RAISE EXCEPTION 'An active administrator is required' USING ERRCODE='42501'; END IF;
  IF p_amount<=0 OR p_method NOT IN('cash','upi','bank_transfer','card_external','other') OR NULLIF(btrim(p_idempotency_key),'') IS NULL OR p_payment_date IS NULL THEN RAISE EXCEPTION 'Invalid payment details' USING ERRCODE='22023'; END IF;
  SELECT net_received INTO v_net FROM public.booking_payment_summary(p_booking_id);
  IF v_net+p_amount>v.quoted_total THEN RAISE EXCEPTION 'Payment exceeds outstanding balance' USING ERRCODE='22023'; END IF;
  INSERT INTO public.booking_payment_records(booking_id,payment_reference,idempotency_key,transaction_type,amount,currency,payment_method,external_reference,payment_date,notes,recorded_by) VALUES(p_booking_id,'RCPT-'||upper(substr(gen_random_uuid()::text,1,12)),p_idempotency_key,'receipt',p_amount,p_currency,p_method,NULLIF(btrim(p_external_reference),''),p_payment_date,NULLIF(btrim(p_notes),''),p_admin_id) RETURNING id INTO v_id;
  INSERT INTO public.booking_payment_activities(payment_id,event_type,actor_id,metadata) VALUES(v_id,'recorded',p_admin_id,jsonb_build_object('amount',p_amount,'currency',p_currency));
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN SELECT id INTO v_id FROM public.booking_payment_records WHERE booking_id=p_booking_id AND idempotency_key=p_idempotency_key; IF v_id IS NOT NULL THEN RETURN v_id; END IF; RAISE;
END $fn$;

CREATE OR REPLACE FUNCTION public.record_admin_booking_payment_refund(
  p_booking_id UUID, p_original_payment_id UUID, p_idempotency_key TEXT,
  p_amount NUMERIC, p_currency TEXT, p_reason TEXT, p_payment_date TIMESTAMPTZ,
  p_admin_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_booking public.celebration_bookings%ROWTYPE; v_original public.booking_payment_records%ROWTYPE;
  v_id UUID; v_used NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  IF v_booking.status IN ('pending_confirmation','cancelled') OR v_booking.currency <> 'INR' OR p_currency <> v_booking.currency THEN RAISE EXCEPTION 'Booking is not eligible for this payment operation' USING ERRCODE='22023'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.admins WHERE id=p_admin_id AND is_active) THEN RAISE EXCEPTION 'An active administrator is required' USING ERRCODE='42501'; END IF;
  IF p_amount <= 0 OR NULLIF(btrim(p_idempotency_key),'') IS NULL OR NULLIF(btrim(p_reason),'') IS NULL OR p_payment_date IS NULL THEN RAISE EXCEPTION 'Invalid refund details' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_original FROM public.booking_payment_records WHERE id=p_original_payment_id AND booking_id=p_booking_id AND transaction_type='receipt';
  IF NOT FOUND THEN RAISE EXCEPTION 'Original receipt not found for this booking' USING ERRCODE='P0002'; END IF;
  SELECT COALESCE(sum(amount),0) INTO v_used FROM public.booking_payment_records WHERE original_payment_id=p_original_payment_id AND transaction_type IN ('refund','reversal');
  IF v_used+p_amount > v_original.amount THEN RAISE EXCEPTION 'Refund exceeds the refundable receipt balance' USING ERRCODE='22023'; END IF;
  SELECT id INTO v_id FROM public.booking_payment_records WHERE booking_id=p_booking_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN RETURN v_id; END IF;
  INSERT INTO public.booking_payment_records(booking_id,payment_reference,idempotency_key,transaction_type,original_payment_id,amount,currency,payment_date,notes,recorded_by)
    VALUES(p_booking_id,'RFND-'||upper(substr(gen_random_uuid()::text,1,12)),p_idempotency_key,'refund',p_original_payment_id,p_amount,p_currency,p_payment_date,btrim(p_reason),p_admin_id) RETURNING id INTO v_id;
  INSERT INTO public.booking_payment_activities(payment_id,event_type,actor_id,metadata)
    VALUES(v_id,'refunded',p_admin_id,jsonb_build_object('original_payment_id',p_original_payment_id,'amount',p_amount,'currency',p_currency,'reason',btrim(p_reason)));
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_id FROM public.booking_payment_records WHERE booking_id=p_booking_id AND idempotency_key=p_idempotency_key;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  RAISE;
END $fn$;

CREATE OR REPLACE FUNCTION public.reverse_admin_booking_payment(
  p_booking_id UUID, p_original_payment_id UUID, p_idempotency_key TEXT,
  p_amount NUMERIC, p_currency TEXT, p_reason TEXT, p_payment_date TIMESTAMPTZ,
  p_admin_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_booking public.celebration_bookings%ROWTYPE; v_original public.booking_payment_records%ROWTYPE;
  v_id UUID; v_used NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  IF v_booking.status IN ('pending_confirmation','cancelled') OR v_booking.currency <> 'INR' OR p_currency <> v_booking.currency THEN RAISE EXCEPTION 'Booking is not eligible for this payment operation' USING ERRCODE='22023'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.admins WHERE id=p_admin_id AND is_active) THEN RAISE EXCEPTION 'An active administrator is required' USING ERRCODE='42501'; END IF;
  IF p_amount <= 0 OR NULLIF(btrim(p_idempotency_key),'') IS NULL OR NULLIF(btrim(p_reason),'') IS NULL OR p_payment_date IS NULL THEN RAISE EXCEPTION 'Invalid reversal details' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_original FROM public.booking_payment_records WHERE id=p_original_payment_id AND booking_id=p_booking_id AND transaction_type='receipt';
  IF NOT FOUND THEN RAISE EXCEPTION 'Original receipt not found for this booking' USING ERRCODE='P0002'; END IF;
  -- A reversal can only remove value from this receipt; it can never create a credit.
  SELECT COALESCE(sum(amount),0) INTO v_used FROM public.booking_payment_records WHERE original_payment_id=p_original_payment_id AND transaction_type IN ('refund','reversal');
  IF v_used+p_amount > v_original.amount THEN RAISE EXCEPTION 'Reversal exceeds the reversible receipt balance' USING ERRCODE='22023'; END IF;
  SELECT id INTO v_id FROM public.booking_payment_records WHERE booking_id=p_booking_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN RETURN v_id; END IF;
  INSERT INTO public.booking_payment_records(booking_id,payment_reference,idempotency_key,transaction_type,original_payment_id,amount,currency,payment_date,notes,recorded_by)
    VALUES(p_booking_id,'RVSL-'||upper(substr(gen_random_uuid()::text,1,12)),p_idempotency_key,'reversal',p_original_payment_id,p_amount,p_currency,p_payment_date,btrim(p_reason),p_admin_id) RETURNING id INTO v_id;
  INSERT INTO public.booking_payment_activities(payment_id,event_type,actor_id,metadata)
    VALUES(v_id,'reversed',p_admin_id,jsonb_build_object('original_payment_id',p_original_payment_id,'amount',p_amount,'currency',p_currency,'reason',btrim(p_reason)));
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_id FROM public.booking_payment_records WHERE booking_id=p_booking_id AND idempotency_key=p_idempotency_key;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  RAISE;
END $fn$;

REVOKE ALL ON FUNCTION public.record_admin_booking_payment_refund(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT,TIMESTAMPTZ,UUID), public.reverse_admin_booking_payment(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT,TIMESTAMPTZ,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_booking_payment_refund(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT,TIMESTAMPTZ,UUID), public.reverse_admin_booking_payment(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT,TIMESTAMPTZ,UUID) TO service_role;
