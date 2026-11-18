# PCB Component BOM & Inventory Manager — React + Vite

## Stack
- React 19 and Vite 6
- Tailwind CSS 4 Vite plugin
- Lucide React icons
- Browser LocalStorage persistence
- JLCParts open-source catalogue data integration

## Run locally
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

## Implemented React modules
- **Dashboard:** component count, total stock units, low-stock alerts, inventory valuation, recently updated items, and recent stock movements.
- **Inventory:** add, edit, delete, duplicate-MPN validation, search, category filtering, sorting, package/footprint/location/datasheet fields, and LocalStorage persistence.
- **Stock control:** stock-in and stock-out adjustments, insufficient-stock validation, movement history, and minimum-stock indicators.
- **CSV:** inventory CSV import (duplicate MPNs are skipped), inventory CSV export, BOM CSV export, and inventory report export.
- **JLCParts catalogue:** search published open-source catalogue records by LCSC number, manufacturer, or description; select a result to prefill the inventory form.
- **BOM manager:** create and delete projects, add inventory parts, quantities and designators, edit BOM lines, remove lines, calculate estimated BOM costs, identify shortages, and export BOM CSV.
- **Pinout inspector:** searchable ESP32 DevKit V1 and ATmega328P DIP-28 reference pin lists.
- **Analytics:** inventory valuation, stock by category, component-level value, project BOM cost overview, and CSV report export.
- **Settings:** editable administrator profile, display-currency preference, low-stock dashboard preference, JSON backup export, JSON backup restore, and workspace reset.
- **Labels:** printable component labels generated through the browser print dialog.

## JLCParts catalogue integration
The integration reuses `js/services/jlcparts.js`. JLCParts is an open-source published catalogue/data project, not a conventional REST API. The service retrieves the published manifest, search index, and relevant catalogue shards, then searches records in the browser. First use may download sizeable data files. Availability depends on the upstream catalogue, network access, and browser gzip decompression support.

- Project: https://github.com/yaqwsx/jlcparts
- Live catalogue: https://yaqwsx.github.io/jlcparts/

No API key is required. Catalogue search must be tested with a live connection before a presentation or demonstration.

## Data and migration
The React workspace uses LocalStorage key `pcbManagerReactV2`. The legacy vanilla-JavaScript workspace is not automatically migrated. Export legacy data before switching if you need to retain it; the React settings page can restore a compatible JSON backup, but the legacy backup schema should be checked before restoring.

## Current scope and limitations
- This is a frontend application. Data is stored in the current browser and is not synchronized between users or devices.
- Currency selection changes the currency display format only. It does not convert existing stored prices or fetch live exchange rates.
- Printable labels are basic text labels; QR/barcode generation is not included in this React version.
- Pinout content is a reference list, not an interactive electrical schematic or board-layout tool.
- JLCParts does not guarantee real-time pricing or stock availability.
- Live catalogue search, CSV import edge cases, backup restoration, and browser print behavior require manual browser testing on the target machine.

## Suggested verification before submission
1. Add, edit, delete, search, sort, and filter inventory records.
2. Adjust stock in and out; verify movement history and low-stock indicators.
3. Import/export CSV and export/restore a JSON backup.
4. Create a project, add BOM lines/designators, edit quantities, and verify costs/shortages.
5. Test JLCParts search while online.
6. Run `npm run build` and test the responsive layout in a browser.
