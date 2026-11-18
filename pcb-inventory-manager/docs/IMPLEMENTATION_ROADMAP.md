# PCB Manager — Development Progress

**Last reviewed:** 18 November 2026  
**Active application:** React + Vite in `pcb-inventory-manager/src`

## Current state

The project has moved from a browser-only prototype to a React application with Supabase authentication and organization-scoped cloud data access. The Vite entry point loads `src/main.jsx`; the older vanilla-JavaScript application remains in the repository as legacy material and is not part of the active build.

## Progress by phase

### 1. Frontend foundation — mostly complete
- [x] React 19 + Vite 6 application and responsive green-themed interface
- [x] Dashboard, inventory, stock history, BOM manager, pinout inspector, analytics, and settings
- [x] CSV import/export, JSON backup/restore, and printable labels
- [x] JLCParts catalogue lookup and inventory form prefill
- [ ] Automated unit tests and browser end-to-end tests
- [ ] Manual desktop, tablet, and mobile acceptance testing

### 2. Supabase database — schema implemented
- [x] Organization-scoped schema for profiles, organizations, memberships, components, suppliers, projects, BOM items, stock movements, purchase orders, and activity logs
- [x] Foreign-key constraints, indexes, updated-at triggers, and RLS policies
- [x] Automatic personal workspace creation on registration
- [x] Profile preferences migration
- [ ] Apply/verify migrations on the live Supabase project
- [ ] Test owner, admin, editor, and viewer access with separate accounts

### 3. Authentication and cloud workspace — implemented, live verification pending
- [x] Environment-based Supabase client
- [x] Registration, sign-in, sign-out, session persistence, password reset, and password update
- [x] Organization membership lookup and role-aware editing
- [x] Cloud loading and synchronization for components, projects, BOM lines, movements, and profile preferences
- [x] LocalStorage-to-cloud migration for the current browser
- [ ] Live test authentication, RLS, CRUD, migration, and recovery links
- [ ] Improve conflict handling and make multi-table saves transactional

### 4. Inventory and BOM expansion — partially complete
- [x] Component records, stock adjustments, immutable movement history, BOM costs, and shortage calculations
- [ ] Structured storage locations and supplier associations
- [ ] BOM CSV import and KiCad import
- [ ] Stock reservation/release and BOM revision history

### 5. Sourcing and procurement — catalogue lookup implemented
- [x] Search the published JLCParts catalogue and prefill component details
- [ ] Multi-select catalogue import and duplicate matching by MPN/LCSC
- [ ] Supplier management screens
- [ ] Purchase orders, receiving, and stock receipt transactions
- [ ] Catalogue source timestamps and stale-data indicators

### 6. Reporting and release readiness — partially complete
- [x] Inventory valuation, category summaries, project BOM cost, CSV reports, and printable labels
- [x] GitHub Actions production build workflow
- [x] Vercel deployment configured for the `pcb-inventory-manager` root directory
- [ ] Automated backups and documented recovery testing
- [ ] QR/barcode labels and activity-log UI
- [ ] Production environment verification, RLS review, and user acceptance testing

## Recent development milestones

- Established the React + Vite application and retained the original vanilla-JavaScript prototype as legacy source.
- Added the Supabase PostgreSQL schema, organization membership, RLS, and automatic personal workspaces.
- Integrated email/password authentication and cloud workspace synchronization.
- Corrected Supabase environment configuration and missing client exports.
- Added persistence for user preferences and restored stock movement before/after values.
- Corrected queued synchronization, password recovery, whole-number stock validation, and low-stock preference behavior.
- Verified successful GitHub Actions production builds for the fixes.

## Release blockers / next actions

1. Apply both migrations to the Supabase project; if the first migration was already run manually, apply only the second migration in SQL Editor.
2. Confirm Vercel has the two required Vite environment variables and redeploy.
3. Test sign-up/email confirmation, sign-in, password recovery, and sign-out.
4. Test RLS with different roles and verify that one user's data cannot be accessed by another organization.
5. Test inventory, stock history, BOM, backups, and LocalStorage migration in a real browser.
6. Add automated tests and resolve any issues found before treating the app as production-ready.

## Known technical limitations

- Cloud synchronization uses sequential Supabase requests rather than a single database transaction; partial failures and simultaneous edits need additional handling.
- The application currently uses a personal workspace per registered user; a multi-organization workspace switcher is not implemented.
- Supplier and purchase-order database tables are ahead of the UI; those workflows are not yet available.
- JLCParts is a published external dataset, not a guaranteed live pricing or availability API.
- Currency preference affects formatting only, not conversion of stored prices.
