# Supabase setup — PCB Component BOM & Inventory Manager

This guide describes how the React application in `pcb-inventory-manager/` connects to Supabase.

## 1. Supabase project

Create a Supabase project. The project URL and publishable key are available in the project's API settings. Keep the database password and any service-role/secret key private.

## 2. Apply database migrations

Apply the following migrations in order:

1. `supabase/migrations/202611180001_initial_schema.sql`
2. `supabase/migrations/202611180002_profile_preferences.sql`
3. `supabase/migrations/202611180003_authenticated_table_grants.sql`

The migrations provide:

- Initial tables, foreign keys, indexes, helper functions, triggers, and RLS policies.
- The `profiles.preferences` JSONB field used for user display preferences.
- SQL privileges for the Supabase `authenticated` role. These grants do not disable or bypass RLS.

### Apply with Supabase SQL Editor

Open the SQL Editor in your Supabase project. Open each migration file from the repository, copy its complete contents, and run the migrations in numerical order.

If migration 001 was already applied manually, do not run it again blindly. Check which migrations have already been applied and run only the missing ones. In particular:

- If the application reports `column profiles.preferences does not exist`, apply migration 002.
- If it reports `permission denied for table ...` for an authenticated user, apply migration 003. Do not disable RLS.

### Apply with the Supabase CLI

For a fresh project configured for CLI migrations:

```bash
cd pcb-inventory-manager
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Use the CLI workflow consistently for future schema changes so the migration history stays synchronized.

## 3. Configure local environment variables

Create `.env.local` in the same directory as `package.json`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

The repository's `.env.example` contains placeholders. Do not commit `.env.local`.

The app supports the publishable key and a legacy anon-key environment variable fallback. Prefer `VITE_SUPABASE_PUBLISHABLE_KEY`.

**Security:** Never place a Supabase service-role/secret key in a Vite environment variable or frontend source. Vite exposes `VITE_*` variables to the browser. RLS policies must enforce access to private workspace data.

## 4. Configure Supabase Auth URLs

In Supabase Authentication → URL Configuration, configure:

- Site URL: `https://electfinalproj.vercel.app`
- Production redirect URL: `https://electfinalproj.vercel.app/**`
- Local redirect URL: `http://localhost:5173/**`

If the application is deployed to another domain, add that domain to the allowed redirect URLs. Configure email confirmation according to the intended account-registration policy, then test confirmation and password-recovery links.

## 5. Configure Vercel

Vercel project settings:

| Setting | Value |
|---|---|
| Root Directory | `pcb-inventory-manager` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Add these environment variables for each environment that should run the app:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Redeploy after changing environment variables. A local `.env.local` file does not configure Vercel automatically.

## 6. Authentication and workspace creation

The application uses Supabase email/password authentication. When a new Auth user is created, the database trigger in migration 001:

1. Creates or updates the user's profile.
2. Creates a personal organization/workspace.
3. Adds the user to that organization with the `owner` role.

The frontend then loads the user's organization membership and workspace data.

## 7. Roles and Row Level Security

The schema defines four roles:

- `owner`
- `admin`
- `editor`
- `viewer`

RLS policies allow organization members to read workspace data. Owners and admins can manage organization membership; owners, admins, and editors can manage inventory, projects, BOM items, and stock operations. Viewers are intended to have read-only access. Activity log reads are restricted to owners and admins.

The grants in migration 003 allow the authenticated database role to reach the tables through the Supabase API. RLS remains the row-level authorization layer. Do not disable RLS to resolve a permission error.

## 8. Verify the integration

After setup, test the following in the deployed application:

1. Register a new account.
2. Confirm the email if confirmation is enabled.
3. Sign in and confirm the workspace loads.
4. Sign out and sign back in to verify session persistence.
5. Add, edit, and delete a test component.
6. Record stock-in, stock-out, and stock correction operations.
7. Create a project and add BOM lines.
8. Refresh the browser and confirm saved data remains available.
9. Change currency and low-stock alert preferences, then refresh.
10. Test password reset and password update.
11. Verify that users in separate workspaces cannot access each other's records.
12. Test JSON export and restore.

The user has confirmed that the application is now working after resolving the missing authenticated table grants and profile preferences column. Continue to test any new schema or authentication changes before treating them as verified.

## 9. Troubleshooting

| Error or symptom | Cause to check | Action |
|---|---|---|
| Supabase setup required | Missing URL or publishable key | Check `.env.local` and Vercel environment variables |
| Permission denied for `organization_members` or another table | Authenticated SQL grants missing | Apply migration 003 |
| `profiles.preferences` does not exist | Preferences migration missing | Apply migration 002 |
| Redirect or recovery link fails | Current domain missing from Auth URL allowlist | Update Site URL and Redirect URLs |
| Workspace membership not found | User does not have an organization membership | Inspect the Auth user and organization membership records securely |
| Local app works but deployed app does not | Vercel environment variables or deployment are outdated | Verify Vercel variables and redeploy |

When diagnosing an issue, preserve the complete error message and note which operation caused it. Never paste secret keys into source control, screenshots, or public issue reports.
