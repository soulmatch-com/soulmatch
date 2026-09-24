# Notification production rollout

Status: code is ready for a controlled rollout only. Do not enable automatic delivery without explicit target approval.

## Environment boundary

The existing remote Supabase project is production. Local development and local migration rehearsal use the isolated Supabase CLI stack described in [local Supabase development](./local-supabase-development.md). Do not use production Supabase credentials locally except for a separately approved production operation.

## Architecture

Admin queues a campaign, which freezes eligible recipients into notification jobs. The worker sends only queued jobs after rechecking subscription, locale, active suppression, and a secure unsubscribe URL. Resend delivery events are verified and recorded separately from worker execution status.

## Environment checklist

- [ ] `RESEND_API_KEY` configured
- [ ] `RESEND_WEBHOOK_SECRET` configured
- [ ] `NOTIFICATION_EMAIL_FROM` configured with an approved sender
- [ ] `NOTIFICATION_PUBLIC_BASE_URL` configured as `https://mythirumanam.in`
- [ ] `NOTIFICATION_UNSUBSCRIBE_SECRET` configured
- [ ] `NOTIFICATION_WORKER_SECRET` configured
- [ ] `CRON_SECRET` configured
- [ ] `NOTIFICATION_SUBSCRIBER_RATE_LIMIT_SALT` configured
- [ ] Upstash REST URL and token configured
- [ ] `NOTIFICATION_SCHEDULER_ENABLED=false` remains set during initial rollout

## Database checklist

- [ ] Approved Supabase project and recovery position confirmed
- [ ] `add_email_subscribers.sql` applied
- [ ] `add_notification_campaigns.sql` applied
- [ ] `add_notification_jobs.sql` applied
- [ ] `add_notification_worker_functions.sql` applied
- [ ] `add_email_suppressions.sql` applied
- [ ] `add_notification_queue_audit.sql` applied
- [ ] `add_notification_provider_events.sql` applied
- [ ] `fix_notification_queue_campaign_ambiguity.sql` applied
- [ ] `fix_notification_worker_claim_ambiguity.sql` applied
- [ ] `fix_notification_worker_claim_id_ambiguity.sql` applied
- [ ] Each individual read-only verifier passed
- [ ] `verify_notification_system.sql` passed

## Resend checklist

- [ ] Sending domain verified and approved From address selected
- [ ] Webhook endpoint configured as `https://mythirumanam.in/api/webhooks/resend`
- [ ] Events selected: delivered, delivery delayed, bounced, complained, suppressed, failed
- [ ] Webhook signing secret configured as `RESEND_WEBHOOK_SECRET`
- [ ] No production scheduler activation yet

## Controlled end-to-end test

Use only explicitly approved test mailbox data in an approved environment. Do not queue a campaign capable of selecting normal subscribers.

- [ ] Test subscriber exists with expected locale and no active suppression
- [ ] Test campaign draft created and preview reviewed
- [ ] Recipient estimate is expected and campaign is queued
- [ ] Scheduler remains disabled
- [ ] Manually invoke the protected worker for the controlled job set
- [ ] Test email received and unsubscribe URL has the expected public origin
- [ ] GET unsubscribe link does not mutate; explicit POST confirmation does
- [ ] Resend delivered event correlates by provider message ID
- [ ] Admin provider delivery summary updates
- [ ] Replayed webhook is idempotent

## Scheduler activation

Only after the controlled test is approved, separately authorize setting `NOTIFICATION_SCHEDULER_ENABLED=true`. The scheduler endpoint is `GET /api/internal/notifications/scheduled-process`; it authenticates with `Authorization: Bearer <CRON_SECRET>`, processes bounded batches, honors suppression, and does not create duplicate sends.

Vercel Hobby supports only daily Vercel Cron schedules, so this repository intentionally does not register the near-real-time notification route with Vercel Cron. For production scheduling, either upgrade to a Vercel plan that supports the required cadence and restore a secured Vercel Cron entry, or keep Vercel Hobby and use an external scheduler to call the secured endpoint. Do not enable the scheduler until that trigger and the controlled test have been separately approved.

## Rollback

First response: set `NOTIFICATION_SCHEDULER_ENABLED=false`. This stops automatic worker execution without destructive schema rollback. If required, then disable the configured scheduler trigger, disable the Resend webhook, and rotate relevant provider or endpoint secrets. Preserve applied schema unless a specific migration defect requires a separately approved corrective migration.

## Post-rollout checks

- [ ] Worker and scheduler aggregates are healthy
- [ ] No duplicate sends or unexpected retries
- [ ] Suppression and unsubscribe checks are honored
- [ ] Provider events correlate and delivery summaries update
- [ ] No notification error spike or public access grants found
