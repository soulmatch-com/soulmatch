-- Completes the worker-claim ambiguity correction from the prior local rehearsal.
-- Apply after fix_notification_worker_claim_ambiguity.sql.

CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_batch_size INTEGER)
RETURNS TABLE(id UUID, campaign_id UUID, subscriber_id UUID, channel TEXT, attempt_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_batch_size INTEGER := GREATEST(1, LEAST(COALESCE(p_batch_size, 25), 50));
BEGIN
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
    UPDATE public.notification_campaigns AS campaign_to_start
    SET status = 'processing', started_at = COALESCE(campaign_to_start.started_at, NOW()), updated_at = NOW()
    WHERE campaign_to_start.status = 'queued'
      AND campaign_to_start.id IN (SELECT claimed.campaign_id FROM claimed)
  )
  SELECT claimed.id, claimed.campaign_id, claimed.subscriber_id, claimed.channel, claimed.attempt_count
  FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_jobs(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INTEGER) TO service_role;
