
import { appState } from "../core/state.js";
import {
    formatCurrency,
    formatDate,
    escapeHTML,
    getStockStatus,
    calculateInventoryValue
} from "../core/utilities.js";

let reportsInitialized = false;
let reportsObserver = null;

function getInventory() {
    return Array.isArray(appState.inventory) ? appState.inventory : [];
}

function getMovements() {
    return Array.isArray(appState.stockMovements)
        ? appState.stockMovements
        : [];
}

function getCurrency() {
    return appState.settings?.currency || "PHP";
}

function money(value) {
    return formatCurrency(Number(value) || 0, getCurrency());
}

function safeDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return formatDate(date);
}

function csvValue(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, headers, rows) {
    const content = [
        headers.map(csvValue).join(","),
        ...rows.map(row => row.map(csvValue).join(","))
    ].join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + content],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportInventoryReportCSV() {
    const inventory = getInventory();

    const headers = [
        "MPN",
        "Component Name",
        "Manufacturer",
        "Category",
        "Package",
        "Footprint",
        "Storage Location",
        "Unit Price",
        "Stock Quantity",
        "Minimum Stock",
        "Stock Status",
        "Inventory Value",
        "Datasheet"
    ];

    const rows = inventory.map(component => {
        const stock = Number(component.stock) || 0;
        const price = Number(component.unitPrice) || 0;

        return [
            component.mpn,
            component.name,
            component.manufacturer,
            component.category,
            component.package,
            component.footprint,
            component.location,
            price.toFixed(2),
            stock,
            Number(component.minStock) || 0,
            getStockStatus(stock, component.minStock),
            (stock * price).toFixed(2),
            component.datasheet
        ];
    });

    downloadCSV(
        `pcb-inventory-report-${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
    );
}

export function exportStockMovementReportCSV() {
    const movements = getMovements();

    const headers = [
        "Date",
        "Component Name",
        "MPN",
        "Previous Stock",
        "Quantity Changed",
        "New Stock",
        "Reason"
    ];

    const rows = movements.map(movement => [
        movement.date,
        movement.componentName,
        movement.mpn,
        Number(movement.previousStock) || 0,
        Number(movement.quantityChanged) || 0,
        Number(movement.newStock) || 0,
        movement.reason
    ]);

    downloadCSV(
        `pcb-stock-movements-${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
    );
}

function getReportStatistics(inventory) {
    const totalUnits = inventory.reduce(
        (total, component) => total + (Number(component.stock) || 0),
        0
    );

    const lowStock = inventory.filter(component =>
        getStockStatus(component.stock, component.minStock) === "Low Stock"
    ).length;

    const outOfStock = inventory.filter(component =>
        getStockStatus(component.stock, component.minStock) === "Out of Stock"
    ).length;

    return {
        totalTypes: inventory.length,
        totalUnits,
        totalValue: calculateInventoryValue(inventory),
        lowStock,
        outOfStock
    };
}

function createPrintableInventoryRows(inventory) {
    if (!inventory.length) {
        return `
            <tr>
                <td colspan="8" class="empty">
                    No inventory records available.
                </td>
            </tr>
        `;
    }

    return inventory.map(component => {
        const stock = Number(component.stock) || 0;
        const price = Number(component.unitPrice) || 0;
        const status = getStockStatus(stock, component.minStock);

        return `
            <tr>
                <td>${escapeHTML(component.mpn || "N/A")}</td>
                <td>${escapeHTML(component.name || "Unnamed")}</td>
                <td>${escapeHTML(component.manufacturer || "N/A")}</td>
                <td>${escapeHTML(component.category || "N/A")}</td>
                <td>${stock}</td>
                <td>${money(price)}</td>
                <td>${money(stock * price)}</td>
                <td>${escapeHTML(status)}</td>
            </tr>
        `;
    }).join("");
}

function createPrintableMovementRows(movements) {
    if (!movements.length) {
        return `
            <tr>
                <td colspan="7" class="empty">
                    No stock movement records available.
                </td>
            </tr>
        `;
    }

    return movements.map(movement => `
        <tr>
            <td>${escapeHTML(safeDate(movement.date))}</td>
            <td>${escapeHTML(movement.componentName || "Component")}</td>
            <td>${escapeHTML(movement.mpn || "N/A")}</td>
            <td>${Number(movement.previousStock) || 0}</td>
            <td>${Number(movement.quantityChanged) || 0}</td>
            <td>${Number(movement.newStock) || 0}</td>
            <td>${escapeHTML(movement.reason || "Stock update")}</td>
        </tr>
    `).join("");
}

export function printInventoryReport() {
    const inventory = getInventory();
    const movements = getMovements().slice(0, 20);
    const stats = getReportStatistics(inventory);

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        alert("Please allow pop-ups to print the inventory report.");
        return false;
    }

    const reportHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PCB Inventory Report</title>

            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 30px;
                    color: #26352d;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                }

                h1 {
                    margin: 0 0 6px;
                    color: #276221;
                    font-size: 24px;
                }

                h2 {
                    margin: 30px 0 12px;
                    color: #276221;
                    font-size: 16px;
                }

                p {
                    color: #68766d;
                }

                .report-header {
                    padding-bottom: 18px;
                    border-bottom: 2px solid #276221;
                }

                .summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-top: 20px;
                }

                .summary-card {
                    padding: 14px;
                    border: 1px solid #dce5dc;
                    border-radius: 8px;
                }

                .summary-card span {
                    display: block;
                    margin-bottom: 7px;
                    color: #68766d;
                    font-size: 11px;
                }

                .summary-card strong {
                    font-size: 17px;
                    overflow-wrap: anywhere;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    padding: 9px 7px;
                    border: 1px solid #dce5dc;
                    text-align: left;
                    vertical-align: top;
                    overflow-wrap: anywhere;
                }

                th {
                    background: #eaf3e8;
                    color: #276221;
                }

                .empty {
                    padding: 20px;
                    color: #68766d;
                    text-align: center;
                }

                .report-footer {
                    margin-top: 30px;
                    padding-top: 12px;
                    border-top: 1px solid #dce5dc;
                    color: #68766d;
                    font-size: 10px;
                }

                @media print {
                    body {
                        padding: 0;
                    }

                    .summary-card,
                    table {
                        break-inside: avoid;
                    }

                    h2 {
                        break-after: avoid;
                    }
                }

                @media (max-width: 700px) {
                    body {
                        padding: 12px;
                    }

                    .summary {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
            </style>
        </head>

        <body>
            <header class="report-header">
                <h1>PCB Component BOM & Inventory Manager</h1>
                <p>Inventory and Stock Movement Report</p>
                <p>Generated: ${escapeHTML(safeDate(new Date()))}</p>
            </header>

            <section class="summary">
                <div class="summary-card">
                    <span>Component Types</span>
                    <strong>${stats.totalTypes.toLocaleString("en-PH")}</strong>
                </div>

                <div class="summary-card">
                    <span>Total Stock Units</span>
                    <strong>${stats.totalUnits.toLocaleString("en-PH")}</strong>
                </div>

                <div class="summary-card">
                    <span>Inventory Value</span>
                    <strong>${escapeHTML(money(stats.totalValue))}</strong>
                </div>

                <div class="summary-card">
                    <span>Low / Out of Stock</span>
                    <strong>${stats.lowStock} / ${stats.outOfStock}</strong>
                </div>
            </section>

            <h2>Inventory Records</h2>

            <table>
                <thead>
                    <tr>
                        <th>MPN</th>
                        <th>Component</th>
                        <th>Manufacturer</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Unit Price</th>
                        <th>Total Value</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    ${createPrintableInventoryRows(inventory)}
                </tbody>
            </table>

            <h2>Recent Stock Movements</h2>

            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Component</th>
                        <th>MPN</th>
                        <th>Previous</th>
                        <th>Changed</th>
                        <th>New Stock</th>
                        <th>Reason</th>
                    </tr>
                </thead>

                <tbody>
                    ${createPrintableMovementRows(movements)}
                </tbody>
            </table>

            <footer class="report-footer">
                PCB Component BOM & Inventory Manager ·
                Generated ${escapeHTML(new Date().toLocaleString("en-PH"))}
            </footer>

            <script>
                window.addEventListener("load", () => {
                    window.print();
                });
            <\/script>
        </body>
        </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();

    return true;
}

function injectReportStyles() {
    if (document.getElementById("inventory-report-styles")) return;

    const style = document.createElement("style");
    style.id = "inventory-report-styles";

    style.textContent = `
        .report-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .report-action-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            padding: 9px 12px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 8px;
            background: #fff;
            color: var(--text-primary, #26352d);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .report-action-button:hover {
            background: var(--green-pale, #cce7c9);
        }

        .report-action-button.primary {
            border-color: var(--primary, #276221);
            background: var(--primary, #276221);
            color: #fff;
        }

        .report-action-button.primary:hover {
            background: #3b8132;
        }

        @media (max-width: 600px) {
            .report-actions {
                width: 100%;
            }

            .report-action-button {
                flex: 1 1 140px;
            }
        }
    `;

    document.head.appendChild(style);
}

function injectReportControls() {
    const toolbar = document.querySelector(
        "#analytics-module-content .analytics-toolbar"
    );

    if (!toolbar || toolbar.querySelector(".report-actions")) {
        return;
    }

    const actions = document.createElement("div");
    actions.className = "report-actions";

    actions.innerHTML = `
        <button
            type="button"
            class="report-action-button"
            id="export-inventory-report">
            Export Inventory CSV
        </button>

        <button
            type="button"
            class="report-action-button"
            id="export-movement-report">
            Export Movement CSV
        </button>

        <button
            type="button"
            class="report-action-button primary"
            id="print-inventory-report">
            Print Report
        </button>
    `;

    toolbar.appendChild(actions);
}

function initializeReportEvents() {
    document.addEventListener("click", event => {
        if (event.target.closest("#export-inventory-report")) {
            exportInventoryReportCSV();
        }

        if (event.target.closest("#export-movement-report")) {
            exportStockMovementReportCSV();
        }

        if (event.target.closest("#print-inventory-report")) {
            printInventoryReport();
        }
    });
}

export function initializeReports() {
    const analyticsContent = document.getElementById(
        "analytics-module-content"
    );

    if (!analyticsContent) {
        console.warn(
            "Reports initialization skipped: analytics content was not found."
        );
        return false;
    }

    injectReportStyles();
    injectReportControls();

    if (!reportsInitialized) {
        initializeReportEvents();

        reportsObserver = new MutationObserver(() => {
            injectReportControls();
        });

        reportsObserver.observe(analyticsContent, {
            childList: true,
            subtree: true
        });

        reportsInitialized = true;
    }

    console.log("Inventory reports initialized successfully.");
    return true;
}
