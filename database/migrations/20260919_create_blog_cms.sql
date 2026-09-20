-- Dynamic bilingual blog CMS. Apply through the approved Supabase migration flow only.
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120),
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured_image_url text,
  featured_image_alt text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.blog_post_translations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  locale text not null check (locale in ('en', 'ta')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  title text not null check (char_length(title) between 1 and 150),
  excerpt text not null check (char_length(excerpt) between 1 and 500),
  content text not null,
  seo_title text check (char_length(seo_title) <= 160),
  meta_description text check (char_length(meta_description) <= 320),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, locale)
);

create index if not exists blog_posts_status_published_at_idx on public.blog_posts(status, published_at desc);
create index if not exists blog_post_translations_locale_status_published_at_idx on public.blog_post_translations(locale, status, published_at desc);

alter table public.blog_posts enable row level security;
alter table public.blog_post_translations enable row level security;
-- The application reads through trusted server code. There are deliberately no
-- public table policies: drafts must never be exposed through direct browser access.
revoke all on public.blog_posts, public.blog_post_translations from anon, authenticated;
grant select, insert, update, delete on public.blog_posts, public.blog_post_translations to service_role;
