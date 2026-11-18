
import { appState } from "../core/state.js";
import {
    formatCurrency,
    formatDate,
    escapeHTML,
    getStockStatus,
    calculateInventoryValue
} from "../core/utilities.js";

let analyticsInitialized = false;

function getCurrency() {
    return appState.settings?.currency || "PHP";
}

function money(value) {
    return formatCurrency(Number(value) || 0, getCurrency());
}

function getInventory() {
    return Array.isArray(appState.inventory) ? appState.inventory : [];
}

function getProjects() {
    return Array.isArray(appState.projects) ? appState.projects : [];
}

function getMovements() {
    return Array.isArray(appState.stockMovements)
        ? appState.stockMovements
        : [];
}

function safeDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return formatDate(date);
}

function getStatusCounts(inventory) {
    return inventory.reduce((counts, component) => {
        const status = getStockStatus(
            component.stock,
            component.minStock
        );

        counts[status] = (counts[status] || 0) + 1;
        return counts;
    }, {
        "In Stock": 0,
        "Low Stock": 0,
        "Out of Stock": 0
    });
}

function getCategoryData(inventory) {
    const categories = {};

    inventory.forEach(component => {
        const category = component.category || "Uncategorized";

        if (!categories[category]) {
            categories[category] = {
                name: category,
                count: 0,
                units: 0,
                value: 0
            };
        }

        categories[category].count += 1;
        categories[category].units += Number(component.stock) || 0;
        categories[category].value +=
            (Number(component.stock) || 0) *
            (Number(component.unitPrice) || 0);
    });

    return Object.values(categories)
        .sort((a, b) => b.value - a.value);
}

function getTopComponents(inventory) {
    return [...inventory]
        .map(component => ({
            ...component,
            calculatedValue:
                (Number(component.stock) || 0) *
                (Number(component.unitPrice) || 0)
        }))
        .sort((a, b) => b.calculatedValue - a.calculatedValue)
        .slice(0, 5);
}

function getMovementLabel(movement) {
    const difference = Number(movement.quantityChanged) || 0;

    if (difference > 0) return "Stock Added";
    if (difference < 0) return "Stock Removed";
    return "Stock Updated";
}

function injectAnalyticsStyles() {
    if (document.getElementById("analytics-module-styles")) return;

    const style = document.createElement("style");
    style.id = "analytics-module-styles";

    style.textContent = `
        .analytics-layout {
            display: grid;
            gap: 20px;
        }

        .analytics-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }

        .analytics-toolbar p {
            margin: 0;
            color: var(--text-secondary, #718078);
            font-size: 13px;
        }

        .analytics-refresh {
            border: 1px solid var(--border-color, #e2dfda);
            background: #fff;
            color: var(--text-primary, #26352d);
            border-radius: 8px;
            padding: 9px 13px;
            cursor: pointer;
            font-weight: 600;
        }

        .analytics-refresh:hover {
            background: var(--green-pale, #cce7c9);
        }

        .analytics-stat-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
        }

        .analytics-stat {
            min-width: 0;
            padding: 18px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 12px;
            background: var(--bg-card, #fff);
        }

        .analytics-stat span {
            display: block;
            margin-bottom: 8px;
            color: var(--text-secondary, #718078);
            font-size: 12px;
        }

        .analytics-stat strong {
            display: block;
            color: var(--text-primary, #26352d);
            font-size: clamp(18px, 2vw, 25px);
            overflow-wrap: anywhere;
        }

        .analytics-grid-two {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
        }

        .analytics-panel {
            min-width: 0;
            padding: 20px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 12px;
            background: var(--bg-card, #fff);
        }

        .analytics-panel h3 {
            margin: 0 0 5px;
            color: var(--text-primary, #26352d);
            font-size: 16px;
        }

        .analytics-panel-description {
            margin: 0 0 20px;
            color: var(--text-secondary, #718078);
            font-size: 12px;
        }

        .analytics-bars {
            display: grid;
            gap: 17px;
        }

        .analytics-bar-item {
            display: grid;
            gap: 7px;
        }

        .analytics-bar-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            color: var(--text-primary, #26352d);
            font-size: 13px;
        }

        .analytics-bar-label span:last-child {
            color: var(--text-secondary, #718078);
            white-space: nowrap;
        }

        .analytics-track {
            height: 10px;
            overflow: hidden;
            border-radius: 20px;
            background: #edf1ed;
        }

        .analytics-fill {
            height: 100%;
            min-width: 0;
            border-radius: inherit;
            background: var(--primary, #276221);
        }

        .analytics-fill.low {
            background: #d2a33d;
        }

        .analytics-fill.out {
            background: #c84b43;
        }

        .analytics-fill.secondary {
            background: #72bf6a;
        }

        .analytics-table-wrap {
            width: 100%;
            overflow-x: auto;
        }

        .analytics-table {
            width: 100%;
            min-width: 580px;
            border-collapse: collapse;
        }

        .analytics-table th,
        .analytics-table td {
            padding: 12px 10px;
            border-bottom: 1px solid var(--border-color, #e2dfda);
            text-align: left;
            font-size: 13px;
        }

        .analytics-table th {
            color: var(--text-secondary, #718078);
            font-weight: 600;
            white-space: nowrap;
        }

        .analytics-table td {
            color: var(--text-primary, #26352d);
        }

        .analytics-table td strong {
            font-weight: 600;
        }

        .analytics-empty {
            padding: 25px 12px;
            text-align: center;
            color: var(--text-secondary, #718078);
            font-size: 13px;
        }

        .analytics-status {
            display: inline-block;
            padding: 5px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
        }

        .analytics-status.in {
            background: #e5f4e2;
            color: #276221;
        }

        .analytics-status.low {
            background: #fff4d8;
            color: #946200;
        }

        .analytics-status.out {
            background: #fde8e7;
            color: #a52c25;
        }

        .analytics-movement {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-weight: 600;
        }

        .analytics-movement.add {
            color: #276221;
        }

        .analytics-movement.remove {
            color: #b42318;
        }

        .analytics-project-list {
            display: grid;
            gap: 12px;
        }

        .analytics-project-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 13px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 9px;
        }

        .analytics-project-item strong {
            display: block;
            margin-bottom: 4px;
            color: var(--text-primary, #26352d);
            font-size: 13px;
        }

        .analytics-project-item small {
            color: var(--text-secondary, #718078);
        }

        .analytics-project-cost {
            text-align: right;
            white-space: nowrap;
            color: var(--primary, #276221);
            font-weight: 700;
            font-size: 13px;
        }

        @media (max-width: 950px) {
            .analytics-stat-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 700px) {
            .analytics-grid-two {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 480px) {
            .analytics-stat-grid {
                gap: 9px;
            }

            .analytics-stat {
                padding: 13px;
            }

            .analytics-panel {
                padding: 14px;
            }

            .analytics-project-item {
                align-items: flex-start;
                flex-direction: column;
            }

            .analytics-project-cost {
                text-align: left;
            }
        }
    `;

    document.head.appendChild(style);
}

function renderStatistics(inventory, statuses, totalUnits, totalValue) {
    const lowStock = statuses["Low Stock"] + statuses["Out of Stock"];

    return `
        <div class="analytics-stat-grid">
            <div class="analytics-stat">
                <span>Total Component Types</span>
                <strong>${inventory.length.toLocaleString("en-PH")}</strong>
            </div>

            <div class="analytics-stat">
                <span>Total Stock Units</span>
                <strong>${totalUnits.toLocaleString("en-PH")}</strong>
            </div>

            <div class="analytics-stat">
                <span>Inventory Value</span>
                <strong>${money(totalValue)}</strong>
            </div>

            <div class="analytics-stat">
                <span>Components Needing Attention</span>
                <strong>${lowStock.toLocaleString("en-PH")}</strong>
            </div>
        </div>
    `;
}

function renderStockHealth(statuses, totalComponents) {
    const rows = [
        {
            label: "In Stock",
            count: statuses["In Stock"],
            className: "",
            description: "Sufficient stock"
        },
        {
            label: "Low Stock",
            count: statuses["Low Stock"],
            className: "low",
            description: "At or below minimum"
        },
        {
            label: "Out of Stock",
            count: statuses["Out of Stock"],
            className: "out",
            description: "No available units"
        }
    ];

    return `
        <section class="analytics-panel">
            <h3>Stock Health</h3>
            <p class="analytics-panel-description">
                Distribution of components by stock status.
            </p>

            ${totalComponents ? `
                <div class="analytics-bars">
                    ${rows.map(row => {
                        const percentage = totalComponents
                            ? (row.count / totalComponents) * 100
                            : 0;

                        return `
                            <div class="analytics-bar-item">
                                <div class="analytics-bar-label">
                                    <strong>${row.label}</strong>
                                    <span>${row.count} (${percentage.toFixed(1)}%)</span>
                                </div>

                                <div class="analytics-track">
                                    <div class="analytics-fill ${row.className}"
                                        style="width:${percentage}%"></div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            ` : `
                <div class="analytics-empty">No inventory data available.</div>
            `}
        </section>
    `;
}

function renderCategoryDistribution(categories, totalUnits) {
    return `
        <section class="analytics-panel">
            <h3>Category Distribution</h3>
            <p class="analytics-panel-description">
                Component quantities grouped by category.
            </p>

            ${categories.length ? `
                <div class="analytics-bars">
                    ${categories.map(category => {
                        const percentage = totalUnits
                            ? (category.units / totalUnits) * 100
                            : 0;

                        return `
                            <div class="analytics-bar-item">
                                <div class="analytics-bar-label">
                                    <strong>${escapeHTML(category.name)}</strong>
                                    <span>${category.units.toLocaleString("en-PH")} units</span>
                                </div>

                                <div class="analytics-track">
                                    <div class="analytics-fill secondary"
                                        style="width:${percentage}%"></div>
                                </div>

                                <small class="analytics-panel-description">
                                    ${category.count} component type(s) · ${money(category.value)}
                                </small>
                            </div>
                        `;
                    }).join("")}
                </div>
            ` : `
                <div class="analytics-empty">No categories to display.</div>
            `}
        </section>
    `;
}

function renderTopComponents(inventory) {
    const components = getTopComponents(inventory);

    return `
        <section class="analytics-panel">
            <h3>Highest Inventory Value</h3>
            <p class="analytics-panel-description">
                Top five components ranked by stock value.
            </p>

            ${components.length ? `
                <div class="analytics-table-wrap">
                    <table class="analytics-table">
                        <thead>
                            <tr>
                                <th>Component</th>
                                <th>Stock</th>
                                <th>Unit Price</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${components.map(component => `
                                <tr>
                                    <td>
                                        <strong>${escapeHTML(component.name || "Unnamed")}</strong>
                                        <br>
                                        <small>${escapeHTML(component.mpn || "No MPN")}</small>
                                    </td>
                                    <td>${Number(component.stock) || 0}</td>
                                    <td>${money(component.unitPrice)}</td>
                                    <td><strong>${money(component.calculatedValue)}</strong></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="analytics-empty">No inventory data available.</div>
            `}
        </section>
    `;
}

function renderCategoryValue(categories) {
    return `
        <section class="analytics-panel">
            <h3>Inventory Value by Category</h3>
            <p class="analytics-panel-description">
                Estimated value of available stock in each category.
            </p>

            ${categories.length ? `
                <div class="analytics-bars">
                    ${categories.map(category => {
                        const maxValue = Math.max(
                            ...categories.map(item => item.value),
                            1
                        );

                        const percentage = (category.value / maxValue) * 100;

                        return `
                            <div class="analytics-bar-item">
                                <div class="analytics-bar-label">
                                    <strong>${escapeHTML(category.name)}</strong>
                                    <span>${money(category.value)}</span>
                                </div>

                                <div class="analytics-track">
                                    <div class="analytics-fill"
                                        style="width:${percentage}%"></div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            ` : `
                <div class="analytics-empty">No category value data available.</div>
            `}
        </section>
    `;
}

function renderMovements() {
    const movements = getMovements().slice(0, 10);

    return `
        <section class="analytics-panel">
            <h3>Recent Stock Movements</h3>
            <p class="analytics-panel-description">
                Latest inventory quantity changes recorded by the system.
            </p>

            ${movements.length ? `
                <div class="analytics-table-wrap">
                    <table class="analytics-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Component</th>
                                <th>Movement</th>
                                <th>Previous</th>
                                <th>New Stock</th>
                                <th>Reason</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${movements.map(movement => {
                                const difference = Number(movement.quantityChanged) || 0;
                                const movementClass = difference >= 0 ? "add" : "remove";
                                const movementText = difference > 0
                                    ? `+${difference}`
                                    : String(difference);

                                return `
                                    <tr>
                                        <td>${safeDate(movement.date)}</td>
                                        <td>
                                            <strong>${escapeHTML(movement.componentName || "Component")}</strong>
                                            <br>
                                            <small>${escapeHTML(movement.mpn || "")}</small>
                                        </td>
                                        <td>
                                            <span class="analytics-movement ${movementClass}">
                                                ${movementText}
                                            </span>
                                        </td>
                                        <td>${Number(movement.previousStock) || 0}</td>
                                        <td>${Number(movement.newStock) || 0}</td>
                                        <td>${escapeHTML(movement.reason || getMovementLabel(movement))}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="analytics-empty">
                    No stock movement history is available yet.
                </div>
            `}
        </section>
    `;
}

function renderProjectSummaries() {
    const projects = getProjects();

    return `
        <section class="analytics-panel">
            <h3>Project BOM Summary</h3>
            <p class="analytics-panel-description">
                Component requirements and estimated cost per board.
            </p>

            ${projects.length ? `
                <div class="analytics-project-list">
                    ${projects.map(project => {
                        const items = Array.isArray(project.items)
                            ? project.items
                            : [];

                        const totalCost = items.reduce((total, item) => {
                            const component = getInventoryComponent(item.componentId);
                            const price = Number(
                                component?.unitPrice ?? item.unitPrice ?? 0
                            );
                            const quantity = Number(item.quantityPerBoard) || 0;

                            return total + (price * quantity);
                        }, 0);

                        return `
                            <div class="analytics-project-item">
                                <div>
                                    <strong>${escapeHTML(project.name || "Untitled Project")}</strong>
                                    <small>${items.length} component type(s)</small>
                                </div>

                                <div class="analytics-project-cost">
                                    ${money(totalCost)}
                                    <br>
                                    <small>Cost per board</small>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            ` : `
                <div class="analytics-empty">
                    No projects have been created in the BOM Manager.
                </div>
            `}
        </section>
    `;
}

function getInventoryComponent(componentId) {
    return getInventory().find(component => component.id === componentId);
}

function renderAnalytics() {
    const page = document.getElementById("analytics");
    if (!page) return;

    const inventory = getInventory();
    const statuses = getStatusCounts(inventory);
    const totalUnits = inventory.reduce(
        (total, component) => total + (Number(component.stock) || 0),
        0
    );

    const totalValue = calculateInventoryValue(inventory);
    const categories = getCategoryData(inventory);

    let content = document.getElementById("analytics-module-content");

    if (!content) {
        content = document.createElement("div");
        content.id = "analytics-module-content";
        page.appendChild(content);
    }

    content.innerHTML = `
        <div class="analytics-layout">
            <div class="analytics-toolbar">
                <p>Inventory report generated: ${safeDate(new Date())}</p>
                <button type="button" class="analytics-refresh" id="analytics-refresh">
                    Refresh Analytics
                </button>
            </div>

            ${renderStatistics(inventory, statuses, totalUnits, totalValue)}

            <div class="analytics-grid-two">
                ${renderStockHealth(statuses, inventory.length)}
                ${renderCategoryDistribution(categories, totalUnits)}
            </div>

            <div class="analytics-grid-two">
                ${renderTopComponents(inventory)}
                ${renderCategoryValue(categories)}
            </div>

            ${renderMovements()}
            ${renderProjectSummaries()}
        </div>
    `;
}

function initializeAnalyticsEvents() {
    const page = document.getElementById("analytics");
    if (!page) return;

    page.addEventListener("click", event => {
        if (event.target.closest("#analytics-refresh")) {
            renderAnalytics();
        }
    });

    document.querySelectorAll("[data-page='analytics']").forEach(button => {
        button.addEventListener("click", () => {
            renderAnalytics();
        });
    });
}

export function initializeAnalytics() {
    const page = document.getElementById("analytics");

    if (!page) {
        console.warn("Analytics initialization skipped: #analytics was not found.");
        return false;
    }

    injectAnalyticsStyles();
    renderAnalytics();

    if (!analyticsInitialized) {
        initializeAnalyticsEvents();
        analyticsInitialized = true;
    }

    console.log("Analytics module initialized successfully.");
    return true;
}

export function refreshAnalytics() {
    renderAnalytics();
}
