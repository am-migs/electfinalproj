# Supabase setup — PCB Manager

This project is being upgraded from browser-only LocalStorage to a shared, multi-user Supabase backend.

## Current state

- Supabase authentication is integrated (email/password registration, sign-in, sign-out, and password reset).
- The frontend loads organization-scoped inventory, projects, BOM lines, and stock history from Supabase.
- Inventory, project, BOM, stock movement, and profile changes synchronize to the relational tables.
- Existing LocalStorage data can be migrated from Settings when the cloud workspace is empty.
- LocalStorage is retained as a migration source and JSON backup is still available.

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
npx supabase init
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
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Never put a Supabase service-role key in a Vite environment variable. Vite variables are exposed to browser users. The frontend must use only the publishable/anon key; database access is protected by RLS.

Do not commit `.env.local` or any real credentials.

## 4. Authentication settings

For local development, configure the Supabase Auth Site URL to your Vite development origin (usually `http://localhost:5173`). Add the production domain to the allowed redirect URLs before deployment.

Email confirmation and password-reset redirect URLs should be configured before enabling public registration. Add both `http://localhost:5173/**` and your deployed Vercel origin (for example `https://your-project.vercel.app/**`) under Authentication → URL Configuration → Redirect URLs. Set the Site URL to the production domain.

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

RLS should be enabled on every application table. Test access using separate user accounts before importing real inventory. A new registration automatically creates a personal workspace and assigns the registrant the `owner` role.

## Security notes

- Never disable RLS to make the frontend work.
- Never expose the service-role key in the browser or GitHub.
- Organization membership determines which workspace records a signed-in user can access.
- Owner/admin/editor/viewer roles are represented in the schema. UI-level role restrictions must be paired with database RLS policies.
- The first registered user receives a personal workspace through the Auth trigger. Review this behavior if the deployment will use invitation-only registration.

## 6. First sign-in and local-data migration

1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project, then redeploy.
2. Open the deployed app and create an account or sign in.
3. If email confirmation is enabled, confirm the address before signing in.
4. The app loads the signed-in user's organization and cloud records.
5. If the organization is empty and this browser has old PCB Manager LocalStorage records, open Settings and select **Migrate existing local data to cloud**.
6. Keep the browser tab open until synchronization completes. Export a JSON backup first as an additional precaution.

The application deliberately blocks deletion of components that have stock movement history so the stock audit trail remains intact. Database RLS remains the final access-control layer; the role-aware frontend is not a substitute for it.
