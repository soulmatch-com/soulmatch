-- Amount edits and their audit entries commit together under the booking lock.
ALTER TABLE public.celebration_booking_activities
  DROP CONSTRAINT celebration_booking_activities_event_type_check;
ALTER TABLE public.celebration_booking_activities
  ADD CONSTRAINT celebration_booking_activities_event_type_check
  CHECK (event_type IN ('created', 'status_transition', 'additional_quotation_linked', 'amount_changed'));

CREATE OR REPLACE FUNCTION public.alter_admin_booking_amount(
  p_booking_id UUID, p_expected_total NUMERIC, p_new_total NUMERIC,
  p_reason TEXT, p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $alter_booking_amount$
DECLARE
  v_booking public.celebration_bookings%ROWTYPE;
  v_net_received NUMERIC;
  v_activity_id UUID;
BEGIN
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id AND is_active) THEN
    RAISE EXCEPTION 'An active administrator is required' USING ERRCODE = '42501';
  END IF;
  IF v_booking.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'The amount cannot be altered for a completed or cancelled booking' USING ERRCODE = '22023';
  END IF;
  IF p_expected_total IS NULL OR p_expected_total <> v_booking.quoted_total THEN
    RAISE EXCEPTION 'The booking amount has changed. Reload the booking and try again.' USING ERRCODE = '40001';
  END IF;
  IF p_new_total IS NULL OR p_new_total::text IN ('NaN', 'Infinity', '-Infinity')
      OR p_new_total < 0 OR p_new_total > 9999999999.99 OR p_new_total <> round(p_new_total, 2)
      OR NULLIF(btrim(p_reason), '') IS NULL OR char_length(btrim(p_reason)) > 2000 THEN
    RAISE EXCEPTION 'Enter a valid amount and a reason of up to 2000 characters' USING ERRCODE = '22023';
  END IF;
  IF p_new_total = v_booking.quoted_total THEN
    RAISE EXCEPTION 'Enter an amount different from the current total' USING ERRCODE = '22023';
  END IF;
  SELECT net_received INTO v_net_received FROM public.booking_payment_summary(p_booking_id);
  IF p_new_total < v_net_received THEN
    RAISE EXCEPTION 'The booking amount cannot be less than the net payments received' USING ERRCODE = '22023';
  END IF;

  UPDATE public.celebration_bookings SET quoted_total = p_new_total WHERE id = p_booking_id;
  INSERT INTO public.celebration_booking_activities (booking_id, event_type, admin_id, metadata)
  VALUES (p_booking_id, 'amount_changed', p_admin_id,
    jsonb_build_object('previous_total', v_booking.quoted_total, 'new_total', p_new_total,
      'currency', v_booking.currency, 'reason', btrim(p_reason)))
  RETURNING id INTO v_activity_id;
  RETURN v_activity_id;
END;
$alter_booking_amount$;

REVOKE ALL ON FUNCTION public.alter_admin_booking_amount(UUID, NUMERIC, NUMERIC, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alter_admin_booking_amount(UUID, NUMERIC, NUMERIC, TEXT, UUID) TO service_role;

-- Retain the existing add-on behavior and capture its exact before/after totals.
CREATE OR REPLACE FUNCTION public.add_admin_booking_quotation(
  p_booking_id UUID, p_quotation_id UUID, p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $add_booking_quote$
DECLARE
  v_booking public.celebration_bookings%ROWTYPE;
  v_status TEXT;
  v_total NUMERIC(12,2);
  v_currency TEXT;
  v_link_id UUID;
BEGIN
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF v_booking.status NOT IN ('confirmed', 'planning', 'ready') THEN
    RAISE EXCEPTION 'Only active bookings can receive an additional quotation' USING ERRCODE = '22023';
  END IF;
  SELECT status, total_amount, currency INTO v_status, v_total, v_currency
  FROM public.quotations WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quotation not found' USING ERRCODE = 'P0002'; END IF;
  IF v_status <> 'accepted' THEN RAISE EXCEPTION 'Only accepted quotations can be added to a booking' USING ERRCODE = '22023'; END IF;
  IF v_currency <> v_booking.currency THEN RAISE EXCEPTION 'Quotation currency does not match the booking' USING ERRCODE = '22023'; END IF;
  IF p_quotation_id = v_booking.quotation_id THEN RAISE EXCEPTION 'This quotation already created the booking' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.celebration_bookings WHERE quotation_id = p_quotation_id) THEN
    RAISE EXCEPTION 'This quotation already belongs to another booking' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.celebration_booking_additional_quotations WHERE quotation_id = p_quotation_id) THEN
    RAISE EXCEPTION 'This quotation is already linked to a booking' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE quotation_id = p_quotation_id) THEN
    RAISE EXCEPTION 'Accepted quotation has no service items' USING ERRCODE = '22023'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id AND is_active) THEN
    RAISE EXCEPTION 'An active administrator is required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.celebration_booking_additional_quotations (booking_id, quotation_id, linked_by)
  VALUES (p_booking_id, p_quotation_id, p_admin_id) RETURNING quotation_id INTO v_link_id;
  INSERT INTO public.celebration_booking_services (
    booking_id, quotation_item_id, service_id, service_name_snapshot,
    service_code_snapshot, description_snapshot, quantity, unit_price_snapshot, total_price_snapshot
  )
  SELECT p_booking_id, qi.id, qi.celebration_service_id, qi.service_name,
    qi.service_code, service.description, qi.quantity, qi.unit_price, qi.line_total
  FROM public.quotation_items qi
  LEFT JOIN public.celebration_services service ON service.id = qi.celebration_service_id
  WHERE qi.quotation_id = p_quotation_id;
  INSERT INTO public.celebration_booking_leads (booking_id, lead_id)
  SELECT p_booking_id, lead_id FROM public.quotation_leads WHERE quotation_id = p_quotation_id
  ON CONFLICT DO NOTHING;
  UPDATE public.celebration_bookings SET quoted_total = quoted_total + v_total WHERE id = p_booking_id;
  INSERT INTO public.celebration_booking_activities (booking_id, event_type, admin_id, metadata)
  VALUES (p_booking_id, 'additional_quotation_linked', p_admin_id,
    jsonb_build_object('quotation_id', p_quotation_id, 'added_total', v_total,
      'previous_total', v_booking.quoted_total, 'new_total', v_booking.quoted_total + v_total,
      'currency', v_booking.currency));
  RETURN v_link_id;
END;
$add_booking_quote$;
