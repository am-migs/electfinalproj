# Supabase setup — PCB Manager

This guide configures the React application at `pcb-inventory-manager` to use Supabase.

## Current integration

- Email/password registration and sign-in, sign-out, session persistence, password reset, and password update.
- Personal organization/workspace creation through a database trigger.
- Organization-scoped inventory, projects, BOM lines, and stock movement history.
- Profile preferences (display currency and low-stock alerts).
- Role-aware editing backed by PostgreSQL Row Level Security (RLS).
- Optional LocalStorage-to-cloud migration and JSON backup/restore.

## 1. Supabase project

Create a Supabase project and keep its database password private. The project URL is available in Project Settings → API.

## 2. Apply database migrations

The migrations must be applied in this order:

1. `supabase/migrations/202611180001_initial_schema.sql`
2. `supabase/migrations/202611180002_profile_preferences.sql`

**Fresh project using the CLI:**

```bash
cd pcb-inventory-manager
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

If the initial schema migration was already pasted into the Supabase SQL Editor, do not blindly run the initial migration again. Apply only `202611180002_profile_preferences.sql` in SQL Editor. Confirm that `profiles.preferences` exists before using the updated application.

The initial migration creates profiles, organizations, memberships, components, suppliers, projects, BOM items, stock movements, purchase orders, purchase-order items, and activity logs. It also enables RLS and creates the organization access policies.

## 3. Configure local environment

Create `.env.local` in `pcb-inventory-manager`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the Supabase **publishable** key (or legacy anon key) only. Never put a service-role/secret key in Vite variables or frontend code. Do not commit `.env.local`.

The repository contains `.env.example` with placeholders.

## 4. Configure Supabase Auth URLs

In Authentication → URL Configuration:

- Site URL: `https://electfinalproj.vercel.app`
- Redirect URLs: `https://electfinalproj.vercel.app/**`
- Local redirect URL: `http://localhost:5173/**`

Enable email confirmation according to the intended registration policy. Test the confirmation and password-recovery email links.

## 5. Configure Vercel

The Vercel project should use:

- Root Directory: `pcb-inventory-manager`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Add these environment variables for Production (and Preview/Development if used):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Redeploy after changing environment variables. The publishable key is intended for browser use; RLS is responsible for protecting database rows.

## 6. Verify the application

1. Register a new account and confirm its email if confirmation is enabled.
2. Sign in and verify that a personal workspace is created.
3. Test password reset and set a new password from the recovery screen.
4. Add/edit/delete components and projects; test stock-in/out and movement history.
5. Test BOM quantities, designators, cost, and shortage calculations.
6. Change currency and low-stock preferences, refresh, and confirm they persist.
7. Test a viewer account and confirm it cannot modify records.
8. Register a second user and verify that the first user's data is not visible.
9. Test LocalStorage migration in the same browser that contains the old data.
10. Export and restore a JSON backup.

Do not disable RLS to make a request succeed. Database policies—not just UI restrictions—must enforce access.

## Current verification status

The GitHub Actions production build passed after the recent integration fixes. Live Supabase authentication, RLS, database migration, and browser workflows still need to be tested against the configured Supabase project.
