
import { appState } from "../core/state.js";

import {
    formatCurrency,
    formatDate,
    escapeHTML,
    getStockStatus,
    calculateInventoryValue
} from "../core/utilities.js";

/*
|--------------------------------------------------------------------------
| Dashboard Module
|--------------------------------------------------------------------------
| Displays inventory statistics, recently added components,
| and stock alerts.
|
| This module reads inventory information from appState.
| It does not directly modify inventory records.
|--------------------------------------------------------------------------
*/

const DASHBOARD_ELEMENTS = {
    totalComponents: "#total-components",
    totalUnits: "#total-units",
    lowStock: "#low-stock",
    inventoryValue: "#inventory-value",
    recentInventory: "#recent-inventory",
    dashboardAlerts: "#dashboard-alerts"
};

/*
|--------------------------------------------------------------------------
| General Helper Functions
|--------------------------------------------------------------------------
*/

function getElement(selector) {
    return document.querySelector(selector);
}

function getInventoryData() {
    return Array.isArray(appState.inventory)
        ? appState.inventory
        : [];
}

function getCurrency() {
    return appState.settings?.currency || "PHP";
}

function safeFormatDate(dateValue) {
    if (!dateValue) {
        return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return formatDate(date);
}

/*
|--------------------------------------------------------------------------
| Stock Status Styling
|--------------------------------------------------------------------------
| These class names match the existing project CSS.
|--------------------------------------------------------------------------
*/

function getStatusClass(status) {
    switch (status) {
        case "In Stock":
            return "status-available";

        case "Low Stock":
            return "status-low";

        case "Out of Stock":
            return "status-out";

        default:
            return "";
    }
}

/*
|--------------------------------------------------------------------------
| Dashboard Statistics
|--------------------------------------------------------------------------
*/

function renderDashboardStatistics() {
    const inventory = getInventoryData();

    const totalComponents = inventory.length;

    const totalUnits = inventory.reduce((total, component) => {
        return total + (Number(component.stock) || 0);
    }, 0);

    const lowStockCount = inventory.filter(component => {
        const status = getStockStatus(
            component.stock,
            component.minStock
        );

        return (
            status === "Low Stock" ||
            status === "Out of Stock"
        );
    }).length;

    const inventoryValue = calculateInventoryValue(inventory);

    const totalComponentsElement = getElement(
        DASHBOARD_ELEMENTS.totalComponents
    );

    const totalUnitsElement = getElement(
        DASHBOARD_ELEMENTS.totalUnits
    );

    const lowStockElement = getElement(
        DASHBOARD_ELEMENTS.lowStock
    );

    const inventoryValueElement = getElement(
        DASHBOARD_ELEMENTS.inventoryValue
    );

    if (totalComponentsElement) {
        totalComponentsElement.textContent =
            totalComponents.toLocaleString("en-PH");
    }

    if (totalUnitsElement) {
        totalUnitsElement.textContent =
            totalUnits.toLocaleString("en-PH");
    }

    if (lowStockElement) {
        lowStockElement.textContent =
            lowStockCount.toLocaleString("en-PH");
    }

    if (inventoryValueElement) {
        inventoryValueElement.textContent = formatCurrency(
            inventoryValue,
            getCurrency()
        );
    }
}

/*
|--------------------------------------------------------------------------
| Recently Added Components
|--------------------------------------------------------------------------
*/

function renderRecentInventory() {
    const container = getElement(
        DASHBOARD_ELEMENTS.recentInventory
    );

    if (!container) return;

    const inventory = getInventoryData();

    if (inventory.length === 0) {
        container.innerHTML = `
            <p class="empty-message">
                No inventory data available yet.
            </p>
        `;

        return;
    }

    const recentComponents = [...inventory]
        .sort((first, second) => {
            const firstDate = new Date(
                first.createdAt || first.updatedAt || 0
            ).getTime();

            const secondDate = new Date(
                second.createdAt || second.updatedAt || 0
            ).getTime();

            return secondDate - firstDate;
        })
        .slice(0, 5);

    container.innerHTML = recentComponents.map(component => {
        const name = escapeHTML(
            component.name ||
            component.mpn ||
            "Unnamed Component"
        );

        const mpn = escapeHTML(
            component.mpn || "No MPN"
        );

        const manufacturer = escapeHTML(
            component.manufacturer || "Unknown Manufacturer"
        );

        const category = escapeHTML(
            component.category || "Uncategorized"
        );

        const stock = Number(component.stock) || 0;

        const status = getStockStatus(
            stock,
            component.minStock
        );

        const date = safeFormatDate(
            component.createdAt || component.updatedAt
        );

        return `
            <div class="recent-item">
                <div class="recent-item-info">
                    <strong>${name}</strong>

                    <span>
                        ${mpn} • ${manufacturer}
                    </span>

                    <small>
                        ${category} • Added ${date}
                    </small>
                </div>

                <div class="recent-item-stock">
                    <strong>
                        ${stock.toLocaleString("en-PH")}
                    </strong>

                    <span class="status-badge ${getStatusClass(status)}">
                        ${status}
                    </span>
                </div>
            </div>
        `;
    }).join("");
}

/*
|--------------------------------------------------------------------------
| Dashboard Stock Alerts
|--------------------------------------------------------------------------
*/

function renderDashboardAlerts() {
    const container = getElement(
        DASHBOARD_ELEMENTS.dashboardAlerts
    );

    if (!container) return;

    const inventory = getInventoryData();

    const alertComponents = inventory.filter(component => {
        const status = getStockStatus(
            component.stock,
            component.minStock
        );

        return (
            status === "Low Stock" ||
            status === "Out of Stock"
        );
    });

    if (alertComponents.length === 0) {
        container.innerHTML = `
            <p class="empty-message">
                No stock alerts. All components have sufficient stock.
            </p>
        `;

        return;
    }

    alertComponents.sort((first, second) => {
        const firstStock = Number(first.stock) || 0;
        const secondStock = Number(second.stock) || 0;

        return firstStock - secondStock;
    });

    container.innerHTML = alertComponents.map(component => {
        const name = escapeHTML(
            component.name ||
            component.mpn ||
            "Unnamed Component"
        );

        const mpn = escapeHTML(
            component.mpn || "No MPN"
        );

        const stock = Number(component.stock) || 0;

        const minimumStock = Number(component.minStock) || 0;

        const status = getStockStatus(
            stock,
            minimumStock
        );

        const statusClass = getStatusClass(status);

        const message = status === "Out of Stock"
            ? "This component is out of stock."
            : "Stock has reached the minimum threshold.";

        return `
            <div class="alert-item">
                <div class="alert-item-icon ${statusClass}">
                    <i data-lucide="alert-triangle"></i>
                </div>

                <div class="alert-item-info">
                    <strong>${name}</strong>

                    <span>${mpn}</span>

                    <small>${message}</small>
                </div>

                <div class="alert-item-stock">
                    <strong>${stock}</strong>

                    <span>Min: ${minimumStock}</span>
                </div>
            </div>
        `;
    }).join("");

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/*
|--------------------------------------------------------------------------
| Refresh Dashboard
|--------------------------------------------------------------------------
| Call this function whenever inventory data changes.
|--------------------------------------------------------------------------
*/

export function refreshDashboard() {
    renderDashboardStatistics();
    renderRecentInventory();
    renderDashboardAlerts();

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/*
|--------------------------------------------------------------------------
| Initialize Dashboard
|--------------------------------------------------------------------------
*/

export function initializeDashboard() {
    const dashboard = getElement("#dashboard");

    if (!dashboard) {
        console.warn(
            "Dashboard initialization skipped: #dashboard was not found."
        );

        return false;
    }

    refreshDashboard();

    console.log(
        "Dashboard module initialized successfully."
    );

    return true;
}
