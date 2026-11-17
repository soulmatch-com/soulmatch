-- Notification-domain subscriber foundation. Not applied by Codex.
-- This table is intentionally independent of Blog CMS and any email provider.

CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  preferred_locale TEXT NULL,
  status TEXT NOT NULL DEFAULT 'subscribed',
  consent_source TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_subscribers_email_normalized_check CHECK (email = lower(btrim(email))),
  CONSTRAINT email_subscribers_preferred_locale_check CHECK (preferred_locale IS NULL OR preferred_locale IN ('en', 'ta')),
  CONSTRAINT email_subscribers_status_check CHECK (status IN ('subscribed', 'unsubscribed')),
  CONSTRAINT email_subscribers_consent_source_check CHECK (consent_source IN ('blog_listing', 'blog_article'))
);

-- CITEXT is not required: this unique expression index protects against mixed-case
-- duplicates even if a future trusted writer fails to normalize before insertion.
CREATE UNIQUE INDEX IF NOT EXISTS email_subscribers_email_lower_unique
  ON public.email_subscribers (lower(email));

CREATE INDEX IF NOT EXISTS email_subscribers_status_idx
  ON public.email_subscribers (status);

CREATE OR REPLACE FUNCTION public.set_email_subscriber_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_email_subscribers_updated_at ON public.email_subscribers;
CREATE TRIGGER update_email_subscribers_updated_at
  BEFORE UPDATE ON public.email_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_email_subscriber_updated_at();

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

-- All subscription access is through trusted server-side credentials. These
-- revocations also guard against accidental future permissive policies.
REVOKE ALL ON TABLE public.email_subscribers FROM PUBLIC, anon, authenticated;
