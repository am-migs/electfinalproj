
import { appState } from "./core/state.js";

import { initializeNavigation } from "./core/navigation.js";

import { formatCurrency } from "./core/utilities.js";

import { initializeInventory } from "./modules/inventory.js";

import { initializeDashboard } from "./modules/dashboard.js";

/*
|--------------------------------------------------------------------------
| Application Configuration
|--------------------------------------------------------------------------
*/

const APP_NAME = "PCB Component BOM & Inventory Manager";

/*
|--------------------------------------------------------------------------
| Initialize Application
|--------------------------------------------------------------------------
*/

function initializeApplication() {
    console.log(`${APP_NAME} is initializing...`);

    try {
        // Initialize navigation.
        const navigation = initializeNavigation();

        if (!navigation) {
            throw new Error(
                "Navigation initialization failed."
            );
        }

        // Initialize inventory functionality.
        initializeInventory();

        // Initialize dashboard displays.
        initializeDashboard();

        /*
        |--------------------------------------------------------------------------
        | Global Application Access
        |--------------------------------------------------------------------------
        | Provides convenient access to application information
        | through the browser console during development.
        |--------------------------------------------------------------------------
        */

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

        console.log(
            `${APP_NAME} initialized successfully.`
        );

    } catch (error) {
        console.error(
            "Application initialization failed:",
            error
        );

        alert(
            "The application encountered an error during startup. " +
            "Please check the browser console."
        );
    }
}

/*
|--------------------------------------------------------------------------
| DOM Ready Handler
|--------------------------------------------------------------------------
*/

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApplication,
        { once: true }
    );
} else {
    initializeApplication();
}
