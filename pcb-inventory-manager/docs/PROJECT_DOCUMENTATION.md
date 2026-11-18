# PCB Component BOM & Inventory Manager

**Application:** PCB Component BOM & Inventory Manager  
**Repository:** https://github.com/am-migs/electfinalproj  
**Application URL:** https://electfinalproj.vercel.app/  
**Application directory:** `pcb-inventory-manager/`  
**Status:** Core application and Supabase connection are operational following database setup and sign-in verification.

## 1. Project overview

The PCB Component BOM & Inventory Manager is a web-based tool for organizing electronic components, monitoring stock, and planning printed circuit board (PCB) projects. It combines an electronic component inventory with project-based bills of materials (BOMs), stock movement records, catalogue lookup, and summary analytics.

The application is intended to help students, electronics hobbyists, and small engineering teams keep component information organized, understand whether they have enough stock for a project, and preserve a record of inventory changes.

### Main objectives

- Maintain a searchable inventory of electronic components.
- Record available stock and minimum-stock thresholds.
- Track stock additions, deductions, and corrections.
- Organize PCB designs as projects with BOM line items.
- Estimate component costs and identify shortages.
- Look up component information through the JLCParts catalogue integration.
- Keep user workspace data in Supabase and provide local backup/export tools.

## 2. Technology stack

| Area | Technology | Purpose |
|---|---|---|
| Frontend | React 19 | Component-based user interface |
| Build tool / dev server | Vite 6 | Local development and production builds |
| Language | JavaScript (ES modules) | Application logic |
| Styling | CSS, Tailwind CSS 4 Vite plugin | Layout and visual styling |
| Icons | Lucide React | Interface icons |
| Authentication | Supabase Auth | Account registration and sign-in |
| Database | Supabase PostgreSQL | Persistent application data |
| Access control | PostgreSQL Row Level Security (RLS) | Organization-scoped data protection |
| Catalogue | JLCParts published catalogue data | Component lookup and form prefill |
| Hosting | Vercel | Production deployment |
| Source control | Git and GitHub | Version control and collaboration |

## 3. Application modules and features

### 3.1 Authentication and account

- Register with a name, email address, and password.
- Sign in and sign out.
- Persist the authentication session between page visits.
- Request a password reset and set a replacement password.
- Create a profile and personal workspace when a new account is registered, through the database registration trigger.

### 3.2 Dashboard

The dashboard provides an at-a-glance summary of the workspace, including:

- Number of component records.
- Total units currently in stock.
- Low-stock alerts based on each component's minimum-stock value.
- Estimated inventory value.
- Recent inventory and stock movement activity.

The low-stock alert panel can be enabled or disabled in preferences.

### 3.3 Component inventory

Component records can include:

- Manufacturer part number (MPN) and component name.
- Manufacturer, category, package type, and footprint.
- Storage location.
- Unit price and display currency.
- Current stock and minimum-stock threshold.
- Datasheet link and catalogue part-number references.

Users can add, edit, view, search, filter, sort, and delete component records. The application checks for duplicate MPN values within the workspace. Stock and minimum-stock values are whole-number quantities, and prices cannot be negative.

### 3.4 Stock control and movement history

Stock operations include:

- Initial stock entry.
- Stock-in transactions.
- Stock-out transactions.
- Stock corrections.

A movement records the component, movement type, quantity, quantity before the operation, quantity after the operation, date, and optional note. The movement history helps users understand how the current stock quantity was reached.

### 3.5 Projects and bill of materials

Users can create and manage PCB projects and add inventory components to each project's BOM. Each BOM line can store:

- The linked inventory component.
- Required quantity.
- Reference designators (for example, R1, R2, C1, or U1).
- Optional notes.

The BOM view uses component stock and required quantities to show estimated costs and identify shortages. BOM quantities must be positive whole numbers. Project records support draft, active, on-hold, completed, and archived statuses in the database schema.

### 3.6 Catalogue lookup

The JLCParts catalogue integration supports searching published component data and using a selected result to prefill an inventory form. Catalogue information is a sourcing reference; users should confirm current price, stock, package, and part number with the supplier before ordering.

### 3.7 Pinout inspector

The pinout reference module includes reference lists for:

- ESP32 DevKit V1.
- ATmega328P DIP-28.

It is a quick reference aid, not a replacement for the manufacturer's datasheet, schematic review, or electrical validation.

### 3.8 Analytics and data tools

The application includes inventory valuation, category summaries, and project cost summaries. Data tools include CSV import/export, JSON backup/restore, and printable component labels.

### 3.9 Preferences

User preferences include:

- Display currency (default: PHP).
- Low-stock alert visibility.

Currency selection changes how values are displayed. It does not convert stored prices or retrieve exchange rates.

## 4. Typical user workflows

### Workflow A — Start a workspace

1. Open the deployed application.
2. Register with an email address and password, or sign in to an existing account.
3. Complete email confirmation if it is enabled in Supabase Auth.
4. Open the dashboard and verify that the workspace loads.

### Workflow B — Add and manage inventory

1. Open the inventory section.
2. Add a component and complete its identifying details.
3. Enter its current stock, minimum stock, unit price, and storage location.
4. Save the record.
5. Search, filter, or sort the inventory to locate it later.
6. Update the component record when its descriptive details change.

### Workflow C — Record a stock change

1. Select the component.
2. Choose the relevant stock operation (stock in, stock out, or correction).
3. Enter a whole-number quantity and an optional note.
4. Submit the operation.
5. Review the updated stock and movement history.

### Workflow D — Build a project BOM

1. Create a project and provide a name and description.
2. Open the project's BOM.
3. Add components from the inventory.
4. Enter the required quantity, designators, and notes for each line.
5. Review estimated costs and shortage indicators.
6. Export the BOM when a spreadsheet copy is needed.

### Workflow E — Back up workspace data

1. Open the data tools area.
2. Export a JSON backup and store it in a safe location.
3. Use the restore option only with a backup from this application.
4. Verify the restored inventory and project records after importing.

## 5. Database design

The Supabase schema is defined in `supabase/migrations/`.

| Table | Purpose |
|---|---|
| `profiles` | User profile and JSON preferences |
| `organizations` | Workspace records |
| `organization_members` | User-to-workspace membership and role |
| `components` | Electronic component inventory |
| `suppliers` | Supplier contact and reference information |
| `projects` | PCB project records |
| `bom_items` | Component requirements attached to projects |
| `stock_movements` | Inventory movement history |
| `purchase_orders` | Purchase order header records |
| `purchase_order_items` | Items and quantities on purchase orders |
| `activity_logs` | Workspace activity records |

### Key relationships

- A profile is associated with a Supabase Auth user.
- An organization represents a workspace.
- Organization membership associates users with workspaces and assigns roles.
- Components belong to an organization.
- Projects belong to an organization.
- BOM items connect a project to a component within the same organization.
- Stock movements reference a component within the same organization.
- Supplier and purchase-order tables are present in the schema for future purchasing workflows.

### Data integrity

The database uses UUID identifiers for most records, foreign keys for relationships, and checks for valid quantities and non-negative prices. Component MPN values are unique within an organization. BOM item quantities must be greater than zero. Stock movement records preserve before-and-after quantities.

## 6. Roles and security

The database defines four organization roles:

| Role | Intended access |
|---|---|
| Owner | Full workspace administration |
| Admin | Workspace and membership administration |
| Editor | Manage inventory, projects, BOM items, and stock operations |
| Viewer | Read-only workspace access |

PostgreSQL Row Level Security (RLS) is enabled on the application tables. Policies check organization membership and role before allowing access. The authenticated Supabase role also needs SQL table privileges; those privileges are granted by migration `202611180003_authenticated_table_grants.sql`. SQL grants do not disable or bypass RLS.

The frontend uses the Supabase publishable key. A service-role or secret key must never be placed in browser code or a `VITE_*` environment variable.

## 7. Project structure

```text
pcb-inventory-manager/
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Main application interface and state
│   ├── components/
│   │   └── AuthScreen.jsx       # Authentication and recovery interface
│   ├── lib/
│   │   ├── supabase.js          # Supabase client configuration
│   │   ├── auth.js              # Authentication operations
│   │   └── workspace.js         # Workspace loading and cloud synchronization
│   └── styles.css               # Active React application styles
├── js/
│   └── services/
│       └── jlcparts.js          # JLCParts catalogue service
├── supabase/
│   └── migrations/              # Database schema and permission migrations
├── docs/
│   ├── PROJECT_DOCUMENTATION.md
│   ├── USER_GUIDE.md
│   ├── SUPABASE_SETUP.md
│   └── IMPLEMENTATION_ROADMAP.md
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

The older vanilla-JavaScript files are retained as legacy project material. The active Vite application starts from `src/main.jsx`, which renders `src/App.jsx`.

## 8. Local development setup

### Requirements

- Node.js and npm.
- Git.
- A Supabase project with the required migrations applied.
- A code editor such as Visual Studio Code.

### Installation

From a terminal:

```bash
git clone https://github.com/am-migs/electfinalproj.git
cd electfinalproj/pcb-inventory-manager
npm install
```

Create `.env.local` in the `pcb-inventory-manager/` directory:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Start the local development server:

```bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## 9. Deployment

The production application is hosted on Vercel.

| Setting | Value |
|---|---|
| Repository | `am-migs/electfinalproj` |
| Root directory | `pcb-inventory-manager` |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Configure the following Vercel environment variables for the environments being deployed:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Redeploy after changing environment variables. Supabase Auth URL Configuration must include the production site URL and the production redirect URL. For local development, include `http://localhost:5173/**`.

## 10. Database migrations

Apply migrations in numerical order:

1. `202611180001_initial_schema.sql` — creates tables, relationships, helper functions, triggers, indexes, and RLS policies.
2. `202611180002_profile_preferences.sql` — adds the profile preferences JSONB field.
3. `202611180003_authenticated_table_grants.sql` — grants the authenticated role the SQL privileges required by the app while keeping RLS enabled.

If the initial schema has already been applied manually, do not rerun it blindly. Apply only migrations that are still missing. See [Supabase setup](SUPABASE_SETUP.md) for detailed instructions.

## 11. Troubleshooting

| Symptom | Likely cause | Resolution |
|---|---|---|
| Supabase setup required message | Missing or incorrectly named environment variables | Check `.env.local` and Vercel environment variables; restart/redeploy |
| Permission denied for a table | Authenticated role lacks SQL table privileges | Apply migration 003; keep RLS enabled |
| `profiles.preferences` does not exist | Profile preferences migration is missing | Apply migration 002 |
| Login or confirmation link fails | Supabase Auth URL configuration does not include the current origin | Check Site URL and Redirect URLs |
| Local changes do not appear in production | Production deployment is using an older build or different environment variables | Redeploy and verify Vercel settings |
| Component or BOM save fails | Check required fields, valid quantities, role permissions, and the browser error message | Correct the input or verify workspace access |

When troubleshooting, preserve the exact error message. Do not solve permission issues by disabling RLS.

## 12. Current scope and known limitations

- Supplier and purchase-order tables exist, but dedicated management screens and receiving workflows are not implemented.
- Cloud synchronization currently uses sequential operations rather than a single database transaction. A partial failure may require checking the affected records before retrying.
- Multi-organization switching is not yet available in the interface.
- BOM revision history, stock reservation workflows, and direct KiCad BOM import are not implemented.
- Catalogue information can become outdated; verify supplier availability and pricing independently.
- Currency preferences affect display formatting only.
- Pinout references cover only ESP32 DevKit V1 and ATmega328P DIP-28.
- Automated unit, integration, and browser end-to-end test suites are not currently included.

## 13. Recommended future improvements

1. Add automated tests for inventory calculations, stock operations, BOM totals, and permissions.
2. Add transactional database functions for stock changes and cloud synchronization.
3. Implement supplier management, purchase orders, and receiving.
4. Add multi-workspace switching and invitation workflows.
5. Add BOM import and revision history.
6. Expand component pinout references and sourcing providers.
7. Improve barcode/QR label generation and mobile usability.

## 14. Project status

The application has been connected to its Supabase backend, and the user has confirmed that the application is now working after the database permission and profile-preferences issues were resolved. This documentation describes the implemented application and its current scope. Future enhancements and limitations are listed separately so they are not mistaken for completed features.
