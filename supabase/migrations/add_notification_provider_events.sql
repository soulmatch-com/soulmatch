-- Phase 1J: apply after add_notification_queue_audit.sql. Not applied by Codex.
ALTER TABLE public.notification_jobs
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL,
  ADD CONSTRAINT notification_jobs_delivery_status_check CHECK (delivery_status IS NULL OR delivery_status IN ('delivered', 'delayed', 'bounced', 'complained', 'suppressed', 'failed'));
CREATE UNIQUE INDEX IF NOT EXISTS notification_jobs_provider_message_id_unique ON public.notification_jobs(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_jobs_delivery_status_idx ON public.notification_jobs(delivery_status) WHERE delivery_status IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notification_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL, provider_event_id TEXT NOT NULL,
  provider_message_id TEXT NULL, event_type TEXT NOT NULL, job_id UUID NULL REFERENCES public.notification_jobs(id) ON DELETE SET NULL,
  campaign_id UUID NULL REFERENCES public.notification_campaigns(id) ON DELETE SET NULL, occurred_at TIMESTAMPTZ NULL,
  processing_status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_provider_events_provider_check CHECK (provider IN ('resend')),
  CONSTRAINT notification_provider_events_processing_check CHECK (processing_status IN ('processed', 'ignored', 'unmatched')),
  CONSTRAINT notification_provider_events_provider_id_unique UNIQUE (provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS notification_provider_events_job_idx ON public.notification_provider_events(job_id);
CREATE INDEX IF NOT EXISTS notification_provider_events_campaign_idx ON public.notification_provider_events(campaign_id);
ALTER TABLE public.notification_provider_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_provider_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_notification_provider_event(
  p_provider TEXT, p_provider_event_id TEXT, p_provider_message_id TEXT, p_event_type TEXT,
  p_occurred_at TIMESTAMPTZ, p_delivery_status TEXT, p_suppression_reason TEXT
) RETURNS TABLE(processing_status TEXT, job_id UUID, campaign_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_job public.notification_jobs%ROWTYPE; v_status TEXT; v_inserted UUID;
BEGIN
  INSERT INTO public.notification_provider_events(provider, provider_event_id, provider_message_id, event_type, occurred_at, processing_status)
  VALUES (p_provider, p_provider_event_id, p_provider_message_id, p_event_type, p_occurred_at, 'ignored')
  ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id INTO v_inserted;
  IF v_inserted IS NULL THEN RETURN QUERY SELECT 'already_processed'::TEXT, NULL::UUID, NULL::UUID; RETURN; END IF;
  IF p_delivery_status IS NULL OR p_provider_message_id IS NULL THEN RETURN QUERY SELECT 'ignored'::TEXT, NULL::UUID, NULL::UUID; RETURN; END IF;
  SELECT * INTO v_job FROM public.notification_jobs WHERE provider_message_id = p_provider_message_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.notification_provider_events SET processing_status = 'unmatched', updated_at = NOW() WHERE id = v_inserted;
    RETURN QUERY SELECT 'unmatched'::TEXT, NULL::UUID, NULL::UUID; RETURN;
  END IF;
  UPDATE public.notification_provider_events SET processing_status = 'processed', job_id = v_job.id, campaign_id = v_job.campaign_id, updated_at = NOW() WHERE id = v_inserted;
  IF v_job.delivery_updated_at IS NULL OR p_occurred_at >= v_job.delivery_updated_at THEN
    UPDATE public.notification_jobs SET delivery_status = p_delivery_status, delivery_updated_at = p_occurred_at,
      delivered_at = CASE WHEN p_delivery_status = 'delivered' THEN COALESCE(delivered_at, p_occurred_at) ELSE delivered_at END,
      updated_at = NOW() WHERE id = v_job.id;
  END IF;
  IF p_suppression_reason IN ('bounce', 'complaint', 'provider_suppression') THEN
    INSERT INTO public.email_suppressions(subscriber_id, reason, source) VALUES (v_job.subscriber_id, p_suppression_reason, 'provider') ON CONFLICT DO NOTHING;
  END IF;
  RETURN QUERY SELECT 'processed'::TEXT, v_job.id, v_job.campaign_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_notification_campaign_delivery_summary(p_campaign_id UUID)
RETURNS TABLE(delivered INTEGER, delayed INTEGER, bounced INTEGER, complained INTEGER, suppressed INTEGER, failed INTEGER)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*) FILTER (WHERE delivery_status = 'delivered')::INTEGER, COUNT(*) FILTER (WHERE delivery_status = 'delayed')::INTEGER,
    COUNT(*) FILTER (WHERE delivery_status = 'bounced')::INTEGER, COUNT(*) FILTER (WHERE delivery_status = 'complained')::INTEGER,
    COUNT(*) FILTER (WHERE delivery_status = 'suppressed')::INTEGER, COUNT(*) FILTER (WHERE delivery_status = 'failed')::INTEGER
  FROM public.notification_jobs WHERE campaign_id = p_campaign_id;
$$;
REVOKE ALL ON FUNCTION public.process_notification_provider_event(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_notification_campaign_delivery_summary(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_notification_provider_event(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_notification_campaign_delivery_summary(UUID) TO service_role;
