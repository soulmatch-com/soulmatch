-- Keep the original update RPC for callers already deployed, while adding the
-- service-aware form used by the Phase 4B edit dialog.
CREATE OR REPLACE FUNCTION public.update_admin_event_task(p_task_id UUID,p_title TEXT,p_description TEXT,p_category TEXT,p_assigned_admin_id UUID,p_due_date DATE,p_priority TEXT,p_booking_service_id UUID,p_expected_lock_version INTEGER,p_admin_id UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.event_tasks%ROWTYPE; v_meta JSONB;
BEGIN
 SELECT * INTO v FROM public.event_tasks WHERE id=p_task_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task not found' USING ERRCODE='P0002'; END IF;
 IF v.lock_version <> p_expected_lock_version THEN RAISE EXCEPTION 'Task was updated by another administrator' USING ERRCODE='40001'; END IF;
 IF v.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Completed or cancelled tasks cannot be edited; reopen first' USING ERRCODE='22023'; END IF;
 IF p_booking_service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.celebration_booking_services WHERE id=p_booking_service_id AND booking_id=v.booking_id) THEN RAISE EXCEPTION 'Booking service does not belong to this booking' USING ERRCODE='22023'; END IF;
 IF p_assigned_admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.admins WHERE id=p_assigned_admin_id AND is_active) THEN RAISE EXCEPTION 'Assigned administrator is not active' USING ERRCODE='22023'; END IF;
 IF NULLIF(btrim(p_title),'') IS NULL OR p_category NOT IN ('ceremony_preparation','priest_coordination','food_catering','decoration','accommodation','transportation','photography','guest_coordination','general_administration') OR p_priority NOT IN ('low','medium','high','urgent') THEN RAISE EXCEPTION 'Invalid task details' USING ERRCODE='22023'; END IF;
 v_meta := jsonb_build_object('from',jsonb_build_object('title',v.title,'description',v.description,'category',v.category,'booking_service_id',v.booking_service_id,'assigned_admin_id',v.assigned_admin_id,'due_date',v.due_date,'priority',v.priority),'to',jsonb_build_object('title',btrim(p_title),'description',NULLIF(btrim(p_description),''),'category',p_category,'booking_service_id',p_booking_service_id,'assigned_admin_id',p_assigned_admin_id,'due_date',p_due_date,'priority',p_priority));
 UPDATE public.event_tasks SET title=btrim(p_title),description=NULLIF(btrim(p_description),''),category=p_category,booking_service_id=p_booking_service_id,assigned_admin_id=p_assigned_admin_id,due_date=p_due_date,priority=p_priority WHERE id=p_task_id;
 INSERT INTO public.event_task_activities(task_id,event_type,actor_id,metadata) VALUES(p_task_id,'updated',p_admin_id,v_meta);
 RETURN p_task_id;
END $$;
REVOKE ALL ON FUNCTION public.update_admin_event_task(UUID,TEXT,TEXT,TEXT,UUID,DATE,TEXT,UUID,INTEGER,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_event_task(UUID,TEXT,TEXT,TEXT,UUID,DATE,TEXT,UUID,INTEGER,UUID) TO service_role;
