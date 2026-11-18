
import { appState } from "../core/state.js";
import {
    formatCurrency,
    formatDate,
    escapeHTML,
    getStockStatus,
    calculateInventoryValue
} from "../core/utilities.js";

let initialized = false;
let observer = null;

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

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, rows) {
    const csv = "\uFEFF" + rows
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

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

    const rows = [
        [
            "MPN",
            "Component Name",
            "Manufacturer",
            "Category",
            "Package",
            "Footprint",
            "Storage Location",
            "Unit Price",
            "Stock",
            "Minimum Stock",
            "Stock Status",
            "Inventory Value",
            "Datasheet"
        ]
    ];

    inventory.forEach(component => {
        const stock = Number(component.stock) || 0;
        const unitPrice = Number(component.unitPrice) || 0;

        rows.push([
            component.mpn,
            component.name,
            component.manufacturer,
            component.category,
            component.packageType,
            component.footprint,
            component.location,
            unitPrice.toFixed(2),
            stock,
            Number(component.minStock) || 0,
            getStockStatus(stock, component.minStock),
            (stock * unitPrice).toFixed(2),
            component.datasheet
        ]);
    });

    const date = new Date().toISOString().slice(0, 10);

    downloadCSV(`pcb-inventory-report-${date}.csv`, rows);
}

export function exportStockMovementReportCSV() {
    const movements = getMovements();

    const rows = [
        [
            "Date",
            "Component Name",
            "MPN",
            "Previous Stock",
            "New Stock",
            "Quantity Changed",
            "Reason"
        ]
    ];

    movements.forEach(movement => {
        rows.push([
            movement.date,
            movement.componentName,
            movement.mpn,
            Number(movement.previousStock) || 0,
            Number(movement.newStock) || 0,
            Number(movement.quantityChanged) || 0,
            movement.reason
        ]);
    });

    const date = new Date().toISOString().slice(0, 10);

    downloadCSV(`pcb-stock-movements-${date}.csv`, rows);
}

export function printInventoryReport() {
    const inventory = getInventory();
    const movements = getMovements().slice(0, 20);

    const totalUnits = inventory.reduce(
        (total, component) => total + (Number(component.stock) || 0),
        0
    );

    const totalValue = calculateInventoryValue(inventory);

    const lowStock = inventory.filter(component => {
        return getStockStatus(component.stock, component.minStock) === "Low Stock";
    });

    const outOfStock = inventory.filter(component => {
        return getStockStatus(component.stock, component.minStock) === "Out of Stock";
    });

    const inventoryRows = inventory.map(component => {
        const stock = Number(component.stock) || 0;
        const price = Number(component.unitPrice) || 0;

        return `
            <tr>
                <td>${escapeHTML(component.mpn || "—")}</td>
                <td>${escapeHTML(component.name || "Unnamed")}</td>
                <td>${escapeHTML(component.category || "—")}</td>
                <td>${stock}</td>
                <td>${Number(component.minStock) || 0}</td>
                <td>${escapeHTML(getStockStatus(stock, component.minStock))}</td>
                <td>${escapeHTML(money(stock * price))}</td>
            </tr>
        `;
    }).join("");

    const movementRows = movements.map(movement => {
        const date = new Date(movement.date);
        const formattedDate = Number.isNaN(date.getTime())
            ? "—"
            : formatDate(date);

        return `
            <tr>
                <td>${escapeHTML(formattedDate)}</td>
                <td>${escapeHTML(movement.componentName || "Component")}</td>
                <td>${escapeHTML(movement.mpn || "—")}</td>
                <td>${Number(movement.previousStock) || 0}</td>
                <td>${Number(movement.newStock) || 0}</td>
                <td>${Number(movement.quantityChanged) || 0}</td>
                <td>${escapeHTML(movement.reason || "Stock update")}</td>
            </tr>
        `;
    }).join("");

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        alert("The report window was blocked. Please allow pop-ups and try again.");
        return false;
    }

    reportWindow.document.write(`
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
                    margin: 30px;
                    color: #26352d;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12px;
                }

                h1 {
                    margin-bottom: 5px;
                    color: #276221;
                    font-size: 24px;
                }

                h2 {
                    margin: 28px 0 12px;
                    color: #276221;
                    font-size: 16px;
                }

                .subtitle {
                    margin-bottom: 25px;
                    color: #718078;
                }

                .summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-bottom: 25px;
                }

                .summary-card {
                    padding: 14px;
                    border: 1px solid #CBDED3;
                    border-radius: 8px;
                }

                .summary-card span {
                    display: block;
                    margin-bottom: 7px;
                    color: #718078;
                }

                .summary-card strong {
                    color: #276221;
                    font-size: 18px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th, td {
                    padding: 9px 7px;
                    border: 1px solid #E2DFDA;
                    text-align: left;
                    overflow-wrap: anywhere;
                }

                th {
                    background: #eaf4e8;
                    color: #276221;
                }

                .footer {
                    margin-top: 30px;
                    padding-top: 12px;
                    border-top: 1px solid #E2DFDA;
                    color: #718078;
                    font-size: 10px;
                }

                @media print {
                    body {
                        margin: 12mm;
                    }

                    .summary-card {
                        break-inside: avoid;
                    }

                    table {
                        page-break-inside: auto;
                    }

                    tr {
                        page-break-inside: avoid;
                    }
                }

                @media screen and (max-width: 700px) {
                    body {
                        margin: 15px;
                    }

                    .summary {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
            </style>
        </head>

        <body>
            <h1>PCB Component Inventory Report</h1>
            <p class="subtitle">
                Generated ${escapeHTML(formatDate(new Date()))}
                · Currency: ${escapeHTML(getCurrency())}
            </p>

            <div class="summary">
                <div class="summary-card">
                    <span>Component Types</span>
                    <strong>${inventory.length}</strong>
                </div>

                <div class="summary-card">
                    <span>Total Stock Units</span>
                    <strong>${totalUnits.toLocaleString("en-PH")}</strong>
                </div>

                <div class="summary-card">
                    <span>Inventory Value</span>
                    <strong>${escapeHTML(money(totalValue))}</strong>
                </div>

                <div class="summary-card">
                    <span>Low / Out of Stock</span>
                    <strong>${lowStock.length + outOfStock.length}</strong>
                </div>
            </div>

            <h2>Inventory Catalog</h2>

            ${inventory.length ? `
                <table>
                    <thead>
                        <tr>
                            <th>MPN</th>
                            <th>Component</th>
                            <th>Category</th>
                            <th>Stock</th>
                            <th>Minimum</th>
                            <th>Status</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>${inventoryRows}</tbody>
                </table>
            ` : "<p>No inventory records available.</p>"}

            <h2>Recent Stock Movements</h2>

            ${movements.length ? `
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Component</th>
                            <th>MPN</th>
                            <th>Previous</th>
                            <th>New</th>
                            <th>Change</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>${movementRows}</tbody>
                </table>
            ` : "<p>No stock movement records available.</p>"}

            <div class="footer">
                PCB Component BOM & Inventory Manager · Local Inventory Report
            </div>

            <script>
                window.addEventListener("load", () => {
                    window.print();
                });
            <\/script>
        </body>
        </html>
    `);

    reportWindow.document.close();
    return true;
}

function addReportControls() {
    const toolbar = document.querySelector(
        "#analytics-module-content .analytics-toolbar"
    );

    if (!toolbar || toolbar.querySelector(".report-controls")) return;

    const controls = document.createElement("div");
    controls.className = "report-controls";

    controls.innerHTML = `
        <button type="button" class="report-button" data-report-action="inventory">
            Export Inventory CSV
        </button>

        <button type="button" class="report-button" data-report-action="movements">
            Export Movement CSV
        </button>

        <button type="button" class="report-button primary" data-report-action="print">
            Print Report
        </button>
    `;

    toolbar.appendChild(controls);
}

function injectStyles() {
    if (document.getElementById("report-module-styles")) return;

    const style = document.createElement("style");
    style.id = "report-module-styles";

    style.textContent = `
        .report-controls {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }

        .report-button {
            padding: 9px 12px;
            border: 1px solid var(--border-color, #E2DFDA);
            border-radius: 8px;
            background: #fff;
            color: var(--primary, #276221);
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
        }

        .report-button:hover {
            background: var(--green-pale, #cce7c9);
        }

        .report-button.primary {
            border-color: var(--primary, #276221);
            background: var(--primary, #276221);
            color: #fff;
        }

        .report-button.primary:hover {
            background: var(--primary-dark, #1e4c19);
        }

        @media (max-width: 700px) {
            .report-controls {
                width: 100%;
            }

            .report-button {
                flex: 1 1 140px;
            }
        }
    `;

    document.head.appendChild(style);
}

function initializeReportEvents() {
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-report-action]");
        if (!button) return;

        const action = button.dataset.reportAction;

        if (action === "inventory") {
            exportInventoryReportCSV();
        }

        if (action === "movements") {
            exportStockMovementReportCSV();
        }

        if (action === "print") {
            printInventoryReport();
        }
    });
}

export function initializeReports() {
    if (initialized) return true;

    injectStyles();
    addReportControls();
    initializeReportEvents();

    const analyticsContent = document.getElementById(
        "analytics-module-content"
    );

    if (analyticsContent) {
        observer = new MutationObserver(() => {
            addReportControls();
        });

        observer.observe(analyticsContent, {
            childList: true,
            subtree: true
        });
    }

    initialized = true;
    console.log("Inventory reports initialized successfully.");

    return true;
}
