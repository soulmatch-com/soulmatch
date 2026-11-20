-- A celebration event may contain at most five gallery photographs.
alter table public.celebration_gallery_items add column if not exists event_name text;
update public.celebration_gallery_items set event_name = category where event_name is null;
alter table public.celebration_gallery_items alter column event_name set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'celebration_gallery_items_event_name_length' and conrelid = 'public.celebration_gallery_items'::regclass) then
    alter table public.celebration_gallery_items add constraint celebration_gallery_items_event_name_length check (char_length(event_name) between 1 and 120);
  end if;
end;
$$;
create index if not exists celebration_gallery_items_event_name_idx on public.celebration_gallery_items (event_name);
create or replace function public.enforce_celebration_gallery_event_photo_limit()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.event_name));
  if (select count(*) from public.celebration_gallery_items where event_name = new.event_name and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 5 then
    raise exception 'A gallery event can contain at most five photographs.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists celebration_gallery_event_photo_limit on public.celebration_gallery_items;
create trigger celebration_gallery_event_photo_limit before insert or update of event_name on public.celebration_gallery_items for each row execute function public.enforce_celebration_gallery_event_photo_limit();
