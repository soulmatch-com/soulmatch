-- Permit system/test RPC calls without an administrator while preserving the server-controlled completion timestamp.
ALTER TABLE public.event_tasks DROP CONSTRAINT IF EXISTS event_tasks_check1;
ALTER TABLE public.event_tasks ADD CONSTRAINT event_tasks_completion_timestamp_check CHECK ((status = 'completed') = (completed_at IS NOT NULL));
