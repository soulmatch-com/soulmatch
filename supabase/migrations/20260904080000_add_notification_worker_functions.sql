-- Notification worker foundation. Not applied by Codex.
-- Apply after subscribers, campaigns, and notification jobs migrations.

CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_batch_size INTEGER)
RETURNS TABLE(id UUID, campaign_id UUID, subscriber_id UUID, channel TEXT, attempt_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_batch_size INTEGER := GREATEST(1, LEAST(COALESCE(p_batch_size, 25), 50));
BEGIN
  -- Recover a crashed worker lease without delivering it here; it is reclaimed
  -- through the normal retry path on a later claim.
  UPDATE public.notification_jobs
  SET status = 'retry', claimed_at = NULL, next_attempt_at = NOW(), last_error_code = 'worker_lease_expired', updated_at = NOW()
  WHERE status = 'processing' AND claimed_at < NOW() - INTERVAL '15 minutes';

  RETURN QUERY
  WITH candidates AS (
    SELECT job.id
    FROM public.notification_jobs AS job
    JOIN public.notification_campaigns AS campaign ON campaign.id = job.campaign_id
    WHERE campaign.status IN ('queued', 'processing')
      AND (job.status = 'pending' OR (job.status = 'retry' AND job.next_attempt_at <= NOW()))
    ORDER BY job.created_at
    FOR UPDATE OF job SKIP LOCKED
    LIMIT v_batch_size
  ), claimed AS (
    UPDATE public.notification_jobs AS job
    SET status = 'processing', claimed_at = NOW(), updated_at = NOW()
    FROM candidates
    WHERE job.id = candidates.id
    RETURNING job.id, job.campaign_id, job.subscriber_id, job.channel, job.attempt_count
  ), campaign_started AS (
    UPDATE public.notification_campaigns
    SET status = 'processing', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
    WHERE status = 'queued' AND id IN (SELECT campaign_id FROM claimed)
  )
  SELECT claimed.id, claimed.campaign_id, claimed.subscriber_id, claimed.channel, claimed.attempt_count FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_notification_job_outcome(
  p_job_id UUID,
  p_outcome TEXT,
  p_attempt_count INTEGER,
  p_provider_message_id TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_next_attempt_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job public.notification_jobs%ROWTYPE;
  v_campaign public.notification_campaigns%ROWTYPE;
  v_active_jobs INTEGER;
BEGIN
  IF p_outcome NOT IN ('sent', 'skipped', 'failed', 'retry') THEN RETURN FALSE; END IF;
  SELECT * INTO v_job FROM public.notification_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.status <> 'processing' THEN RETURN FALSE; END IF;
  SELECT * INTO v_campaign FROM public.notification_campaigns WHERE id = v_job.campaign_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF p_outcome = 'retry' THEN
    UPDATE public.notification_jobs SET status = 'retry', attempt_count = GREATEST(attempt_count, p_attempt_count), next_attempt_at = p_next_attempt_at, claimed_at = NULL, last_error_code = p_error_code, updated_at = NOW() WHERE id = v_job.id;
    RETURN TRUE;
  END IF;

  UPDATE public.notification_jobs
  SET status = p_outcome, attempt_count = GREATEST(attempt_count, p_attempt_count), processed_at = NOW(), claimed_at = NULL,
      provider_message_id = CASE WHEN p_outcome = 'sent' THEN p_provider_message_id ELSE provider_message_id END,
      last_error_code = p_error_code, next_attempt_at = NULL, updated_at = NOW()
  WHERE id = v_job.id;

  UPDATE public.notification_campaigns
  SET sent_count = sent_count + CASE WHEN p_outcome = 'sent' THEN 1 ELSE 0 END,
      skipped_count = skipped_count + CASE WHEN p_outcome = 'skipped' THEN 1 ELSE 0 END,
      failed_count = failed_count + CASE WHEN p_outcome = 'failed' THEN 1 ELSE 0 END,
      updated_at = NOW()
  WHERE id = v_campaign.id;

  SELECT * INTO v_campaign FROM public.notification_campaigns WHERE id = v_campaign.id;

  SELECT COUNT(*) INTO v_active_jobs FROM public.notification_jobs
  WHERE campaign_id = v_campaign.id AND status IN ('pending', 'processing', 'retry');
  IF v_active_jobs = 0 THEN
    UPDATE public.notification_campaigns
    SET status = CASE
      WHEN v_campaign.failed_count = 0 THEN 'completed'
      WHEN v_campaign.sent_count > 0 THEN 'partially_failed'
      ELSE 'failed'
    END,
    completed_at = NOW(), updated_at = NOW()
    WHERE id = v_campaign.id AND v_campaign.sent_count + v_campaign.failed_count + v_campaign.skipped_count = v_campaign.recipient_count;
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_jobs(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_notification_job_outcome(UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_notification_job_outcome(UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
