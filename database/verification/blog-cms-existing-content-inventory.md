# Existing blog CMS content inventory

Generated from `src/content/blog/articles.ts`; do not edit by hand.

- English translations: 3
- Tamil translations: 3
- Logical CMS posts: 3
- CMS translations: 6

| Slug | English | Tamil | First published | English title | Tamil title | Explicit SEO title | Featured image |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1-session-vs-2-sessions-thirukadaiyur-60th-marriage | Yes — published | Yes — published | 2026-09-18T00:00:00.000Z | 1 Session vs 2 Sessions for a Thirukadaiyur 60th Marriage – How Families Can Plan | திருக்கடையூரில் 60வது திருமணம் – 1 அமர்வு அல்லது 2 அமர்வுகள்: குடும்பங்கள் எப்படி திட்டமிடலாம்? | EN / TA | No |
| 60th-marriage-thirukadaiyur | Yes — published | Yes — published | 2026-09-11T00:00:00.000Z | 60th Marriage in Thirukadaiyur: A Complete Planning Guide | திருக்கடையூரில் 60ஆம் திருமணம்: முழுமையான திட்டமிடல் வழிகாட்டி | — / — | No |
| sashtiapthapoorthi-in-thirukadaiyur | Yes — published | Yes — published | 2026-09-18T00:00:00.000Z | Sashtiapthapoorthi in Thirukadaiyur – What Families Should Know | திருக்கடையூரில் சஷ்டியப்தபூர்த்தி – குடும்பங்கள் தெரிந்துகொள்ள வேண்டியவை | EN / TA | No |

## Mapping rules

- Articles are paired only by the existing `translationKey`, with matching slugs.
- All current source articles are published; each imported translation and parent post is `published`.
- `published_at` and `created_at` use the earliest source publication date for the paired post.
- `updated_at` uses explicit `updatedAt`, otherwise the source publication date.
- Source `description` is the existing runtime meta-description value. Missing `seoTitle` remains `NULL`, preserving the runtime title fallback.
- The legacy source has no featured image metadata and no author identity; image/admin fields remain `NULL`.
