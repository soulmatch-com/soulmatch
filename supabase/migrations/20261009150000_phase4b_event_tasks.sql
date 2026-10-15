-- Phase 4B: event-planning tasks are operational records, separate from immutable booking snapshots.
CREATE TABLE public.event_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_type TEXT NOT NULL CHECK (ceremony_type IN ('60th-marriage','70th-marriage','80th-marriage','all')),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('ceremony_preparation','priest_coordination','food_catering','decoration','accommodation','transportation','photography','guest_coordination','general_administration')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  service_code_snapshot TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.celebration_bookings(id) ON DELETE CASCADE,
  booking_service_id UUID REFERENCES public.celebration_booking_services(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.event_task_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 4000),
  category TEXT NOT NULL CHECK (category IN ('ceremony_preparation','priest_coordination','food_catering','decoration','accommodation','transportation','photography','guest_coordination','general_administration')),
  assigned_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  completed_at TIMESTAMPTZ, completed_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lock_version INTEGER NOT NULL DEFAULT 1,
  CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CHECK ((status = 'completed') = (completed_by IS NOT NULL))
);
CREATE TABLE public.event_task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), task_id UUID NOT NULL REFERENCES public.event_tasks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','updated','assignment_changed','due_date_changed','priority_changed','status_changed','completed','cancelled','reopened','checklist_generated')),
  actor_id UUID REFERENCES public.admins(id) ON DELETE SET NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.booking_task_template_generations (
  booking_id UUID NOT NULL REFERENCES public.celebration_bookings(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.event_task_templates(id) ON DELETE RESTRICT,
  task_id UUID NOT NULL REFERENCES public.event_tasks(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES public.admins(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (booking_id, template_id)
);
CREATE INDEX event_tasks_booking_status_idx ON public.event_tasks(booking_id, status, due_date);
CREATE INDEX event_tasks_assigned_admin_idx ON public.event_tasks(assigned_admin_id, status);
CREATE INDEX event_task_activities_task_created_idx ON public.event_task_activities(task_id, created_at DESC);
CREATE OR REPLACE FUNCTION public.set_event_task_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=NOW(); NEW.lock_version=OLD.lock_version+1; RETURN NEW; END $$;
CREATE TRIGGER event_tasks_updated_at BEFORE UPDATE ON public.event_tasks FOR EACH ROW EXECUTE FUNCTION public.set_event_task_updated_at();
CREATE TRIGGER event_task_templates_updated_at BEFORE UPDATE ON public.event_task_templates FOR EACH ROW EXECUTE FUNCTION public.set_celebration_booking_updated_at();
ALTER TABLE public.event_task_templates ENABLE ROW LEVEL SECURITY; ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY; ALTER TABLE public.event_task_activities ENABLE ROW LEVEL SECURITY; ALTER TABLE public.booking_task_template_generations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_task_templates, public.event_tasks, public.event_task_activities, public.booking_task_template_generations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.event_task_templates, public.event_tasks, public.event_task_activities, public.booking_task_template_generations TO service_role;

CREATE OR REPLACE FUNCTION public.create_admin_event_task(p_booking_id UUID,p_booking_service_id UUID,p_title TEXT,p_description TEXT,p_category TEXT,p_assigned_admin_id UUID,p_due_date DATE,p_priority TEXT,p_admin_id UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id UUID;
BEGIN
  PERFORM 1 FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
  IF p_booking_service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.celebration_booking_services WHERE id=p_booking_service_id AND booking_id=p_booking_id) THEN RAISE EXCEPTION 'Booking service does not belong to this booking' USING ERRCODE='22023'; END IF;
  IF p_assigned_admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.admins WHERE id=p_assigned_admin_id AND is_active) THEN RAISE EXCEPTION 'Assigned administrator is not active' USING ERRCODE='22023'; END IF;
  IF NULLIF(btrim(p_title),'') IS NULL OR p_category NOT IN ('ceremony_preparation','priest_coordination','food_catering','decoration','accommodation','transportation','photography','guest_coordination','general_administration') OR p_priority NOT IN ('low','medium','high','urgent') THEN RAISE EXCEPTION 'Invalid task details' USING ERRCODE='22023'; END IF;
  INSERT INTO public.event_tasks(booking_id,booking_service_id,title,description,category,assigned_admin_id,due_date,priority,created_by) VALUES(p_booking_id,p_booking_service_id,btrim(p_title),NULLIF(btrim(p_description),''),p_category,p_assigned_admin_id,p_due_date,p_priority,p_admin_id) RETURNING id INTO v_id;
  INSERT INTO public.event_task_activities(task_id,event_type,actor_id,metadata) VALUES(v_id,'created',p_admin_id,jsonb_build_object('booking_id',p_booking_id)); RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.update_admin_event_task(p_task_id UUID,p_title TEXT,p_description TEXT,p_category TEXT,p_assigned_admin_id UUID,p_due_date DATE,p_priority TEXT,p_expected_lock_version INTEGER,p_admin_id UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.event_tasks%ROWTYPE; v_meta JSONB := '{}'::jsonb;
BEGIN
 SELECT * INTO v FROM public.event_tasks WHERE id=p_task_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Task not found' USING ERRCODE='P0002'; END IF;
 IF v.lock_version <> p_expected_lock_version THEN RAISE EXCEPTION 'Task was updated by another administrator' USING ERRCODE='40001'; END IF;
 IF v.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Completed or cancelled tasks cannot be edited; reopen first' USING ERRCODE='22023'; END IF;
 IF p_assigned_admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.admins WHERE id=p_assigned_admin_id AND is_active) THEN RAISE EXCEPTION 'Assigned administrator is not active' USING ERRCODE='22023'; END IF;
 IF NULLIF(btrim(p_title),'') IS NULL OR p_category NOT IN ('ceremony_preparation','priest_coordination','food_catering','decoration','accommodation','transportation','photography','guest_coordination','general_administration') OR p_priority NOT IN ('low','medium','high','urgent') THEN RAISE EXCEPTION 'Invalid task details' USING ERRCODE='22023'; END IF;
 v_meta := jsonb_build_object('from',jsonb_build_object('assigned_admin_id',v.assigned_admin_id,'due_date',v.due_date,'priority',v.priority),'to',jsonb_build_object('assigned_admin_id',p_assigned_admin_id,'due_date',p_due_date,'priority',p_priority));
 UPDATE public.event_tasks SET title=btrim(p_title),description=NULLIF(btrim(p_description),''),category=p_category,assigned_admin_id=p_assigned_admin_id,due_date=p_due_date,priority=p_priority WHERE id=p_task_id;
 INSERT INTO public.event_task_activities(task_id,event_type,actor_id,metadata) VALUES(p_task_id,'updated',p_admin_id,v_meta); RETURN p_task_id;
END $$;
CREATE OR REPLACE FUNCTION public.transition_admin_event_task(p_task_id UUID,p_to_status TEXT,p_expected_lock_version INTEGER,p_admin_id UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.event_tasks%ROWTYPE; v_event TEXT;
BEGIN SELECT * INTO v FROM public.event_tasks WHERE id=p_task_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Task not found' USING ERRCODE='P0002'; END IF; IF v.lock_version<>p_expected_lock_version THEN RAISE EXCEPTION 'Task was updated by another administrator' USING ERRCODE='40001'; END IF;
 IF (v.status='pending' AND p_to_status NOT IN ('in_progress','cancelled')) OR (v.status='in_progress' AND p_to_status NOT IN ('completed','cancelled')) OR (v.status='completed' AND p_to_status<>'pending') OR (v.status='cancelled' AND p_to_status<>'pending') THEN RAISE EXCEPTION 'Task status transition is not allowed' USING ERRCODE='22023'; END IF;
 v_event:=CASE WHEN p_to_status='completed' THEN 'completed' WHEN p_to_status='cancelled' THEN 'cancelled' WHEN v.status IN ('completed','cancelled') THEN 'reopened' ELSE 'status_changed' END;
 UPDATE public.event_tasks SET status=p_to_status,completed_at=CASE WHEN p_to_status='completed' THEN NOW() ELSE NULL END,completed_by=CASE WHEN p_to_status='completed' THEN p_admin_id ELSE NULL END WHERE id=p_task_id;
 INSERT INTO public.event_task_activities(task_id,event_type,actor_id,metadata) VALUES(p_task_id,v_event,p_admin_id,jsonb_build_object('from',v.status,'to',p_to_status)); RETURN p_task_id;
END $$;
CREATE OR REPLACE FUNCTION public.generate_admin_booking_checklist(p_booking_id UUID,p_template_ids UUID[],p_admin_id UUID) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_template public.event_task_templates%ROWTYPE; v_task UUID; v_count INTEGER:=0; v_ceremony TEXT;
BEGIN
 SELECT ceremony_type INTO v_ceremony FROM public.celebration_bookings WHERE id=p_booking_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='P0002'; END IF;
 IF p_template_ids IS NULL OR cardinality(p_template_ids)=0 THEN RAISE EXCEPTION 'Select at least one template' USING ERRCODE='22023'; END IF;
 FOR v_template IN SELECT * FROM public.event_task_templates WHERE id=ANY(p_template_ids) AND is_active AND (ceremony_type IN ('all',COALESCE(v_ceremony,'all'))) LOOP
   IF NOT EXISTS (SELECT 1 FROM public.booking_task_template_generations WHERE booking_id=p_booking_id AND template_id=v_template.id) THEN
     INSERT INTO public.event_tasks(booking_id,template_id,title,description,category,priority,created_by) VALUES(p_booking_id,v_template.id,v_template.title,v_template.description,v_template.category,v_template.priority,p_admin_id) RETURNING id INTO v_task;
     INSERT INTO public.booking_task_template_generations(booking_id,template_id,task_id,generated_by) VALUES(p_booking_id,v_template.id,v_task,p_admin_id);
     INSERT INTO public.event_task_activities(task_id,event_type,actor_id,metadata) VALUES(v_task,'checklist_generated',p_admin_id,jsonb_build_object('template_id',v_template.id)); v_count:=v_count+1;
   END IF;
 END LOOP;
 IF v_count=0 THEN RAISE EXCEPTION 'No new applicable templates were selected' USING ERRCODE='22023'; END IF; RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.create_admin_event_task(UUID,UUID,TEXT,TEXT,TEXT,UUID,DATE,TEXT,UUID),public.update_admin_event_task(UUID,TEXT,TEXT,TEXT,UUID,DATE,TEXT,INTEGER,UUID),public.transition_admin_event_task(UUID,TEXT,INTEGER,UUID),public.generate_admin_booking_checklist(UUID,UUID[],UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_event_task(UUID,UUID,TEXT,TEXT,TEXT,UUID,DATE,TEXT,UUID),public.update_admin_event_task(UUID,TEXT,TEXT,TEXT,UUID,DATE,TEXT,INTEGER,UUID),public.transition_admin_event_task(UUID,TEXT,INTEGER,UUID),public.generate_admin_booking_checklist(UUID,UUID[],UUID) TO service_role;

INSERT INTO public.event_task_templates(ceremony_type,title,category,priority,service_code_snapshot) VALUES
('all','Confirm ceremony schedule','ceremony_preparation','high',NULL),('all','Coordinate priest requirements','priest_coordination','high',NULL),('all','Confirm guest communication plan','guest_coordination','medium',NULL),
('60th-marriage','Review Sashtiapthapoorthi ceremony checklist','ceremony_preparation','high',NULL),('70th-marriage','Review Bhimaratha Shanti ceremony checklist','ceremony_preparation','high',NULL),('80th-marriage','Review Sathabhishekam ceremony checklist','ceremony_preparation','high',NULL)
ON CONFLICT DO NOTHING;
