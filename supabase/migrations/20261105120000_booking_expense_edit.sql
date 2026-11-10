ALTER TABLE public.booking_expense_records
  ADD COLUMN updated_at TIMESTAMPTZ,
  ADD COLUMN updated_by UUID REFERENCES public.admins(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.edit_admin_booking_expense(
  p_booking_id UUID, p_expense_id UUID, p_vendor_assignment_id UUID,
  p_category TEXT, p_amount NUMERIC, p_expense_date DATE, p_notes TEXT, p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_booking public.celebration_bookings%ROWTYPE;
  v_expense public.booking_expense_records%ROWTYPE;
  v_available NUMERIC;
BEGIN
  -- Serialize with expense creation and payment changes before checking funds.
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id=p_admin_id AND is_active) THEN
    RAISE EXCEPTION 'An active administrator is required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_expense FROM public.booking_expense_records WHERE id=p_expense_id AND booking_id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense not found for this booking' USING ERRCODE='P0002'; END IF;
  IF v_booking.status IN ('pending_confirmation','cancelled') THEN
    RAISE EXCEPTION 'Booking is not eligible for expense edits' USING ERRCODE='22023';
  END IF;
  IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<=0
      OR p_amount>9999999999.99 OR p_amount<>round(p_amount,2)
      OR NULLIF(btrim(p_category),'') IS NULL OR char_length(btrim(p_category))>100
      OR p_expense_date IS NULL OR NOT isfinite(p_expense_date) OR char_length(p_notes)>2000 THEN
    RAISE EXCEPTION 'Invalid expense details' USING ERRCODE='22023';
  END IF;
  IF p_vendor_assignment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.event_vendor_assignments WHERE id=p_vendor_assignment_id AND booking_id=p_booking_id
  ) THEN
    RAISE EXCEPTION 'Vendor assignment does not belong to this booking' USING ERRCODE='22023';
  END IF;
  SELECT available_to_allocate INTO v_available FROM public.booking_expense_summary(p_booking_id);
  IF p_amount>v_available+v_expense.amount THEN
    RAISE EXCEPTION 'Expense exceeds the amount currently received and available to allocate' USING ERRCODE='22023';
  END IF;
  UPDATE public.booking_expense_records SET
    vendor_assignment_id=p_vendor_assignment_id, category=btrim(p_category), amount=p_amount,
    expense_date=p_expense_date, notes=NULLIF(btrim(p_notes),''), updated_at=clock_timestamp(), updated_by=p_admin_id
  WHERE id=p_expense_id;
  RETURN p_expense_id;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_admin_booking_expense(UUID,UUID,UUID,TEXT,NUMERIC,DATE,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_admin_booking_expense(UUID,UUID,UUID,TEXT,NUMERIC,DATE,TEXT,UUID) TO service_role;
