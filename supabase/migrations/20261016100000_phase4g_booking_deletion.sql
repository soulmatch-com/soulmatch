-- Phase 4G: remove an uncommitted or cancelled booking without deleting
-- financial records. Operational children cascade with the booking.
CREATE OR REPLACE FUNCTION public.delete_admin_booking(p_booking_id UUID, p_admin_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $delete_booking$
DECLARE v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.celebration_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id AND is_active) THEN
    RAISE EXCEPTION 'An active administrator is required' USING ERRCODE = '42501';
  END IF;
  IF v_status NOT IN ('pending_confirmation', 'cancelled') THEN
    RAISE EXCEPTION 'Only pending-confirmation or cancelled bookings can be deleted' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.booking_payment_records WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'Bookings with payment records cannot be deleted' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.celebration_bookings WHERE id = p_booking_id;
  RETURN p_booking_id;
END;
$delete_booking$;

REVOKE ALL ON FUNCTION public.delete_admin_booking(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_admin_booking(UUID, UUID) TO service_role;
