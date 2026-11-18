# PCB Component BOM & Inventory Manager

**Project status:** Functional React application with Supabase integration; live backend verification pending.  
**Repository:** [am-migs/electfinalproj](https://github.com/am-migs/electfinalproj)  
**Deployed application:** [electfinalproj.vercel.app](https://electfinalproj.vercel.app/)

## 1. Project overview

A web-based inventory and project management system for electronic components. It helps users track component quantities and costs, organize PCB projects, build bills of materials, identify shortages, and search the JLCParts catalogue.

## 2. Technology

- React 19, Vite 6, JavaScript
- Supabase Auth and PostgreSQL
- Row Level Security and organization-based access
- Lucide React
- JLCParts published catalogue data
- Vercel hosting and GitHub Actions build verification

## 3. Implemented features

| Module | Features |
|---|---|
| Authentication | Register, sign in/out, password reset and update |
| Dashboard | Component totals, stock units, low-stock alerts, inventory value, recent activity |
| Inventory | Add/edit/delete, search, category filtering, sorting, component details |
| Stock control | Stock-in/out, initial stock, corrections, movement history |
| BOM manager | Projects, BOM lines, designators, quantities, cost and shortage calculation |
| Catalogue | JLCParts search and component form prefill |
| Pinout inspector | ESP32 DevKit V1 and ATmega328P DIP-28 references |
| Analytics | Inventory valuation, category and project cost summaries |
| Data tools | CSV import/export, JSON backup/restore, printable labels |
| Cloud workspace | Organization-scoped data, role-aware access, LocalStorage migration |
| Preferences | Currency display and low-stock alert settings |

## 4. Development progress

- **Frontend:** React application and responsive green-themed interface implemented.
- **Inventory/BOM:** Core CRUD, stock history, BOM calculations, and exports implemented.
- **External catalogue:** JLCParts lookup integrated.
- **Database:** Supabase schema, organization membership, and RLS policies created.
- **Authentication:** Email/password flows and password recovery integrated.
- **Cloud persistence:** Inventory, projects, BOM, movements, and profile preferences connected.
- **Quality checks:** GitHub Actions production build passes after the latest fixes.

## 5. Limitations

- Live Supabase authentication, RLS, and cloud synchronization still need end-to-end testing.
- Supplier and purchase-order tables exist, but management and receiving screens are not yet implemented.
- Cloud synchronization is sequential, not transactional; partial failures and simultaneous edits need further protection.
- No multi-organization switcher, BOM revision history, reservation workflow, or BOM import from KiCad yet.
- JLCParts data may be delayed and does not guarantee current price or stock availability.
- Currency selection changes display formatting only; it does not convert stored prices.
- Pinout references are limited and do not replace datasheets or schematic tools.
- Automated unit, integration, and browser tests are not yet included.

## 6. Next development priorities

1. Apply both Supabase migrations and verify Vercel environment variables.
2. Test registration, password recovery, RLS roles, cloud CRUD, and local-data migration.
3. Add automated tests and browser-based responsive testing.
4. Implement suppliers, purchase orders, and stock receiving.
5. Improve synchronization reliability and add transaction-safe stock operations.
6. Expand BOM import, revision tracking, pinout coverage, and barcode/QR labels.

## 7. Release readiness

The application builds successfully in GitHub Actions, but a successful build confirms compilation only. The project should be considered ready for production use only after live database, security, browser, and backup-recovery tests pass.
