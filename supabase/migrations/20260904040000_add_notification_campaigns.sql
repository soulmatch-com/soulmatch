-- Notification campaign foundation. Not applied by Codex.
-- Source references are deliberately external-domain values, not relational joins.

CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  locale TEXT NULL,
  channel TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT NULL,
  headline TEXT NOT NULL,
  summary TEXT NULL,
  target_url TEXT NOT NULL,
  source_published_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  queued_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT notification_campaigns_type_check CHECK (campaign_type IN ('blog_publication')),
  CONSTRAINT notification_campaigns_source_check CHECK (source_type IN ('blog')),
  CONSTRAINT notification_campaigns_locale_check CHECK (locale IS NULL OR locale IN ('en', 'ta')),
  CONSTRAINT notification_campaigns_channel_check CHECK (channel IN ('email')),
  CONSTRAINT notification_campaigns_status_check CHECK (status IN ('draft', 'queued', 'processing', 'completed', 'partially_failed', 'failed', 'cancelled')),
  CONSTRAINT notification_campaigns_subject_check CHECK (char_length(btrim(subject)) BETWEEN 1 AND 250),
  CONSTRAINT notification_campaigns_headline_check CHECK (char_length(btrim(headline)) BETWEEN 1 AND 200),
  CONSTRAINT notification_campaigns_preheader_check CHECK (preheader IS NULL OR char_length(preheader) <= 160),
  CONSTRAINT notification_campaigns_summary_check CHECK (summary IS NULL OR char_length(summary) <= 500),
  CONSTRAINT notification_campaigns_target_url_check CHECK (char_length(target_url) BETWEEN 1 AND 2048),
  CONSTRAINT notification_campaigns_blog_publication_unique UNIQUE (campaign_type, source_type, source_id, locale, channel)
);

CREATE OR REPLACE FUNCTION public.set_notification_campaign_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_notification_campaigns_updated_at ON public.notification_campaigns;
CREATE TRIGGER update_notification_campaigns_updated_at
  BEFORE UPDATE ON public.notification_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_campaign_updated_at();

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_campaigns FROM PUBLIC, anon, authenticated;
