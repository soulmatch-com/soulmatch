-- Phase 1H: apply after add_email_suppressions.sql.
ALTER TABLE public.notification_campaigns
  ADD COLUMN IF NOT EXISTS queued_by UUID NULL;

-- A current estimate only. Queueing still performs the authoritative expansion
-- in the transaction below, so this function never creates jobs or mutates a campaign.
CREATE OR REPLACE FUNCTION public.count_notification_campaign_recipients(p_campaign_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.notification_campaigns%ROWTYPE;
BEGIN
  SELECT * INTO v_campaign FROM public.notification_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND OR v_campaign.campaign_type <> 'blog_publication' OR v_campaign.channel <> 'email'
    OR v_campaign.locale NOT IN ('en', 'ta') THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.email_subscribers AS subscriber
    WHERE subscriber.status = 'subscribed'
      AND subscriber.preferred_locale = v_campaign.locale
      AND NOT EXISTS (
        SELECT 1 FROM public.email_suppressions AS suppression
        WHERE suppression.subscriber_id = subscriber.id
          AND suppression.released_at IS NULL
      )
  );
END;
$$;

-- Replaces the Phase 1E one-argument RPC so queue ownership is recorded in the
-- same transaction as recipient expansion and the draft -> queued transition.
DROP FUNCTION IF EXISTS public.queue_notification_campaign(UUID);
CREATE FUNCTION public.queue_notification_campaign(p_campaign_id UUID, p_queued_by UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, campaign_id UUID, recipient_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF v_campaign.campaign_type <> 'blog_publication' OR v_campaign.channel <> 'email'
    OR v_campaign.locale NOT IN ('en', 'ta') THEN
    RETURN QUERY SELECT 'unsupported_campaign'::TEXT, v_campaign.id, 0;
    RETURN;
  END IF;

  INSERT INTO public.notification_jobs (campaign_id, subscriber_id, channel, status)
  SELECT v_campaign.id, subscriber.id, v_campaign.channel, 'pending'
  FROM public.email_subscribers AS subscriber
  WHERE subscriber.status = 'subscribed'
    AND subscriber.preferred_locale = v_campaign.locale
    AND NOT EXISTS (
      SELECT 1 FROM public.email_suppressions AS suppression
      WHERE suppression.subscriber_id = subscriber.id
        AND suppression.released_at IS NULL
    )
  ON CONFLICT (campaign_id, subscriber_id, channel) DO NOTHING;

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;
  IF v_recipient_count = 0 THEN
    RETURN QUERY SELECT 'no_recipients'::TEXT, v_campaign.id, 0;
    RETURN;
  END IF;

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
