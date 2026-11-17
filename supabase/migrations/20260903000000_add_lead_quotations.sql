-- Lead quotations are private admin records. Each item captures the service
-- details and price at the time the quotation is issued.
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  currency text not null default 'INR' check (currency = 'INR'),
  valid_until date,
  notes text,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  celebration_service_id uuid not null references public.celebration_services(id) on delete restrict,
  service_code text not null,
  service_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.quotation_leads (
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quotation_id, lead_id)
);

create index if not exists quotation_leads_lead_id_idx on public.quotation_leads(lead_id, created_at desc);
create index if not exists quotation_items_quotation_id_idx on public.quotation_items(quotation_id);

drop trigger if exists update_quotations_updated_at on public.quotations;

create trigger update_quotations_updated_at
  before update on public.quotations
  for each row execute function public.update_updated_at_column();

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.quotation_leads enable row level security;
revoke all on public.quotations, public.quotation_items, public.quotation_leads from anon, authenticated;
grant select, insert, update, delete on public.quotations, public.quotation_items, public.quotation_leads to service_role;
