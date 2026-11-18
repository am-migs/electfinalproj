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

function escapeCSV(value) {
    const text = String(value ?? "");

    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

function downloadCSV(rows, filename) {
    const csv = "\uFEFF" + rows
        .map(row => row.map(escapeCSV).join(","))
        .join("\r\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export function exportInventoryReportCSV() {
    const columns = [
        "MPN",
        "Component Name",
        "Manufacturer",
        "Category",
        "Package",
        "Footprint",
        "Location",
        "Unit Price (PHP)",
        "Stock",
        "Minimum Stock",
        "Stock Status",
        "Inventory Value (PHP)",
        "Datasheet"
    ];

    const rows = [
        columns,
        ...appState.inventory.map(component => [
            component.mpn,
            component.name,
            component.manufacturer,
            component.category,
            component.packageType,
            component.footprint,
            component.location,
            component.unitPrice,
            component.stock,
            component.minStock,
            getStockStatus(component.stock, component.minStock),
            (Number(component.unitPrice) || 0) *
                (Number(component.stock) || 0),
            component.datasheet
        ])
    ];

    downloadCSV(
        rows,
        `pcb-inventory-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
}

export function exportStockMovementReportCSV() {
    const columns = [
        "Date",
        "Component",
        "MPN",
        "Movement Type",
        "Quantity",
        "Previous Stock",
        "New Stock",
        "Notes"
    ];

    const rows = [
        columns,
        ...appState.stockMovements.map(movement => {
            const component = appState.inventory.find(
                item => item.id === movement.componentId
            );

            return [
                movement.date || movement.createdAt || "",
                component?.name || movement.componentName || "",
                component?.mpn || movement.mpn || "",
                movement.type || movement.action || "",
                movement.quantity ?? "",
                movement.previousStock ?? "",
                movement.newStock ?? "",
                movement.notes || movement.reason || ""
            ];
        })
    ];

    downloadCSV(
        rows,
        `pcb-stock-movements-${new Date().toISOString().slice(0, 10)}.csv`
    );
}

export function printInventoryReport() {
    const inventory = appState.inventory;
    const movements = [...appState.stockMovements].slice(-20).reverse();

    const totalComponents = inventory.length;

    const totalUnits = inventory.reduce(
        (total, item) => total + (Number(item.stock) || 0),
        0
    );

    const lowStock = inventory.filter(
        item => getStockStatus(item.stock, item.minStock) === "Low Stock"
    ).length;

    const outOfStock = inventory.filter(
        item => getStockStatus(item.stock, item.minStock) === "Out of Stock"
    ).length;

    const totalValue = calculateInventoryValue(inventory);

    const inventoryRows = inventory.map(component => `
        <tr>
            <td>${escapeHTML(component.mpn)}</td>
            <td>${escapeHTML(component.name)}</td>
            <td>${escapeHTML(component.manufacturer)}</td>
            <td>${escapeHTML(component.category)}</td>
            <td>${Number(component.stock) || 0}</td>
            <td>${Number(component.minStock) || 0}</td>
            <td>${escapeHTML(getStockStatus(component.stock, component.minStock))}</td>
            <td>${escapeHTML(formatCurrency(
                (Number(component.unitPrice) || 0) *
                (Number(component.stock) || 0)
            ))}</td>
        </tr>
    `).join("");

    const movementRows = movements.map(movement => {
        const component = inventory.find(
            item => item.id === movement.componentId
        );

        const dateValue = movement.date || movement.createdAt;
        const date = dateValue
            ? formatDate(dateValue)
            : "Not available";

        return `
            <tr>
                <td>${escapeHTML(date)}</td>
                <td>${escapeHTML(component?.name || movement.componentName || "Unknown")}</td>
                <td>${escapeHTML(component?.mpn || movement.mpn || "")}</td>
                <td>${escapeHTML(movement.type || movement.action || "")}</td>
                <td>${escapeHTML(movement.quantity ?? "")}</td>
            </tr>
        `;
    }).join("");

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        alert("Please allow pop-ups to print the inventory report.");
        return;
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
                    font-family: Arial, sans-serif;
                    color: #222;
                    padding: 25px;
                }

                h1 {
                    color: #276221;
                    margin-bottom: 5px;
                }

                h2 {
                    color: #276221;
                    margin-top: 30px;
                }

                .report-date {
                    color: #666;
                    font-size: 12px;
                }

                .summary {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin: 20px 0;
                }

                .summary-card {
                    border: 1px solid #ccc;
                    padding: 14px;
                    border-radius: 8px;
                }

                .summary-card strong {
                    display: block;
                    font-size: 20px;
                    margin-top: 6px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }

                th, td {
                    border: 1px solid #ccc;
                    padding: 7px;
                    text-align: left;
                }

                th {
                    background: #eaf3e8;
                    color: #276221;
                }

                @media print {
                    body {
                        padding: 0;
                    }

                    .summary-card {
                        break-inside: avoid;
                    }

                    tr {
                        break-inside: avoid;
                    }
                }
            </style>
        </head>

        <body>
            <h1>PCB Component BOM & Inventory Manager</h1>
            <p>Inventory Report</p>
            <p class="report-date">
                Generated: ${escapeHTML(new Date().toLocaleString("en-PH"))}
            </p>

            <div class="summary">
                <div class="summary-card">
                    Total Components
                    <strong>${totalComponents}</strong>
                </div>

                <div class="summary-card">
                    Total Stock Units
                    <strong>${totalUnits}</strong>
                </div>

                <div class="summary-card">
                    Low Stock
                    <strong>${lowStock}</strong>
                </div>

                <div class="summary-card">
                    Out of Stock
                    <strong>${outOfStock}</strong>
                </div>

                <div class="summary-card">
                    Inventory Value
                    <strong>${escapeHTML(formatCurrency(totalValue))}</strong>
                </div>
            </div>

            <h2>Inventory Records</h2>

            <table>
                <thead>
                    <tr>
                        <th>MPN</th>
                        <th>Component</th>
                        <th>Manufacturer</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Minimum</th>
                        <th>Status</th>
                        <th>Value</th>
                    </tr>
                </thead>

                <tbody>
                    ${inventoryRows || `
                        <tr>
                            <td colspan="8">No inventory records found.</td>
                        </tr>
                    `}
                </tbody>
            </table>

            <h2>Recent Stock Movements</h2>

            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Component</th>
                        <th>MPN</th>
                        <th>Type</th>
                        <th>Quantity</th>
                    </tr>
                </thead>

                <tbody>
                    ${movementRows || `
                        <tr>
                            <td colspan="5">No stock movements found.</td>
                        </tr>
                    `}
                </tbody>
            </table>

            <script>
                window.onload = () => window.print();
            </script>
        </body>
        </html>
    `);

    reportWindow.document.close();
}

function addReportButtons() {
    const toolbar = document.querySelector(
        "#analytics-module-content .analytics-toolbar"
    );

    if (!toolbar || document.getElementById("inventory-report-controls")) {
        return;
    }

    const controls = document.createElement("div");

    controls.id = "inventory-report-controls";
    controls.className = "report-controls";

    controls.innerHTML = `
        <button type="button"
                class="secondary-button"
                id="report-inventory-csv">
            Export Inventory CSV
        </button>

        <button type="button"
                class="secondary-button"
                id="report-movements-csv">
            Export Movement CSV
        </button>

        <button type="button"
                class="primary-button"
                id="report-print">
            Print Report
        </button>
    `;

    toolbar.appendChild(controls);

    document.getElementById("report-inventory-csv")
        .addEventListener("click", exportInventoryReportCSV);

    document.getElementById("report-movements-csv")
        .addEventListener("click", exportStockMovementReportCSV);

    document.getElementById("report-print")
        .addEventListener("click", printInventoryReport);
}

export function initializeReports() {
    if (initialized) {
        return true;
    }

    const style = document.createElement("style");

    style.textContent = `
        .report-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
        }

        @media (max-width: 600px) {
            .report-controls {
                flex-direction: column;
            }

            .report-controls button {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(style);

    addReportButtons();

    const analytics = document.getElementById("analytics-module-content");

    if (analytics) {
        observer = new MutationObserver(addReportButtons);

        observer.observe(analytics, {
            childList: true,
            subtree: true
        });
    }

    initialized = true;

    return true;
}