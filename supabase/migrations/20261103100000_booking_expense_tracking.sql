-- Tracks how verified customer receipts are allocated to delivery expenses.
CREATE TABLE public.booking_expense_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.celebration_bookings(id) ON DELETE RESTRICT,
  vendor_assignment_id UUID REFERENCES public.event_vendor_assignments(id) ON DELETE RESTRICT,
  expense_reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 100),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  recorded_by UUID NOT NULL REFERENCES public.admins(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX booking_expense_idempotency_unique ON public.booking_expense_records(booking_id, idempotency_key);
CREATE INDEX booking_expense_records_booking_idx ON public.booking_expense_records(booking_id, expense_date DESC);
ALTER TABLE public.booking_expense_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_expense_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.booking_expense_records TO service_role;

CREATE OR REPLACE FUNCTION public.booking_expense_summary(p_booking_id UUID)
RETURNS TABLE(net_received NUMERIC, expenses_recorded NUMERIC, available_to_allocate NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT p.net_received,
    COALESCE((SELECT sum(e.amount) FROM public.booking_expense_records e WHERE e.booking_id=p_booking_id), 0),
    p.net_received - COALESCE((SELECT sum(e.amount) FROM public.booking_expense_records e WHERE e.booking_id=p_booking_id), 0)
  FROM public.booking_payment_summary(p_booking_id) p
$$;

CREATE OR REPLACE FUNCTION public.record_admin_booking_expense(
  p_booking_id UUID, p_vendor_assignment_id UUID, p_idempotency_key TEXT,
  p_category TEXT, p_amount NUMERIC, p_expense_date DATE, p_notes TEXT, p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_booking public.celebration_bookings%ROWTYPE; v_id UUID; v_available NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  IF v_booking.status IN ('pending_confirmation','cancelled') THEN RAISE EXCEPTION 'Booking is not eligible for expense tracking' USING ERRCODE='22023'; END IF;
  IF p_amount <= 0 OR NULLIF(btrim(p_category),'') IS NULL OR NULLIF(btrim(p_idempotency_key),'') IS NULL THEN RAISE EXCEPTION 'Invalid expense details' USING ERRCODE='22023'; END IF;
  IF p_vendor_assignment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.event_vendor_assignments WHERE id=p_vendor_assignment_id AND booking_id=p_booking_id) THEN RAISE EXCEPTION 'Vendor assignment does not belong to this booking' USING ERRCODE='22023'; END IF;
  SELECT available_to_allocate INTO v_available FROM public.booking_expense_summary(p_booking_id);
  IF p_amount > v_available THEN RAISE EXCEPTION 'Expense exceeds the amount currently received and available to allocate' USING ERRCODE='22023'; END IF;
  INSERT INTO public.booking_expense_records(booking_id,vendor_assignment_id,expense_reference,idempotency_key,category,amount,expense_date,notes,recorded_by)
  VALUES(p_booking_id,p_vendor_assignment_id,'EXP-'||upper(substr(gen_random_uuid()::text,1,12)),p_idempotency_key,NULLIF(btrim(p_category),''),p_amount,p_expense_date,NULLIF(btrim(p_notes),''),p_admin_id)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_id FROM public.booking_expense_records WHERE booking_id=p_booking_id AND idempotency_key=p_idempotency_key;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.booking_expense_summary(UUID), public.record_admin_booking_expense(UUID,UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_expense_summary(UUID), public.record_admin_booking_expense(UUID,UUID,TEXT,TEXT,NUMERIC,DATE,TEXT,UUID) TO service_role;
