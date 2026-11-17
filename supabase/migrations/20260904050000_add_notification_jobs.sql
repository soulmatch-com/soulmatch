-- Notification queue foundation. Not applied by Codex.
-- Apply after add_email_subscribers.sql and add_notification_campaigns.sql.

ALTER TABLE public.notification_campaigns
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.notification_campaigns
  ADD CONSTRAINT notification_campaigns_recipient_count_check CHECK (recipient_count >= 0),
  ADD CONSTRAINT notification_campaigns_sent_count_check CHECK (sent_count >= 0),
  ADD CONSTRAINT notification_campaigns_failed_count_check CHECK (failed_count >= 0),
  ADD CONSTRAINT notification_campaigns_skipped_count_check CHECK (skipped_count >= 0);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.notification_campaigns(id) ON DELETE RESTRICT,
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NULL,
  claimed_at TIMESTAMPTZ NULL,
  processed_at TIMESTAMPTZ NULL,
  provider_message_id TEXT NULL,
  last_error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_jobs_channel_check CHECK (channel IN ('email')),
  CONSTRAINT notification_jobs_status_check CHECK (status IN ('pending', 'processing', 'retry', 'sent', 'failed', 'skipped')),
  CONSTRAINT notification_jobs_attempt_count_check CHECK (attempt_count >= 0),
  CONSTRAINT notification_jobs_campaign_subscriber_channel_unique UNIQUE (campaign_id, subscriber_id, channel)
);

CREATE INDEX IF NOT EXISTS notification_jobs_campaign_id_idx ON public.notification_jobs (campaign_id);
CREATE INDEX IF NOT EXISTS notification_jobs_subscriber_id_idx ON public.notification_jobs (subscriber_id);
CREATE INDEX IF NOT EXISTS notification_jobs_pending_retry_idx ON public.notification_jobs (status, next_attempt_at, created_at)
  WHERE status IN ('pending', 'retry');

CREATE OR REPLACE FUNCTION public.set_notification_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_notification_jobs_updated_at ON public.notification_jobs;
CREATE TRIGGER update_notification_jobs_updated_at
  BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_job_updated_at();

-- This atomic RPC is notification-owned. It freezes subscribers at queue time;
-- a future worker must re-check subscription status before delivery.
CREATE OR REPLACE FUNCTION public.queue_notification_campaign(p_campaign_id UUID)
RETURNS TABLE(status TEXT, campaign_id UUID, recipient_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_campaign public.notification_campaigns%ROWTYPE;
  v_recipient_count INTEGER;
BEGIN
  SELECT * INTO v_campaign
  FROM public.notification_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, p_campaign_id, 0;
    RETURN;
  END IF;

  IF v_campaign.status = 'queued' THEN
    RETURN QUERY SELECT 'already_queued'::TEXT, v_campaign.id, v_campaign.recipient_count;
    RETURN;
  END IF;

  IF v_campaign.status <> 'draft' THEN
    RETURN QUERY SELECT 'invalid_status'::TEXT, v_campaign.id, v_campaign.recipient_count;
    RETURN;
  END IF;

  IF v_campaign.campaign_type <> 'blog_publication' OR v_campaign.channel <> 'email' OR v_campaign.locale IS NULL OR v_campaign.locale NOT IN ('en', 'ta') THEN
    RETURN QUERY SELECT 'unsupported_campaign'::TEXT, v_campaign.id, 0;
    RETURN;
  END IF;

  INSERT INTO public.notification_jobs (campaign_id, subscriber_id, channel, status, attempt_count, created_at, updated_at)
  SELECT v_campaign.id, subscriber.id, v_campaign.channel, 'pending', 0, NOW(), NOW()
  FROM public.email_subscribers AS subscriber
  WHERE subscriber.status = 'subscribed'
    AND subscriber.preferred_locale = v_campaign.locale
  ON CONFLICT (campaign_id, subscriber_id, channel) DO NOTHING;

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;
  IF v_recipient_count = 0 THEN
    RETURN QUERY SELECT 'no_recipients'::TEXT, v_campaign.id, 0;
    RETURN;
  END IF;

  UPDATE public.notification_campaigns
  SET status = 'queued', queued_at = NOW(), recipient_count = v_recipient_count,
      sent_count = 0, failed_count = 0, skipped_count = 0, updated_at = NOW()
  WHERE id = v_campaign.id;

  RETURN QUERY SELECT 'queued'::TEXT, v_campaign.id, v_recipient_count;
END;
$$;

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_notification_campaign(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_notification_campaign(UUID) TO service_role;
