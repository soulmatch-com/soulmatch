-- Record newsletter consent collected from the celebration planning enquiry.
ALTER TABLE public.email_subscribers
  DROP CONSTRAINT IF EXISTS email_subscribers_consent_source_check;

ALTER TABLE public.email_subscribers
  ADD CONSTRAINT email_subscribers_consent_source_check
  CHECK (consent_source IN ('blog_listing', 'blog_article', 'plan_enquiry'));
