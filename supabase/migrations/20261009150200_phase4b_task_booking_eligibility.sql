CREATE OR REPLACE FUNCTION public.enforce_event_task_booking_eligibility() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_status TEXT;
BEGIN SELECT status INTO v_status FROM public.celebration_bookings WHERE id=NEW.booking_id; IF v_status NOT IN ('confirmed','planning','ready') THEN RAISE EXCEPTION 'Tasks may only be created for confirmed, planning, or ready bookings' USING ERRCODE='22023'; END IF; RETURN NEW; END $$;
CREATE TRIGGER event_tasks_booking_eligibility BEFORE INSERT ON public.event_tasks FOR EACH ROW EXECUTE FUNCTION public.enforce_event_task_booking_eligibility();
