-- Admin-managed celebration gallery.
create table if not exists public.celebration_gallery_items (
  id uuid primary key default gen_random_uuid(), image_url text not null, cloudinary_public_id text not null,
  alt_text text not null check (char_length(alt_text) between 10 and 200), title text not null check (char_length(title) between 1 and 120),
  caption text not null default '' check (char_length(caption) <= 500), category text not null default 'Celebration',
  status text not null default 'draft' check (status in ('draft', 'published')), publication_consent_confirmed boolean not null default false,
  width integer not null check (width > 0), height integer not null check (height > 0), display_order integer not null default 0,
  created_by uuid references public.admins(id) on delete set null, updated_by uuid references public.admins(id) on delete set null, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists celebration_gallery_items_public_idx on public.celebration_gallery_items (status, publication_consent_confirmed, display_order, published_at desc);
alter table public.celebration_gallery_items enable row level security;
revoke all on public.celebration_gallery_items from anon, authenticated;
grant select, insert, update, delete on public.celebration_gallery_items to service_role;
