-- Allow one email address to opt into both supported notification locales.
-- Apply after the notification queue and suppression migrations.

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS subscribed_locales TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve every existing active subscription during the migration.
UPDATE public.email_subscribers
SET subscribed_locales = ARRAY[preferred_locale]
WHERE status = 'subscribed'
  AND cardinality(subscribed_locales) = 0
  AND preferred_locale IN ('en', 'ta');

ALTER TABLE public.email_subscribers
  ADD CONSTRAINT email_subscribers_subscribed_locales_supported_check
    CHECK (subscribed_locales <@ ARRAY['en', 'ta']::TEXT[]);

CREATE INDEX email_subscribers_subscribed_locales_idx
  ON public.email_subscribers USING GIN (subscribed_locales);

-- The estimate is read-only; membership is now determined by the set of
-- locales to which the subscriber explicitly opted in.
CREATE OR REPLACE FUNCTION public.count_notification_campaign_recipients(p_campaign_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_campaign public.notification_campaigns%ROWTYPE;
BEGIN
  SELECT * INTO v_campaign FROM public.notification_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND OR v_campaign.campaign_type <> 'blog_publication' OR v_campaign.channel <> 'email'
    OR v_campaign.locale NOT IN ('en', 'ta') THEN RETURN 0; END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER FROM public.email_subscribers AS subscriber
    WHERE subscriber.status = 'subscribed'
      AND v_campaign.locale = ANY(subscriber.subscribed_locales)
      AND NOT EXISTS (
        SELECT 1 FROM public.email_suppressions AS suppression
        WHERE suppression.subscriber_id = subscriber.id AND suppression.released_at IS NULL
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_notification_campaign(p_campaign_id UUID, p_queued_by UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, campaign_id UUID, recipient_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_campaign public.notification_campaigns%ROWTYPE; v_recipient_count INTEGER;
BEGIN
  SELECT * INTO v_campaign FROM public.notification_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found'::TEXT, p_campaign_id, 0; RETURN; END IF;
  IF v_campaign.status = 'queued' THEN RETURN QUERY SELECT 'already_queued'::TEXT, v_campaign.id, v_campaign.recipient_count; RETURN; END IF;
  IF v_campaign.status <> 'draft' THEN RETURN QUERY SELECT 'invalid_status'::TEXT, v_campaign.id, v_campaign.recipient_count; RETURN; END IF;
  IF v_campaign.campaign_type <> 'blog_publication' OR v_campaign.channel <> 'email'
    OR v_campaign.locale NOT IN ('en', 'ta') THEN RETURN QUERY SELECT 'unsupported_campaign'::TEXT, v_campaign.id, 0; RETURN; END IF;

  INSERT INTO public.notification_jobs (campaign_id, subscriber_id, channel, status)
  SELECT v_campaign.id, subscriber.id, v_campaign.channel, 'pending'
  FROM public.email_subscribers AS subscriber
  WHERE subscriber.status = 'subscribed'
    AND v_campaign.locale = ANY(subscriber.subscribed_locales)
    AND NOT EXISTS (
      SELECT 1 FROM public.email_suppressions AS suppression
      WHERE suppression.subscriber_id = subscriber.id AND suppression.released_at IS NULL
    )
  ON CONFLICT ON CONSTRAINT notification_jobs_campaign_subscriber_channel_unique DO NOTHING;

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;
  IF v_recipient_count = 0 THEN RETURN QUERY SELECT 'no_recipients'::TEXT, v_campaign.id, 0; RETURN; END IF;
  UPDATE public.notification_campaigns
  SET status = 'queued', queued_at = NOW(), queued_by = p_queued_by,
      recipient_count = v_recipient_count, updated_at = NOW()
  WHERE id = v_campaign.id;
  RETURN QUERY SELECT 'queued'::TEXT, v_campaign.id, v_recipient_count;
END;
$$;

REVOKE ALL ON FUNCTION public.count_notification_campaign_recipients(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_notification_campaign(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_notification_campaign_recipients(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_notification_campaign(UUID, UUID) TO service_role;
