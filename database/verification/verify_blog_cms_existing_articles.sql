-- READ-ONLY verification for the generated legacy blog CMS import. Do not modify data.
WITH expected_posts(slug) AS (VALUES ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage'), ('60th-marriage-thirukadaiyur'), ('sashtiapthapoorthi-in-thirukadaiyur')),
expected_translations(slug, locale) AS (VALUES
  ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', 'en'),
  ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', 'ta'),
  ('60th-marriage-thirukadaiyur', 'en'),
  ('60th-marriage-thirukadaiyur', 'ta'),
  ('sashtiapthapoorthi-in-thirukadaiyur', 'en'),
  ('sashtiapthapoorthi-in-thirukadaiyur', 'ta')
)
SELECT
  (SELECT count(*) FROM public.blog_posts WHERE slug IN ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', '60th-marriage-thirukadaiyur', 'sashtiapthapoorthi-in-thirukadaiyur')) AS imported_post_count,
  (SELECT count(*) FROM public.blog_post_translations t JOIN public.blog_posts p ON p.id = t.post_id WHERE p.slug IN ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', '60th-marriage-thirukadaiyur', 'sashtiapthapoorthi-in-thirukadaiyur')) AS imported_translation_count,
  (SELECT count(*) FROM expected_posts e LEFT JOIN public.blog_posts p ON p.slug = e.slug WHERE p.id IS NULL) AS missing_post_count,
  (SELECT count(*) FROM expected_translations e LEFT JOIN public.blog_posts p ON p.slug = e.slug LEFT JOIN public.blog_post_translations t ON t.post_id = p.id AND t.locale = e.locale WHERE t.id IS NULL) AS missing_translation_count,
  (SELECT count(*) FROM public.blog_posts WHERE slug IN ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', '60th-marriage-thirukadaiyur', 'sashtiapthapoorthi-in-thirukadaiyur') AND (status <> 'published' OR published_at IS NULL)) AS invalid_post_publication_count,
  (SELECT count(*) FROM public.blog_post_translations t JOIN public.blog_posts p ON p.id = t.post_id WHERE p.slug IN ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', '60th-marriage-thirukadaiyur', 'sashtiapthapoorthi-in-thirukadaiyur') AND (t.status <> 'published' OR t.published_at IS NULL)) AS invalid_translation_publication_count;

SELECT slug, count(*) AS duplicate_post_count
FROM public.blog_posts WHERE slug IN ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', '60th-marriage-thirukadaiyur', 'sashtiapthapoorthi-in-thirukadaiyur') GROUP BY slug HAVING count(*) > 1;

SELECT p.slug, t.locale, count(*) AS duplicate_translation_count
FROM public.blog_post_translations t JOIN public.blog_posts p ON p.id = t.post_id
WHERE p.slug IN ('1-session-vs-2-sessions-thirukadaiyur-60th-marriage', '60th-marriage-thirukadaiyur', 'sashtiapthapoorthi-in-thirukadaiyur') GROUP BY p.slug, t.locale HAVING count(*) > 1;
