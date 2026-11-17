-- Compatibility migration for installations that applied the initial
-- quotation schema with quotations.lead_id before lead mapping was introduced.
create table if not exists public.quotation_leads (
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quotation_id, lead_id)
);

create index if not exists quotation_leads_lead_id_idx on public.quotation_leads(lead_id, created_at desc);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotations' and column_name = 'lead_id'
  ) then
    insert into public.quotation_leads (quotation_id, lead_id)
    select id, lead_id from public.quotations where lead_id is not null
    on conflict (quotation_id, lead_id) do nothing;

    alter table public.quotations drop column lead_id;
  end if;
end $$;

alter table public.quotation_leads enable row level security;
revoke all on public.quotation_leads from anon, authenticated;
grant select, insert, update, delete on public.quotation_leads to service_role;
