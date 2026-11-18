
import { appState } from "./core/state.js";
import { initializeNavigation } from "./core/navigation.js";
import { formatCurrency } from "./core/utilities.js";
import { initializeInventory } from "./modules/inventory.js";

// =====================================================
// APPLICATION CONFIGURATION
// =====================================================

const APP_NAME = "PCB Component BOM & Inventory Manager";

// =====================================================
// APPLICATION INITIALIZATION
// =====================================================

function initializeApplication() {
    console.log(`${APP_NAME} is initializing...`);

    try {
        // Initialize navigation.
        const navigation = initializeNavigation();

        if (!navigation) {
            throw new Error("Navigation initialization failed.");
        }

        // Initialize Inventory Catalog.
        initializeInventory();

        // Shared application interface.
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

// =====================================================
// START APPLICATION
// =====================================================

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApplication,
        { once: true }
    );
} else {
    initializeApplication();
}
