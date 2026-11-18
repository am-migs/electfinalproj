# PCB Component BOM & Inventory Manager

A web application for managing electronic components, stock, PCB project bills of materials, and sourcing references.

## Technology

- React 19, Vite 6, JavaScript
- Supabase Auth and PostgreSQL with Row Level Security
- Lucide React icons
- JLCParts published catalogue data
- Vercel deployment

## Run locally

```bash
cd pcb-inventory-manager
npm install
cp .env.example .env.local
npm run dev
```

Add the Supabase project URL and publishable key to `.env.local`. Never use a service-role/secret key in frontend variables.

Production build:

```bash
npm run build
npm run preview
```

## Implemented features

- **Authentication:** email/password registration and sign-in, sign-out, password reset, and password update.
- **Cloud workspace:** organization-scoped data, role-aware editing, and Supabase synchronization.
- **Dashboard:** component count, stock units, low-stock alerts, inventory value, recent inventory, and stock movements.
- **Inventory:** add/edit/delete, MPN duplicate checks, search, category filters, sorting, component details, and storage location.
- **Stock control:** stock-in/out, initial stock, stock corrections, quantity validation, and movement history.
- **BOM manager:** projects, BOM lines, designators, required quantities, estimated cost, shortages, and CSV export.
- **Catalogue:** JLCParts search and inventory form prefill.
- **Pinout inspector:** searchable ESP32 DevKit V1 and ATmega328P DIP-28 reference lists.
- **Analytics and exports:** inventory valuation, category summaries, project cost overview, CSV exports, printable labels, and JSON backup/restore.
- **Preferences:** display currency and low-stock alerts, stored in the user's profile.

## Project structure

- `src/App.jsx` — active React application
- `src/components/AuthScreen.jsx` — authentication and password recovery
- `src/lib/` — Supabase client, authentication helpers, and cloud workspace data access
- `src/styles.css` — active React styles
- `js/services/jlcparts.js` — catalogue data service reused by React
- `supabase/migrations/` — database schema and preference migrations
- `docs/` — setup, integration, roadmap, and project documentation

The older vanilla-JavaScript modules in `js/app.js`, `js/script.js`, and `js/modules/` are retained as legacy project material. They are not loaded by the current Vite entry point (`src/main.jsx`).

## Important setup

1. Apply both SQL migrations in order, or use the Supabase CLI on a fresh project.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` locally and in Vercel.
3. Configure Supabase Auth Site URL and redirect URLs.
4. Test registration, confirmation, login, password recovery, role permissions, data sync, and local-data migration.

See [Supabase setup](docs/SUPABASE_SETUP.md) and [Project documentation](docs/PROJECT_DOCUMENTATION.md).

## Limitations

- Live Supabase authentication, RLS, and data synchronization still require end-to-end testing against the deployed database.
- Supplier and purchase-order tables exist in the schema, but corresponding management screens and receiving workflows are not implemented.
- JLCParts is an external published dataset; catalogue freshness, price, and stock availability are not guaranteed.
- Currency selection changes display formatting only; it does not convert stored prices or fetch exchange rates.
- Pinout references cover only two board/device families and are not electrical design tools.
- No automated unit, integration, or browser end-to-end test suite is currently included.
- Multi-organization switching, BOM import/revision history, reservations, and QR/barcode labels remain future work.

## Build status

The GitHub Actions production build passed after the Supabase and application fixes. A successful build does not replace live Supabase, browser, or deployment testing.
