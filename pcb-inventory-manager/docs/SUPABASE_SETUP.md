# Supabase setup — PCB Manager

This project is being upgraded from browser-only LocalStorage to a shared, multi-user Supabase backend.

## Current state

- The React/Vite frontend still uses LocalStorage.
- The initial PostgreSQL schema is in `supabase/migrations/202611180001_initial_schema.sql`.
- The schema is designed for organization-scoped data and enables Row Level Security (RLS).
- The application is **not connected to Supabase yet**. Do not expect cloud synchronization until the client integration and data migration phases are completed.

## 1. Create the Supabase project

1. Open https://supabase.com/ and sign in.
2. Create a new project for PCB Component BOM & Inventory Manager.
3. Choose a strong database password and save it somewhere secure.
4. Select a region close to the intended users, such as Singapore if available.
5. Wait for the database to finish provisioning.

## 2. Apply the database migration

Recommended CLI workflow:

```bash
cd pcb-inventory-manager
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The project reference is available in the Supabase project URL/settings. Review the SQL migration before applying it to any production database.

You can also paste the migration into the Supabase SQL Editor for a first-time setup, but the CLI migration workflow is preferred for repeatable development.

## 3. Configure local environment variables

After the Supabase project is created, copy the Project URL and publishable/anon key from the project's API settings.

Create a local `.env.local` file in this folder:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Never put a Supabase service-role key in a Vite environment variable. Vite variables are exposed to browser users. The frontend must use only the publishable/anon key; database access is protected by RLS.

Do not commit `.env.local` or any real credentials.

## 4. Authentication settings

For local development, configure the Supabase Auth Site URL to your Vite development origin (usually `http://localhost:5173`). Add the production domain to the allowed redirect URLs before deployment.

Email confirmation and password-reset redirect URLs should be configured before enabling public registration.

## 5. Verify the schema

After applying the migration, verify these tables exist in the Supabase Table Editor:

- profiles
- organizations
- organization_members
- components
- suppliers
- projects
- bom_items
- stock_movements
- purchase_orders
- purchase_order_items
- activity_logs

RLS should be enabled on every application table. Test access using separate user accounts before importing real inventory.

## Security notes

- Never disable RLS to make the frontend work.
- Never expose the service-role key in the browser or GitHub.
- Organization membership determines which workspace records a signed-in user can access.
- Owner/admin/editor/viewer roles are represented in the schema. UI-level role restrictions must be paired with database RLS policies.
- The first registered user receives a personal workspace through the Auth trigger. Review this behavior if the deployment will use invitation-only registration.
