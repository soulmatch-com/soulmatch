CREATE OR REPLACE FUNCTION public.delete_admin_booking_expense(
  p_booking_id UUID, p_expense_id UUID, p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_booking public.celebration_bookings%ROWTYPE;
BEGIN
  -- Use the same booking lock as expense recording and edits.
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id=p_admin_id AND is_active) THEN
    RAISE EXCEPTION 'An active administrator is required' USING ERRCODE='42501';
  END IF;
  IF v_booking.status IN ('pending_confirmation','cancelled') THEN
    RAISE EXCEPTION 'Booking is not eligible for expense deletion' USING ERRCODE='22023';
  END IF;
  DELETE FROM public.booking_expense_records WHERE id=p_expense_id AND booking_id=p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found for this booking' USING ERRCODE='P0002'; END IF;
  RETURN p_expense_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_admin_booking_expense(UUID,UUID,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_admin_booking_expense(UUID,UUID,UUID) TO service_role;
