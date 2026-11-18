
import { appState } from "./core/state.js";
import { initializeNavigation } from "./core/navigation.js";
import { formatCurrency } from "./core/utilities.js";

import { initializeInventory } from "./modules/inventory.js";
import { initializeDashboard } from "./modules/dashboard.js";
import { initializeBOM } from "./modules/bom.js";
import { initializePinout } from "./modules/pinout.js";
import { initializeAnalytics } from "./modules/analytics.js";
import { initializeSettings } from "./modules/settings.js";

import { initializeImportExport } from "./services/import-export.js";
import { initializeNotifications } from "./services/notifications.js";
import { initializeReports } from "./services/reports.js";

const APP_NAME = "PCB Component BOM & Inventory Manager";

function initializeApplication() {
    console.log(`${APP_NAME} is initializing...`);

    try {
        const navigation = initializeNavigation();

        if (!navigation) {
            throw new Error("Navigation initialization failed.");
        }

        initializeInventory();
        initializeDashboard();
        initializeBOM();
        initializePinout();
        initializeAnalytics();
        initializeSettings();
        initializeImportExport();
        initializeNotifications();
        initializeReports();

        window.PCBManager = {
            name: APP_NAME,
            state: appState,
            navigation,
            formatCurrency,

            getInventory() {
                return [...appState.inventory];
            },

            getProjects() {
                return [...appState.projects];
            },

            getSettings() {
                return { ...appState.settings };
            },

            getProfile() {
                return { ...appState.profile };
            },

            refreshAnalytics() {
                return import("./modules/analytics.js").then(module => {
                    module.refreshAnalytics();
                });
            },

            refreshPinout() {
                return import("./modules/pinout.js").then(module => {
                    module.refreshPinout();
                });
            },

            refreshNotifications() {
                return import("./services/notifications.js").then(module => {
                    module.refreshNotifications();
                });
            },

            exportInventoryReport() {
                return import("./services/reports.js").then(module => {
                    module.exportInventoryReportCSV();
                });
            },

            exportMovementReport() {
                return import("./services/reports.js").then(module => {
                    module.exportStockMovementReportCSV();
                });
            },

            printInventoryReport() {
                return import("./services/reports.js").then(module => {
                    module.printInventoryReport();
                });
            }
        };

        console.log(`${APP_NAME} initialized successfully.`);
    } catch (error) {
        console.error("Application initialization failed:", error);

        alert(
            "The application encountered an error during startup. " +
            "Please check the browser console."
        );
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApplication,
        { once: true }
    );
} else {
    initializeApplication();
}
