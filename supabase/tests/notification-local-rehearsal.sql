-- Local-only notification database rehearsal. This file deliberately rolls
-- back every fake record; never run it against a remote or production database.
BEGIN;

DO $$
DECLARE
  en_subscriber UUID;
  suppressed_en_subscriber UUID;
  ta_subscriber UUID;
  unsubscribed_after_queue_subscriber UUID;
  suppressed_after_queue_subscriber UUID;
  provider_suppression_subscriber UUID;
  en_suppression UUID;
  v_campaign_id UUID;
  no_recipient_campaign_id UUID;
  bounce_campaign_id UUID;
  retry_campaign_id UUID;
  unsubscribe_campaign_id UUID;
  suppression_after_queue_campaign_id UUID;
  provider_suppression_campaign_id UUID;
  job_id UUID;
  result_status TEXT;
  result_count INTEGER;
  outcome_recorded BOOLEAN;
  delivered_time TIMESTAMPTZ;
BEGIN
  INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
  VALUES ('test-en@example.invalid', 'en', 'subscribed', 'blog_listing')
  RETURNING id INTO en_subscriber;

  INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
  VALUES ('test-en-suppressed@example.invalid', 'en', 'subscribed', 'blog_listing')
  RETURNING id INTO suppressed_en_subscriber;

  INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
  VALUES ('test-ta@example.invalid', 'ta', 'subscribed', 'blog_listing')
  RETURNING id INTO ta_subscriber;

  INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
  VALUES
    ('test-unsubscribed@example.invalid', 'en', 'unsubscribed', 'blog_listing'),
    ('test-null-locale@example.invalid', NULL, 'subscribed', 'blog_listing');

  INSERT INTO public.email_suppressions (subscriber_id, reason, source)
  VALUES (suppressed_en_subscriber, 'manual_admin', 'admin')
  RETURNING id INTO en_suppression;

  BEGIN
    INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
    VALUES ('test-en@example.invalid', 'en', 'subscribed', 'blog_listing');
    RAISE EXCEPTION 'subscriber uniqueness was not enforced';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  INSERT INTO public.notification_campaigns (
    campaign_type, source_type, source_id, locale, channel, subject, headline, summary, target_url, source_published_at
  ) VALUES (
    'blog_publication', 'blog', 'local-rehearsal-en-1', 'en', 'email', 'Local rehearsal one', 'Local rehearsal one',
    'Fake local-only campaign.', 'https://example.invalid/local-rehearsal-one', NOW()
  ) RETURNING id INTO v_campaign_id;

  BEGIN
    INSERT INTO public.notification_campaigns (
      campaign_type, source_type, source_id, locale, channel, subject, headline, target_url, source_published_at
    ) VALUES (
      'blog_publication', 'blog', 'local-rehearsal-en-1', 'en', 'email', 'Duplicate', 'Duplicate',
      'https://example.invalid/duplicate', NOW()
    );
    RAISE EXCEPTION 'campaign duplicate protection was not enforced';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  IF public.count_notification_campaign_recipients(v_campaign_id) <> 1 THEN
    RAISE EXCEPTION 'expected one subscribed, matching-locale, non-suppressed recipient';
  END IF;

  SELECT status, recipient_count INTO result_status, result_count
  FROM public.queue_notification_campaign(v_campaign_id, '00000000-0000-0000-0000-000000000001'::UUID);
  IF result_status <> 'queued' OR result_count <> 1 THEN
    RAISE EXCEPTION 'queue did not freeze the expected recipient set';
  END IF;
  SELECT status, recipient_count INTO result_status, result_count
  FROM public.queue_notification_campaign(v_campaign_id, '00000000-0000-0000-0000-000000000001'::UUID);
  IF result_status <> 'already_queued' OR result_count <> 1
    OR (SELECT COUNT(*) FROM public.notification_jobs AS job WHERE job.campaign_id = v_campaign_id) <> 1 THEN
    RAISE EXCEPTION 'repeat queue operation was not idempotent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notification_campaigns
    WHERE id = v_campaign_id AND status = 'queued' AND recipient_count = 1
      AND sent_count = 0 AND failed_count = 0 AND skipped_count = 0
      AND queued_by = '00000000-0000-0000-0000-000000000001'::UUID
  ) OR NOT EXISTS (
    SELECT 1 FROM public.notification_jobs AS job
    WHERE job.campaign_id = v_campaign_id AND job.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'queue campaign transition, audit metadata, initial job state, or counters are incorrect';
  END IF;

  SELECT job.id INTO job_id FROM public.notification_jobs AS job WHERE job.campaign_id = v_campaign_id;
  BEGIN
    INSERT INTO public.notification_jobs (campaign_id, subscriber_id, channel)
    VALUES (v_campaign_id, en_subscriber, 'email');
    RAISE EXCEPTION 'job uniqueness was not enforced';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  SELECT claim.id INTO job_id FROM public.claim_notification_jobs(25) AS claim WHERE claim.campaign_id = v_campaign_id;
  IF job_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.notification_jobs WHERE id = job_id AND status = 'processing' AND claimed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'job claim did not atomically mark the job processing';
  END IF;

  IF NOT public.record_notification_job_outcome(job_id, 'sent', 1, 'local-message-delivered', NULL, NULL) THEN
    RAISE EXCEPTION 'sent outcome was not recorded';
  END IF;
  IF public.record_notification_job_outcome(job_id, 'sent', 1, 'local-message-delivered', NULL, NULL) THEN
    RAISE EXCEPTION 'outcome replay was not idempotent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notification_campaigns WHERE id = v_campaign_id AND status = 'completed' AND sent_count = 1) THEN
    RAISE EXCEPTION 'sent outcome counters or terminal campaign state are incorrect';
  END IF;

  SELECT processing_status INTO result_status
  FROM public.process_notification_provider_event('resend', 'local-event-delivered', 'local-message-delivered', 'email.delivered', NOW(), 'delivered', NULL);
  IF result_status <> 'processed' THEN RAISE EXCEPTION 'delivered provider event was not processed'; END IF;
  SELECT delivered_at INTO delivered_time FROM public.notification_jobs WHERE id = job_id;
  IF delivered_time IS NULL THEN RAISE EXCEPTION 'delivered timestamp was not retained'; END IF;

  SELECT processing_status INTO result_status
  FROM public.process_notification_provider_event('resend', 'local-event-delivered', 'local-message-delivered', 'email.delivered', NOW(), 'delivered', NULL);
  IF result_status <> 'already_processed' THEN RAISE EXCEPTION 'provider-event replay was not idempotent'; END IF;

  SELECT processing_status INTO result_status
  FROM public.process_notification_provider_event('resend', 'local-event-unmatched', 'local-message-unmatched', 'email.delivered', NOW(), 'delivered', NULL);
  IF result_status <> 'unmatched' THEN RAISE EXCEPTION 'unmatched provider event was not safely recorded'; END IF;

  PERFORM public.process_notification_provider_event('resend', 'local-event-complaint', 'local-message-delivered', 'email.complained', NOW() + INTERVAL '1 second', 'complained', 'complaint');
  IF NOT EXISTS (SELECT 1 FROM public.email_suppressions WHERE subscriber_id = en_subscriber AND reason = 'complaint' AND released_at IS NULL) THEN
    RAISE EXCEPTION 'complaint did not create active suppression';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notification_jobs WHERE id = job_id AND delivery_status = 'complained' AND delivered_at = delivered_time) THEN
    RAISE EXCEPTION 'out-of-order-safe delivery outcome did not preserve delivered_at';
  END IF;
  PERFORM public.process_notification_provider_event('resend', 'local-event-old-delayed', 'local-message-delivered', 'email.delivery_delayed', delivered_time - INTERVAL '1 second', 'delayed', NULL);
  IF NOT EXISTS (SELECT 1 FROM public.notification_jobs WHERE id = job_id AND delivery_status = 'complained' AND delivered_at = delivered_time) THEN
    RAISE EXCEPTION 'older provider event overwrote newer delivery state';
  END IF;

  INSERT INTO public.notification_campaigns (
    campaign_type, source_type, source_id, locale, channel, subject, headline, target_url, source_published_at
  ) VALUES (
    'blog_publication', 'blog', 'local-rehearsal-en-no-recipients', 'en', 'email', 'No recipients', 'No recipients',
    'https://example.invalid/no-recipients', NOW()
  ) RETURNING id INTO no_recipient_campaign_id;
  SELECT status, recipient_count INTO result_status, result_count FROM public.queue_notification_campaign(no_recipient_campaign_id, NULL);
  IF result_status <> 'no_recipients' OR result_count <> 0
    OR NOT EXISTS (SELECT 1 FROM public.notification_campaigns WHERE id = no_recipient_campaign_id AND status = 'draft' AND queued_at IS NULL)
    OR EXISTS (SELECT 1 FROM public.notification_jobs WHERE campaign_id = no_recipient_campaign_id) THEN
    RAISE EXCEPTION 'no-recipient queue operation was not atomic';
  END IF;

  UPDATE public.email_suppressions SET released_at = NOW() WHERE id = en_suppression;
  INSERT INTO public.notification_campaigns (
    campaign_type, source_type, source_id, locale, channel, subject, headline, target_url, source_published_at
  ) VALUES (
    'blog_publication', 'blog', 'local-rehearsal-en-bounce', 'en', 'email', 'Bounce rehearsal', 'Bounce rehearsal',
    'https://example.invalid/bounce', NOW()
  ) RETURNING id INTO bounce_campaign_id;
  IF public.count_notification_campaign_recipients(bounce_campaign_id) <> 1 THEN
    RAISE EXCEPTION 'released suppression did not restore otherwise eligible recipient';
  END IF;
  SELECT status, recipient_count INTO result_status, result_count FROM public.queue_notification_campaign(bounce_campaign_id, NULL);
  IF result_status <> 'queued' OR result_count <> 1 THEN RAISE EXCEPTION 'bounce rehearsal queue failed'; END IF;
  SELECT id INTO job_id FROM public.claim_notification_jobs(25) WHERE campaign_id = bounce_campaign_id;
  IF NOT public.record_notification_job_outcome(job_id, 'sent', 1, 'local-message-bounce', NULL, NULL) THEN
    RAISE EXCEPTION 'bounce rehearsal send outcome failed';
  END IF;
  PERFORM public.process_notification_provider_event('resend', 'local-event-bounce', 'local-message-bounce', 'email.bounced', NOW(), 'bounced', 'bounce');
  IF NOT EXISTS (SELECT 1 FROM public.email_suppressions WHERE subscriber_id = suppressed_en_subscriber AND reason = 'bounce' AND released_at IS NULL) THEN
    RAISE EXCEPTION 'permanent bounce did not create active suppression';
  END IF;

  INSERT INTO public.notification_campaigns (
    campaign_type, source_type, source_id, locale, channel, subject, headline, target_url, source_published_at
  ) VALUES (
    'blog_publication', 'blog', 'local-rehearsal-ta-retry', 'ta', 'email', 'Retry rehearsal', 'Retry rehearsal',
    'https://example.invalid/retry', NOW()
  ) RETURNING id INTO retry_campaign_id;
  SELECT status, recipient_count INTO result_status, result_count FROM public.queue_notification_campaign(retry_campaign_id, NULL);
  IF result_status <> 'queued' OR result_count <> 1 THEN RAISE EXCEPTION 'retry rehearsal queue failed'; END IF;
  SELECT claim.id INTO job_id FROM public.claim_notification_jobs(25) AS claim WHERE claim.campaign_id = retry_campaign_id;
  IF NOT public.record_notification_job_outcome(job_id, 'retry', 1, NULL, 'local_retry', NOW()) THEN
    RAISE EXCEPTION 'retry outcome was not recorded';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notification_jobs WHERE id = job_id AND status = 'retry' AND next_attempt_at IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.notification_campaigns WHERE id = retry_campaign_id AND failed_count <> 0) THEN
    RAISE EXCEPTION 'retry outcome changed terminal counters incorrectly';
  END IF;
  SELECT claim.id INTO job_id FROM public.claim_notification_jobs(25) AS claim WHERE claim.campaign_id = retry_campaign_id;
  IF NOT public.record_notification_job_outcome(job_id, 'failed', 2, NULL, 'local_failed', NULL) THEN
    RAISE EXCEPTION 'failed outcome was not recorded';
  END IF;
  IF public.record_notification_job_outcome(job_id, 'failed', 2, NULL, 'local_failed', NULL)
    OR NOT EXISTS (SELECT 1 FROM public.notification_campaigns WHERE id = retry_campaign_id AND status = 'failed' AND failed_count = 1) THEN
    RAISE EXCEPTION 'failed outcome was not idempotent or counters were incorrect';
  END IF;

  INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
  VALUES ('test-unsubscribe-after-queue@example.invalid', 'en', 'subscribed', 'blog_listing')
  RETURNING id INTO unsubscribed_after_queue_subscriber;
  INSERT INTO public.notification_campaigns (
    campaign_type, source_type, source_id, locale, channel, subject, headline, target_url, source_published_at
  ) VALUES (
    'blog_publication', 'blog', 'local-rehearsal-unsubscribe-after-queue', 'en', 'email', 'Unsubscribe rehearsal', 'Unsubscribe rehearsal',
    'https://example.invalid/unsubscribe', NOW()
  ) RETURNING id INTO unsubscribe_campaign_id;
  SELECT status, recipient_count INTO result_status, result_count FROM public.queue_notification_campaign(unsubscribe_campaign_id, NULL);
  IF result_status <> 'queued' OR result_count <> 1 THEN RAISE EXCEPTION 'unsubscribe-after-queue rehearsal queue failed'; END IF;
  UPDATE public.email_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE id = unsubscribed_after_queue_subscriber;
  SELECT claim.id INTO job_id FROM public.claim_notification_jobs(25) AS claim WHERE claim.campaign_id = unsubscribe_campaign_id;
  outcome_recorded := public.record_notification_job_outcome(job_id, 'skipped', 0, NULL, 'subscriber_unsubscribed', NULL);
  SELECT status, skipped_count INTO result_status, result_count
  FROM public.notification_campaigns WHERE id = unsubscribe_campaign_id;
  IF NOT outcome_recorded OR result_status <> 'completed' OR result_count <> 1 THEN
    RAISE EXCEPTION 'unsubscribe-after-queue skip outcome was incorrect (recorded %, status %, skipped %)', outcome_recorded, result_status, result_count;
  END IF;

  INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
  VALUES ('test-suppression-after-queue@example.invalid', 'en', 'subscribed', 'blog_listing')
  RETURNING id INTO suppressed_after_queue_subscriber;
  INSERT INTO public.notification_campaigns (
    campaign_type, source_type, source_id, locale, channel, subject, headline, target_url, source_published_at
  ) VALUES (
    'blog_publication', 'blog', 'local-rehearsal-suppression-after-queue', 'en', 'email', 'Suppression rehearsal', 'Suppression rehearsal',
    'https://example.invalid/suppression', NOW()
  ) RETURNING id INTO suppression_after_queue_campaign_id;
  SELECT status, recipient_count INTO result_status, result_count FROM public.queue_notification_campaign(suppression_after_queue_campaign_id, NULL);
  IF result_status <> 'queued' OR result_count <> 1 THEN RAISE EXCEPTION 'suppression-after-queue rehearsal queue failed'; END IF;
  INSERT INTO public.email_suppressions (subscriber_id, reason, source) VALUES (suppressed_after_queue_subscriber, 'manual_admin', 'admin');
  SELECT claim.id INTO job_id FROM public.claim_notification_jobs(25) AS claim WHERE claim.campaign_id = suppression_after_queue_campaign_id;
  outcome_recorded := public.record_notification_job_outcome(job_id, 'skipped', 0, NULL, 'subscriber_suppressed', NULL);
  SELECT status, skipped_count INTO result_status, result_count
  FROM public.notification_campaigns WHERE id = suppression_after_queue_campaign_id;
  IF NOT outcome_recorded OR result_status <> 'completed' OR result_count <> 1 THEN
    RAISE EXCEPTION 'suppression-after-queue skip outcome was incorrect (recorded %, status %, skipped %)', outcome_recorded, result_status, result_count;
  END IF;

  INSERT INTO public.email_subscribers (email, preferred_locale, status, consent_source)
  VALUES ('test-provider-suppression@example.invalid', 'en', 'subscribed', 'blog_listing')
  RETURNING id INTO provider_suppression_subscriber;
  INSERT INTO public.notification_campaigns (
    campaign_type, source_type, source_id, locale, channel, subject, headline, target_url, source_published_at
  ) VALUES (
    'blog_publication', 'blog', 'local-rehearsal-provider-suppression', 'en', 'email', 'Provider suppression rehearsal', 'Provider suppression rehearsal',
    'https://example.invalid/provider-suppression', NOW()
  ) RETURNING id INTO provider_suppression_campaign_id;
  SELECT status, recipient_count INTO result_status, result_count FROM public.queue_notification_campaign(provider_suppression_campaign_id, NULL);
  IF result_status <> 'queued' OR result_count <> 1 THEN RAISE EXCEPTION 'provider-suppression rehearsal queue failed'; END IF;
  SELECT claim.id INTO job_id FROM public.claim_notification_jobs(25) AS claim WHERE claim.campaign_id = provider_suppression_campaign_id;
  IF NOT public.record_notification_job_outcome(job_id, 'sent', 1, 'local-message-provider-suppression', NULL, NULL) THEN
    RAISE EXCEPTION 'provider-suppression send outcome failed';
  END IF;
  PERFORM public.process_notification_provider_event('resend', 'local-event-provider-suppression', 'local-message-provider-suppression', 'email.suppressed', NOW(), 'suppressed', 'provider_suppression');
  IF NOT EXISTS (SELECT 1 FROM public.email_suppressions WHERE subscriber_id = provider_suppression_subscriber AND reason = 'provider_suppression' AND released_at IS NULL) THEN
    RAISE EXCEPTION 'provider suppression did not create active suppression';
  END IF;
END;
$$;

ROLLBACK;
