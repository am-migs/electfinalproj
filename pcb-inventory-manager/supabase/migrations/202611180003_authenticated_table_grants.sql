-- Grant the authenticated Supabase role the SQL privileges required by the app.
-- Row Level Security remains enabled and continues to enforce organization access.
-- These grants allow PostgREST to reach the tables; they do not bypass RLS.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.components,
  public.suppliers,
  public.projects,
  public.bom_items,
  public.stock_movements,
  public.purchase_orders,
  public.purchase_order_items,
  public.activity_logs
to authenticated;

-- Required for identity/serial-backed columns such as activity_logs.id.
grant usage, select on all sequences in schema public to authenticated;
