-- Persist per-user display preferences used by the PCB Manager UI.
-- Safe to apply to existing projects; existing profiles receive the defaults.
alter table public.profiles
  add column if not exists preferences jsonb not null
  default '{"currency":"PHP","lowStockAlerts":true}'::jsonb;
