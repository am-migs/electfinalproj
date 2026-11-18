-- PCB Component BOM & Inventory Manager
-- Initial Supabase schema: multi-tenant foundation.
-- Apply with: supabase db push (after linking your Supabase project)
-- All timestamps are stored as timestamptz; prices use numeric, not floating point.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mpn text not null,
  name text not null,
  manufacturer text not null default '',
  category text not null default 'Other',
  package_type text not null default 'Other',
  footprint text not null default '',
  storage_location text not null default '',
  unit_price numeric(14,4) not null default 0 check (unit_price >= 0),
  currency char(3) not null default 'PHP',
  stock integer not null default 0 check (stock >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  datasheet_url text,
  lcsc_part_number text,
  jlcpcb_part_number text,
  attributes jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, mpn),
  unique (id, organization_id)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  website_url text,
  contact_name text,
  email text,
  phone text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','active','on_hold','completed','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table if not exists public.bom_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  component_id uuid not null,
  quantity integer not null check (quantity > 0),
  designators text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade,
  foreign key (component_id, organization_id) references public.components(id, organization_id) on delete restrict,
  unique (project_id, component_id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  component_id uuid not null,
  movement_type text not null check (movement_type in ('initial_stock','stock_in','stock_out','adjustment','reservation','release','consumption')),
  quantity integer not null check (quantity > 0),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  reference_type text,
  reference_id uuid,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (component_id, organization_id) references public.components(id, organization_id) on delete restrict
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft','submitted','partially_received','received','cancelled')),
  currency char(3) not null default 'PHP',
  ordered_at timestamptz,
  expected_at timestamptz,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete restrict,
  unique (organization_id, order_number),
  unique (id, organization_id)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  purchase_order_id uuid not null,
  component_id uuid not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0 and quantity_received <= quantity_ordered),
  unit_price numeric(14,4) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now(),
  foreign key (purchase_order_id, organization_id) references public.purchase_orders(id, organization_id) on delete cascade,
  foreign key (component_id, organization_id) references public.components(id, organization_id) on delete restrict
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists components_org_category_idx on public.components(organization_id, category);
create index if not exists components_org_location_idx on public.components(organization_id, storage_location);
create index if not exists projects_org_status_idx on public.projects(organization_id, status);
create index if not exists bom_items_project_idx on public.bom_items(project_id);
create index if not exists stock_movements_component_date_idx on public.stock_movements(component_id, created_at desc);
create index if not exists purchase_orders_org_status_idx on public.purchase_orders(organization_id, status);
create index if not exists activity_logs_org_date_idx on public.activity_logs(organization_id, created_at desc);

create or replace function public.is_organization_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_organization_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','organizations','components','suppliers','projects','bom_items','purchase_orders'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Create a personal organization for each newly registered user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare new_org_id uuid;
declare display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Administrator');
  insert into public.profiles (id, full_name, email)
  values (new.id, display_name, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.organizations (name, created_by)
  values (display_name || '''s Workspace', new.id)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.components enable row level security;
alter table public.suppliers enable row level security;
alter table public.projects enable row level security;
alter table public.bom_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.activity_logs enable row level security;

create policy "Users can read their own profile" on public.profiles for select using (id = auth.uid());
create policy "Users can update their own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can view their organizations" on public.organizations for select using (public.is_organization_member(id));
create policy "Owners and admins can update organizations" on public.organizations for update using (public.has_organization_role(id, array['owner','admin'])) with check (public.has_organization_role(id, array['owner','admin']));

create policy "Members can view organization membership" on public.organization_members for select using (public.is_organization_member(organization_id));
create policy "Owners and admins can manage membership" on public.organization_members for all using (public.has_organization_role(organization_id, array['owner','admin'])) with check (public.has_organization_role(organization_id, array['owner','admin']));

create policy "Members can view components" on public.components for select using (public.is_organization_member(organization_id));
create policy "Editors can manage components" on public.components for all using (public.has_organization_role(organization_id, array['owner','admin','editor'])) with check (public.has_organization_role(organization_id, array['owner','admin','editor']));

create policy "Members can view suppliers" on public.suppliers for select using (public.is_organization_member(organization_id));
create policy "Editors can manage suppliers" on public.suppliers for all using (public.has_organization_role(organization_id, array['owner','admin','editor'])) with check (public.has_organization_role(organization_id, array['owner','admin','editor']));

create policy "Members can view projects" on public.projects for select using (public.is_organization_member(organization_id));
create policy "Editors can manage projects" on public.projects for all using (public.has_organization_role(organization_id, array['owner','admin','editor'])) with check (public.has_organization_role(organization_id, array['owner','admin','editor']));

create policy "Members can view BOM items" on public.bom_items for select using (public.is_organization_member(organization_id));
create policy "Editors can manage BOM items" on public.bom_items for all using (public.has_organization_role(organization_id, array['owner','admin','editor'])) with check (public.has_organization_role(organization_id, array['owner','admin','editor']));

create policy "Members can view stock movements" on public.stock_movements for select using (public.is_organization_member(organization_id));
create policy "Editors can record stock movements" on public.stock_movements for insert with check (public.has_organization_role(organization_id, array['owner','admin','editor']));

create policy "Members can view purchase orders" on public.purchase_orders for select using (public.is_organization_member(organization_id));
create policy "Editors can manage purchase orders" on public.purchase_orders for all using (public.has_organization_role(organization_id, array['owner','admin','editor'])) with check (public.has_organization_role(organization_id, array['owner','admin','editor']));

create policy "Members can view purchase order items" on public.purchase_order_items for select using (public.is_organization_member(organization_id));
create policy "Editors can manage purchase order items" on public.purchase_order_items for all using (public.has_organization_role(organization_id, array['owner','admin','editor'])) with check (public.has_organization_role(organization_id, array['owner','admin','editor']));

create policy "Admins can view activity logs" on public.activity_logs for select using (public.has_organization_role(organization_id, array['owner','admin']));
create policy "Members can create activity logs" on public.activity_logs for insert with check (public.is_organization_member(organization_id) and actor_id = auth.uid());
