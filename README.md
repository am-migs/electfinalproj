# PCB Component BOM & Inventory Manager

A browser-based inventory and Bill of Materials manager for electronics and Computer Engineering projects.

## Features

- Dashboard statistics, inventory value, and low-stock alerts.
- Component catalog with add, edit, delete, search, filtering, and stock adjustments.
- Duplicate MPN validation.
- Project BOM management and cost estimation.
- ESP32 and ATmega328P pinout inspection.
- Inventory analytics, stock movement history, and project summaries.
- CSV inventory import and export.
- Inventory and stock movement CSV reports.
- Printable inventory report.
- Low-stock, out-of-stock, and stock movement notifications.
- QR code and Code 128 barcode labels.
- Administrator profile and application preferences.
- JSON backup export and restore.
- PHP-based currency conversion for display, with cached exchange rates.
- Browser LocalStorage persistence.

## Run locally

1. Clone or download this repository.
2. Open the `pcb-inventory-manager` folder in Visual Studio Code.
3. Run the project using the VS Code Live Server extension or another local HTTP server.
4. Open the served `index.html` in a modern browser.

Serve the project over HTTP because it uses JavaScript ES modules.

## Data storage

Application records are stored in browser LocalStorage under the `pcbManager_` prefix.

Data is local to the browser and device. Use Settings > Data Backup to export or restore a JSON backup.

Component prices remain stored in PHP. Currency preferences convert those PHP amounts for display and do not modify stored base prices.

## External libraries and services

- Lucide icons.
- QRCode.js for QR code generation.
- JsBarcode for Code 128 barcode generation.
- ExchangeRate-API open endpoint for exchange rates, with LocalStorage caching.

QR/barcode libraries and fresh exchange rates require an internet connection.

## Component catalog API — next phase

A distributor or component catalog API is not connected yet.

Nexar/Octopart is a candidate for manufacturer part number lookup. OAuth client secrets must not be placed in browser JavaScript or committed to this repository.

Use a backend or serverless proxy with credentials stored as environment variables.

## Planned final-stack migration

The current modular JavaScript app is an interim implementation.

The final capstone stack is planned to migrate to React, Vite, and Tailwind CSS while preserving the existing data model and workflows.