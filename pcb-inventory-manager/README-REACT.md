# PCB Component BOM & Inventory Manager — React Migration

## Stack
- React 19
- Vite 6
- Tailwind CSS 4 (Vite plugin)
- Lucide React icons
- Browser LocalStorage for persistence
- JLCParts open-source catalogue service for component search

## Run locally
Open a terminal in this directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build
```bash
npm run build
npm run preview
```

## Current modules
- Dashboard: component count, stock units, low-stock count, inventory valuation, recent inventory.
- Inventory: create, edit, delete, search, category filter, duplicate MPN validation, and local persistence.
- JLCParts catalogue: search public JLCParts catalogue data and copy a selected component into the inventory form.
- BOM Manager: create projects and add inventory components with required quantities and shortage calculation.
- Pinout Inspector: searchable ESP32 DevKit V1 and ATmega328P pin references.
- Analytics: inventory valuation and stock summaries.
- Settings: administrator profile, currency preference, and JSON backup export.

## Catalogue integration notes
The integration reuses the existing `js/services/jlcparts.js` service. JLCParts is an open-source catalogue browser/data project, not a conventional REST API. The service fetches its published manifest, search index, and matching catalogue shards, then searches those records in the browser. First use may download sizeable data files. Availability depends on the upstream published catalogue and browser/network support for gzip decompression.

Project catalogue: https://github.com/yaqwsx/jlcparts
Live catalogue: https://yaqwsx.github.io/jlcparts/

## Data
The React version stores its workspace in LocalStorage under `pcbManagerReactV2`. Existing vanilla-JS data is not automatically migrated into this new key. Export a backup from the old application before switching if you need to retain existing records.

## Important limitations before final submission
This is a frontend migration. It does not provide multi-user authentication, server-side synchronization, live stock reservation, or an exchange-rate provider. The currency preference changes the display format; it does not convert stored prices between currencies. Validate catalogue search against the live upstream data before presenting the API integration as operational.
