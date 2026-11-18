# PCB Component BOM & Inventory Manager — Implementation Roadmap

## Product direction

Build a full-featured, multi-user electronics component inventory and PCB procurement platform using the existing React + Vite frontend and Supabase/PostgreSQL backend.

Preserve the current green palette and existing working workflows. Extend the current application rather than replacing it without a migration plan.

## Repository audit (18 November 2026)

### Existing frontend

- React 19 + Vite 6.
- Tailwind CSS 4 Vite plugin and Lucide React.
- Main application: `src/App.jsx`.
- Styling: `src/styles.css`.
- JLCParts catalogue service: `js/services/jlcparts.js`.
- Current persistence: LocalStorage key `pcbManagerReactV2`.
- Existing build command: `npm run build`.

### Existing capabilities observed in source

- Dashboard summary and low-stock indicators.
- Component create, edit, delete, search, category filter, and sorting.
- Stock-in, stock-out, initial-stock, and stock-correction history.
- CSV inventory import/export and JSON backup/restore.
- Project and BOM line management, designators, cost estimate, shortage list, and BOM CSV export.
- JLCParts published catalogue search and inventory form prefill.
- Pinout reference lists for ESP32 DevKit V1 and ATmega328P DIP-28.
- Inventory analytics, printable text labels, and display settings.

### Known gaps and risks

- No Supabase client or database integration exists yet.
- LocalStorage data is isolated to one browser and is not shared between users/devices.
- No authentication, organization membership UI, or server-side authorization flow exists.
- No automated tests or CI verification were confirmed during this audit.
- The JLCParts integration searches a published catalogue index/shards; it is not a full catalogue synchronization service and does not guarantee live price/stock.
- CSV/BOM import, backup recovery, stock operations, and live catalogue behavior need browser-level tests.
- The legacy non-React workspace is not automatically migrated into the current React LocalStorage schema.

## Target architecture

- Frontend: React + Vite.
- Authentication: Supabase Auth.
- Database: Supabase PostgreSQL.
- Authorization: PostgreSQL Row Level Security (RLS), scoped by organization.
- Catalogue: existing JLCParts service, with explicit import and refresh workflows.
- Deployment: static frontend hosting plus Supabase managed backend.
- Secrets: frontend publishable/anon key only; never expose service-role credentials.

## Phases

### Phase 1 — Audit and stabilize the current application

- [x] Inspect current frontend, persistence model, JLCParts service, and README.
- [x] Record current features and known limitations.
- [ ] Run production build and resolve compile errors.
- [ ] Add automated tests for stock calculations, BOM calculations, CSV parsing, and backup validation.
- [ ] Manually verify core workflows in the browser.

### Phase 2 — Supabase database foundation

- [x] Design organization-scoped PostgreSQL schema.
- [x] Add profiles, organizations, organization_members, components, suppliers, projects, bom_items, stock_movements, purchase_orders, purchase_order_items, and activity_logs.
- [x] Add indexes, updated-at triggers, initial profile/workspace creation, and RLS policies.
- [ ] Apply migration to a real Supabase project.
- [ ] Validate policies using owner, editor, and viewer accounts.

Migration: `supabase/migrations/202611180001_initial_schema.sql`.

### Phase 3 — Supabase client and authentication

- [ ] Add `@supabase/supabase-js`.
- [ ] Add environment variable configuration and client initialization.
- [ ] Add sign-up, sign-in, sign-out, password reset, and session persistence.
- [ ] Add profile and organization/workspace selection.
- [ ] Add role-aware navigation and actions.
- [ ] Add loading, empty, offline, and authentication error states.

### Phase 4 — Cloud data access and LocalStorage migration

- [ ] Create typed/reusable data-access modules for each domain.
- [ ] Replace direct LocalStorage writes with authenticated database operations.
- [ ] Preserve LocalStorage as a temporary migration source and optional offline cache only if conflict handling is designed.
- [ ] Build an explicit import wizard with preview, duplicate detection, validation, and confirmation.
- [ ] Migrate components, projects, BOM items, and stock movement history.
- [ ] Verify row counts and totals before marking migration complete.

### Phase 5 — Inventory and BOM workflows

- [ ] Add manufacturer, package, footprint, datasheet, LCSC/JLCPCB identifiers, and supplier metadata.
- [ ] Add structured storage locations.
- [ ] Add BOM import adapters (starting with documented CSV formats, then KiCad exports).
- [ ] Add matching by MPN/LCSC number and unmatched-line review.
- [ ] Add stock reservation and release tied to projects.
- [ ] Add BOM readiness, shortages, and purchase planning.
- [ ] Add BOM revision history.

### Phase 6 — JLCParts sourcing and procurement

- [ ] Verify upstream catalogue format, license/terms, refresh cadence, and download sizes.
- [ ] Add multi-select import of search results.
- [ ] Match catalogue entries to existing components without duplicate MPN/LCSC records.
- [ ] Store source and last-checked timestamps for catalogue-derived values.
- [ ] Refresh price/availability only where upstream data supports it; clearly label stale or unavailable data.
- [ ] Add suppliers, purchase orders, receiving, and stock receipt transactions.
- [ ] Do not attempt an unrestricted full catalogue mirror until feasibility and upstream terms are verified.

### Phase 7 — Reporting, operations, and deployment

- [ ] Add inventory valuation, usage, purchase, and project reports.
- [ ] Add QR/barcode labels.
- [ ] Add audit/activity history and exportable reports.
- [ ] Add automated backups and documented recovery.
- [ ] Add CI build/test workflow.
- [ ] Deploy frontend and configure production auth redirects and environment variables.
- [ ] Complete security review, RLS tests, responsive tests, and user acceptance testing.

## Data integrity rules

- Quantities are integers and cannot become negative.
- Prices use PostgreSQL numeric types, not floating-point arithmetic.
- Component MPN is unique within an organization.
- BOM lines cannot reference components from another organization.
- Stock changes must create an immutable movement record with before/after quantities.
- Receiving a purchase order must update stock through a single validated transaction.
- User permissions must be enforced by RLS, not only by hiding buttons in the UI.

## Current implementation status

The initial Supabase schema has been committed on the `feature/supabase-foundation` branch. The frontend still runs on LocalStorage until the Supabase project is configured and the authentication/data-access phases are implemented.
