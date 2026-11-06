-- Get Set Connect — production schema for Supabase (PostgreSQL)
--
-- The proof of concept runs on a built-in demo store (src/lib/db). This file
-- is the equivalent relational schema, with row-level security, so the app can
-- move to Supabase without changing the customer experience. Table and column
-- names mirror src/lib/db/types.ts.
--
-- Security model
--   * Every customer belongs to one organisation (a homeowner is an
--     organisation of one; a developer company has several members).
--   * Customers can only read rows for projects owned by their organisation.
--   * Internal-only rows (notes, activity, tasks) are never visible to customers.
--   * Staff ("admin" role) can read and write everything.
--   * Documents live in a private storage bucket, with the same rules.

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum ('customer', 'admin');
create type utility as enum ('electricity', 'gas');
create type project_type as enum ('new_home', 'multiple_homes', 'conversion', 'existing_property');
create type project_status as enum ('submitted', 'in_progress', 'awaiting_customer', 'completed', 'withdrawn');
create type starting_point as enum ('scratch', 'applied', 'quoted', 'works_underway', 'ready_for_meters', 'not_sure');
create type milestone_key as enum ('received', 'network_application', 'works_arranged', 'works_completed', 'meter_arranged', 'connected');
create type milestone_state as enum ('not_started', 'in_progress', 'complete');
create type responsibility as enum ('us', 'network', 'supplier', 'customer', 'completed');
create type quotation_status as enum ('awaiting', 'received', 'accepted', 'paid', 'expired', 'declined');
create type operator_kind as enum ('DNO', 'GDN', 'IDNO', 'IGT');
create type appointment_kind as enum ('meter_installation', 'network_works');
create type appointment_status as enum ('booked', 'completed', 'cancelled');
create type document_category as enum ('site_plan', 'location_plan', 'meter_position', 'cut_out', 'gas_ecv', 'meter_cabinet', 'other');
create type document_status as enum ('received', 'accepted', 'needs_replacement');
create type audience as enum ('customer', 'internal');
create type task_status as enum ('open', 'done');
create type notification_type as enum ('application_received', 'info_required', 'quotation_received', 'date_confirmed', 'supplier_selected', 'installation_booked', 'connection_completed', 'update');

-- ── Organisations & users ──────────────────────────────────────────────────
create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('individual', 'developer')),
  created_at timestamptz not null default now()
);

-- One row per auth user (auth.users holds credentials).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  phone text,
  role user_role not null default 'customer',
  organisation_id uuid references organisations (id),
  created_at timestamptz not null default now()
);

-- ── Reference data ─────────────────────────────────────────────────────────
create table network_operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind operator_kind not null,
  area text not null
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fuels utility[] not null,
  capabilities text[] not null default '{}',
  eligibility_notes text not null default '',
  lead_time_days int check (lead_time_days >= 0),
  lead_time_verified boolean not null default false,
  referral_arrangement text,          -- recorded for transparency; never used for ranking
  accepting_referrals boolean not null default true,
  is_demo boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── Projects, plots and connections ────────────────────────────────────────
create sequence project_reference_seq start 1000;

create table projects (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('GSC-' || nextval('project_reference_seq')),
  organisation_id uuid not null references organisations (id),
  created_by uuid not null references profiles (id),
  name text not null,
  project_type project_type not null,
  address_line text,
  town text,
  postcode text not null,
  site_description text,
  site_contact jsonb,                  -- {name, phone, email}
  utilities utility[] not null,
  interested_in text[] not null default '{}',
  starting_point jsonb not null default '{}',
  existing_references jsonb not null default '{}',
  requirements jsonb not null default '{}',
  status project_status not null default 'submitted',
  case_owner_id uuid references profiles (id),
  supplier_id uuid references suppliers (id),
  consent_name text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on projects (organisation_id);
create index on projects (status);

create table project_network_operators (
  project_id uuid references projects (id) on delete cascade,
  utility utility not null,
  network_operator_id uuid not null references network_operators (id),
  primary key (project_id, utility)
);

create table plots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  number int not null,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  unique (project_id, number)
);

create table connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  plot_id uuid not null references plots (id) on delete cascade,
  utility utility not null,
  network_operator_id uuid references network_operators (id),
  network_reference text,
  meter_point_number text,             -- MPAN or MPRN
  supplier_id uuid references suppliers (id),
  updated_at timestamptz not null default now(),
  unique (plot_id, utility)
);
create index on connections (project_id);

create table quotations (
  connection_id uuid primary key references connections (id) on delete cascade,
  amount_pence int check (amount_pence >= 0),
  status quotation_status not null default 'awaiting',
  received_at timestamptz,
  valid_until timestamptz,
  notes text
);

create table milestones (
  connection_id uuid references connections (id) on delete cascade,
  key milestone_key not null,
  state milestone_state not null default 'not_started',
  responsible responsibility not null default 'us',
  confirmed_date date,                 -- confirmed dates only — never estimates
  note text,
  updated_at timestamptz not null default now(),
  primary key (connection_id, key)
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  connection_id uuid not null references connections (id) on delete cascade,
  kind appointment_kind not null,
  date date not null,
  slot text check (slot in ('am', 'pm', 'all_day')),
  status appointment_status not null default 'booked',
  notes text,
  created_at timestamptz not null default now()
);

-- ── Documents, tasks, communications, history ──────────────────────────────
create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  plot_id uuid references plots (id) on delete set null,
  category document_category not null,
  filename text not null,
  mime_type text not null,
  size_bytes int not null,
  storage_path text not null,          -- path in the private 'documents' bucket
  uploaded_by uuid not null references profiles (id),
  status document_status not null default 'received',
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  plot_ids uuid[],
  audience audience not null,
  title text not null,
  detail text,
  document_category document_category,
  assignee_id uuid references profiles (id),
  due_date date,
  status task_status not null default 'open',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index on tasks (status, audience);

create table notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  visibility audience not null,
  body text not null,
  author_id uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  plot_id uuid references plots (id) on delete set null,
  utility utility,
  visibility audience not null,
  message text not null,
  actor_id uuid references profiles (id),
  created_at timestamptz not null default now()
);
create index on activity (project_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read);

create table history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  actor_id uuid not null references profiles (id),
  summary text not null,
  before text,
  after text,
  created_at timestamptz not null default now()
);

create table application_drafts (
  user_id uuid primary key references profiles (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Helper functions for policies ──────────────────────────────────────────
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function my_organisation() returns uuid
language sql stable security definer set search_path = public as $$
  select organisation_id from profiles where id = auth.uid();
$$;

create or replace function can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from projects where id = p and organisation_id = my_organisation()
  );
$$;

-- ── Row-level security ─────────────────────────────────────────────────────
alter table organisations enable row level security;
alter table profiles enable row level security;
alter table network_operators enable row level security;
alter table suppliers enable row level security;
alter table projects enable row level security;
alter table project_network_operators enable row level security;
alter table plots enable row level security;
alter table connections enable row level security;
alter table quotations enable row level security;
alter table milestones enable row level security;
alter table appointments enable row level security;
alter table documents enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table activity enable row level security;
alter table notifications enable row level security;
alter table history enable row level security;
alter table application_drafts enable row level security;

-- Staff can do everything.
do $$
declare t text;
begin
  foreach t in array array['organisations','profiles','network_operators','suppliers','projects',
    'project_network_operators','plots','connections','quotations','milestones','appointments',
    'documents','tasks','notes','activity','notifications','history','application_drafts']
  loop
    execute format('create policy "staff full access" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Customers: their own profile and organisation.
create policy "own profile" on profiles for select using (id = auth.uid());
create policy "update own profile" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'customer');
create policy "own organisation" on organisations for select using (id = my_organisation());

-- Reference data is readable by any signed-in user (supplier referral details are staff-only via a view).
create policy "read operators" on network_operators for select using (auth.uid() is not null);

-- Customers: projects and everything hanging off them.
create policy "read own projects" on projects for select using (organisation_id = my_organisation());
create policy "create own projects" on projects for insert with check (organisation_id = my_organisation() and created_by = auth.uid());
create policy "read own project networks" on project_network_operators for select using (can_see_project(project_id));
create policy "read own plots" on plots for select using (can_see_project(project_id));
create policy "add own plots" on plots for insert with check (can_see_project(project_id));
create policy "read own connections" on connections for select using (can_see_project(project_id));
create policy "read own quotations" on quotations for select using (
  exists (select 1 from connections c where c.id = connection_id and can_see_project(c.project_id)));
create policy "read own milestones" on milestones for select using (
  exists (select 1 from connections c where c.id = connection_id and can_see_project(c.project_id)));
create policy "read own appointments" on appointments for select using (can_see_project(project_id));
create policy "read own documents" on documents for select using (can_see_project(project_id));
create policy "upload own documents" on documents for insert with check (can_see_project(project_id) and uploaded_by = auth.uid());
create policy "remove own documents" on documents for delete using (can_see_project(project_id) and uploaded_by = auth.uid());

-- Customers never see internal-only rows.
create policy "read customer tasks" on tasks for select using (audience = 'customer' and can_see_project(project_id));
create policy "read customer notes" on notes for select using (visibility = 'customer' and can_see_project(project_id));
create policy "read customer activity" on activity for select using (visibility = 'customer' and can_see_project(project_id));

create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "mark own notifications" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own drafts" on application_drafts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Suppliers: customers may see names only, through this view.
create view supplier_names with (security_invoker = false) as
  select id, name, fuels from suppliers;
grant select on supplier_names to authenticated;

-- ── Private document storage ───────────────────────────────────────────────
-- Files are stored as documents/<project_id>/<uuid>-<filename>
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

create policy "read project files" on storage.objects for select using (
  bucket_id = 'documents' and can_see_project(((storage.foldername(name))[1])::uuid));
create policy "upload project files" on storage.objects for insert with check (
  bucket_id = 'documents' and can_see_project(((storage.foldername(name))[1])::uuid));
create policy "delete own project files" on storage.objects for delete using (
  bucket_id = 'documents' and owner = auth.uid() and can_see_project(((storage.foldername(name))[1])::uuid));
