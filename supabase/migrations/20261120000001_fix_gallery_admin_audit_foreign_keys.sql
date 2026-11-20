-- Gallery audit columns store IDs from the application's public.admins table,
-- not Supabase Auth users. The two identity stores use independent UUIDs.
alter table public.celebration_gallery_items
  drop constraint if exists celebration_gallery_items_created_by_fkey,
  drop constraint if exists celebration_gallery_items_updated_by_fkey;

alter table public.celebration_gallery_items
  add constraint celebration_gallery_items_created_by_fkey
    foreign key (created_by) references public.admins(id) on delete set null,
  add constraint celebration_gallery_items_updated_by_fkey
    foreign key (updated_by) references public.admins(id) on delete set null;
