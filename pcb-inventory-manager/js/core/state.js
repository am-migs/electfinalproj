
import { loadData, saveData } from "./storage.js";

export const appState = {
    inventory: loadData("inventory", []),

    projects: loadData("projects", []),

    stockMovements: loadData("stockMovements", []),

    notifications: loadData("notifications", []),

    profile: loadData("profile", {
        name: "Administrator",
        email: "",
        role: "Administrator",
        initials: "AD"
    }),

    settings: loadData("settings", {
        currency: "PHP",
        minimumStockAlerts: true,
        notificationsEnabled: true,
        theme: "light"
    })
};

export function updateState(section, data) {
    if (!(section in appState)) {
        console.error(`Unknown application state: ${section}`);
        return false;
    }

    appState[section] = data;

    return saveData(section, data);
}

export function getState(section) {
    return appState[section];
}

export function resetState() {
    appState.inventory = [];
    appState.projects = [];
    appState.stockMovements = [];
    appState.notifications = [];

    updateState("inventory", appState.inventory);
    updateState("projects", appState.projects);
    updateState("stockMovements", appState.stockMovements);
    updateState("notifications", appState.notifications);
}
