-- Notification suppression foundation. Not applied by Codex.
-- Apply after subscribers, campaigns, jobs, and worker functions.

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_suppressions_reason_check CHECK (reason IN ('bounce', 'complaint', 'provider_suppression', 'manual_admin')),
  CONSTRAINT email_suppressions_source_check CHECK (source IN ('provider', 'admin', 'system'))
);

CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_one_active_per_subscriber
  ON public.email_suppressions (subscriber_id) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS email_suppressions_active_lookup_idx
  ON public.email_suppressions (subscriber_id) WHERE released_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_email_suppression_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS update_email_suppressions_updated_at ON public.email_suppressions;
CREATE TRIGGER update_email_suppressions_updated_at BEFORE UPDATE ON public.email_suppressions
FOR EACH ROW EXECUTE FUNCTION public.set_email_suppression_updated_at();

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_suppressions FROM PUBLIC, anon, authenticated;

-- Replace the notification-owned queue selector to exclude active suppressions.
CREATE OR REPLACE FUNCTION public.queue_notification_campaign(p_campaign_id UUID)
RETURNS TABLE(status TEXT, campaign_id UUID, recipient_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_campaign public.notification_campaigns%ROWTYPE; v_recipient_count INTEGER;
BEGIN
  SELECT * INTO v_campaign FROM public.notification_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found'::TEXT, p_campaign_id, 0; RETURN; END IF;
  IF v_campaign.status = 'queued' THEN RETURN QUERY SELECT 'already_queued'::TEXT, v_campaign.id, v_campaign.recipient_count; RETURN; END IF;
  IF v_campaign.status <> 'draft' THEN RETURN QUERY SELECT 'invalid_status'::TEXT, v_campaign.id, v_campaign.recipient_count; RETURN; END IF;
  IF v_campaign.campaign_type <> 'blog_publication' OR v_campaign.channel <> 'email' OR v_campaign.locale IS NULL OR v_campaign.locale NOT IN ('en', 'ta') THEN RETURN QUERY SELECT 'unsupported_campaign'::TEXT, v_campaign.id, 0; RETURN; END IF;
  INSERT INTO public.notification_jobs (campaign_id, subscriber_id, channel, status, attempt_count, created_at, updated_at)
  SELECT v_campaign.id, subscriber.id, v_campaign.channel, 'pending', 0, NOW(), NOW()
  FROM public.email_subscribers AS subscriber
  WHERE subscriber.status = 'subscribed' AND subscriber.preferred_locale = v_campaign.locale
    AND NOT EXISTS (SELECT 1 FROM public.email_suppressions AS suppression WHERE suppression.subscriber_id = subscriber.id AND suppression.released_at IS NULL)
  ON CONFLICT (campaign_id, subscriber_id, channel) DO NOTHING;
  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;
  IF v_recipient_count = 0 THEN RETURN QUERY SELECT 'no_recipients'::TEXT, v_campaign.id, 0; RETURN; END IF;
  UPDATE public.notification_campaigns SET status = 'queued', queued_at = NOW(), recipient_count = v_recipient_count, sent_count = 0, failed_count = 0, skipped_count = 0, updated_at = NOW() WHERE id = v_campaign.id;
  RETURN QUERY SELECT 'queued'::TEXT, v_campaign.id, v_recipient_count;
END;
$$;
