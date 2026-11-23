-- Align the visible H1 and SEO title for the existing bilingual CMS article.
-- The slug and all other article metadata/content remain unchanged.
BEGIN;

UPDATE public.blog_post_translations AS translation
SET
  title = CASE translation.locale
    WHEN 'en' THEN 'Thirukadaiyur 60th Marriage Cost and Planning Guide'
    WHEN 'ta' THEN 'திருக்கடையூர் 60வது திருமண செலவு மற்றும் திட்டமிடல் வழிகாட்டி'
  END,
  seo_title = CASE translation.locale
    WHEN 'en' THEN 'Thirukadaiyur 60th Marriage Cost & Planning Guide'
    WHEN 'ta' THEN 'திருக்கடையூர் 60வது திருமண செலவு & திட்டமிடல் வழிகாட்டி'
  END,
  updated_at = now()
FROM public.blog_posts AS post
WHERE translation.post_id = post.id
  AND post.slug = 'thirukadaiyur-60th-marriage-ceremony-arrangements-guide'
  AND translation.locale IN ('en', 'ta');

COMMIT;
