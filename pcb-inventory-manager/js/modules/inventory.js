
import { appState, updateState } from "../core/state.js";

import {
    generateID,
    formatCurrency,
    escapeHTML,
    getStockStatus
} from "../core/utilities.js";

import { refreshDashboard } from "./dashboard.js";

/*
|--------------------------------------------------------------------------
| INVENTORY CONFIGURATION
|--------------------------------------------------------------------------
*/

const LEGACY_STORAGE_KEY = "pcbManagerInventory";

const CATEGORIES = [
    "Microcontrollers",
    "Resistors",
    "Capacitors",
    "Connectors",
    "Sensors",
    "ICs",
    "Diodes",
    "Transistors",
    "Inductors",
    "Other"
];

const PACKAGES = [
    "SMD",
    "Through-Hole",
    "BGA",
    "QFN",
    "SOIC",
    "DIP",
    "Other"
];

let editingComponentId = null;
let inventoryEventsInitialized = false;

/*
|--------------------------------------------------------------------------
| DATA NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizeComponent(component) {
    return {
        id: component.id || generateID("CMP"),
        mpn: String(component.mpn || "").trim(),
        name: String(component.name || "").trim(),
        manufacturer: String(component.manufacturer || "").trim(),
        category: String(component.category || "Other"),
        packageType: String(component.packageType || "Other"),
        footprint: String(component.footprint || ""),
        location: String(component.location || ""),
        unitPrice: Number(component.unitPrice) || 0,
        stock: Number(component.stock) || 0,
        minStock: Number(component.minStock) || 0,
        datasheet: String(component.datasheet || ""),
        createdAt: component.createdAt || new Date().toISOString(),
        updatedAt: component.updatedAt || new Date().toISOString()
    };
}

/*
|--------------------------------------------------------------------------
| LEGACY DATA MIGRATION
|--------------------------------------------------------------------------
| Transfers data from the original LocalStorage key to the
| modular application's centralized state.
|--------------------------------------------------------------------------
*/

function migrateLegacyInventory() {
    if (appState.inventory.length > 0) return;

    try {
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);

        if (!legacyData) return;

        const parsedData = JSON.parse(legacyData);

        if (!Array.isArray(parsedData)) return;

        appState.inventory = parsedData.map(normalizeComponent);

        updateState("inventory", appState.inventory);

        console.info(
            `Migrated ${appState.inventory.length} inventory records.`
        );

    } catch (error) {
        console.error("Inventory migration failed:", error);
    }
}

/*
|--------------------------------------------------------------------------
| SAVE INVENTORY
|--------------------------------------------------------------------------
*/

function saveInventory() {
    return updateState("inventory", appState.inventory);
}

/*
|--------------------------------------------------------------------------
| INVENTORY HELPERS
|--------------------------------------------------------------------------
*/

function getComponentById(id) {
    return appState.inventory.find(
        component => component.id === id
    );
}

function getSafeDatasheetURL(url) {
    if (!url) return "";

    try {
        const parsedURL = new URL(url);

        if (
            parsedURL.protocol !== "http:" &&
            parsedURL.protocol !== "https:"
        ) {
            return "";
        }

        return parsedURL.href;

    } catch {
        return "";
    }
}

function getCurrentCurrency() {
    return appState.settings?.currency || "PHP";
}

function getComponentStatus(component) {
    return getStockStatus(
        component.stock,
        component.minStock
    );
}

/*
|--------------------------------------------------------------------------
| STOCK MOVEMENT HISTORY
|--------------------------------------------------------------------------
*/

function recordStockMovement(
    component,
    previousStock,
    newStock,
    reason
) {
    const movement = {
        id: generateID("MOV"),
        componentId: component.id,
        mpn: component.mpn,
        componentName: component.name,
        previousStock,
        newStock,
        quantityChanged: newStock - previousStock,
        reason,
        date: new Date().toISOString()
    };

    const previousMovements = [...appState.stockMovements];

    appState.stockMovements = [
        movement,
        ...previousMovements
    ].slice(0, 500);

    if (!updateState("stockMovements", appState.stockMovements)) {
        appState.stockMovements = previousMovements;

        console.error("Unable to save stock movement history.");
    }
}

/*
|--------------------------------------------------------------------------
| COMPONENT MODAL CREATION
|--------------------------------------------------------------------------
*/

function createComponentModal() {
    if (document.getElementById("component-modal")) return;

    const modal = document.createElement("div");

    modal.id = "component-modal";
    modal.className = "modal-overlay";
    modal.hidden = true;

    modal.innerHTML = `
        <div class="modal"
             role="dialog"
             aria-modal="true"
             aria-labelledby="component-modal-title">

            <div class="modal-header">
                <div>
                    <h2 id="component-modal-title">Add Component</h2>
                    <p>Enter the component information below.</p>
                </div>

                <button type="button"
                        class="modal-close"
                        id="close-component-modal"
                        aria-label="Close modal">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <form id="component-form">

                <h3 class="modal-section-title">
                    Component Information
                </h3>

                <div class="form-grid">

                    <div class="form-group">
                        <label for="component-mpn">
                            Manufacturer Part Number
                            <span class="form-required">*</span>
                        </label>

                        <input id="component-mpn"
                               name="mpn"
                               type="text"
                               placeholder="e.g. ATmega328P-PU"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="component-name">
                            Component Name
                            <span class="form-required">*</span>
                        </label>

                        <input id="component-name"
                               name="name"
                               type="text"
                               placeholder="e.g. 8-bit Microcontroller"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="component-manufacturer">
                            Manufacturer
                            <span class="form-required">*</span>
                        </label>

                        <input id="component-manufacturer"
                               name="manufacturer"
                               type="text"
                               placeholder="e.g. Microchip"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="component-category">Category</label>

                        <select id="component-category"
                                name="category"
                                required>
                            ${CATEGORIES.map(category => `
                                <option value="${escapeHTML(category)}">
                                    ${escapeHTML(category)}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="component-package">Package</label>

                        <select id="component-package"
                                name="packageType"
                                required>
                            ${PACKAGES.map(packageType => `
                                <option value="${escapeHTML(packageType)}">
                                    ${escapeHTML(packageType)}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="component-footprint">Footprint</label>

                        <input id="component-footprint"
                               name="footprint"
                               type="text"
                               placeholder="e.g. DIP-28">
                    </div>

                    <div class="form-group">
                        <label for="component-location">
                            Storage Location
                        </label>

                        <input id="component-location"
                               name="location"
                               type="text"
                               placeholder="e.g. Drawer A1">
                    </div>

                    <div class="form-group">
                        <label for="component-price">
                            Unit Price (PHP)
                            <span class="form-required">*</span>
                        </label>

                        <input id="component-price"
                               name="unitPrice"
                               type="number"
                               min="0"
                               step="0.01"
                               placeholder="0.00"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="component-stock">
                            Stock Quantity
                            <span class="form-required">*</span>
                        </label>

                        <input id="component-stock"
                               name="stock"
                               type="number"
                               min="0"
                               step="1"
                               value="0"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="component-min-stock">
                            Minimum Stock Level
                        </label>

                        <input id="component-min-stock"
                               name="minStock"
                               type="number"
                               min="0"
                               step="1"
                               value="5"
                               required>
                    </div>

                    <div class="form-group full-width">
                        <label for="component-datasheet">
                            Datasheet URL
                        </label>

                        <input id="component-datasheet"
                               name="datasheet"
                               type="url"
                               placeholder="https://example.com/datasheet.pdf">

                        <small>
                            Enter a valid HTTP or HTTPS link.
                        </small>
                    </div>

                </div>

                <div class="modal-footer">
                    <div class="button-group">

                        <button type="button"
                                class="btn btn-secondary"
                                id="cancel-component">
                            Cancel
                        </button>

                        <button type="submit"
                                class="btn btn-primary"
                                id="save-component">
                            Save Component
                        </button>

                    </div>
                </div>

            </form>
        </div>
    `;

    document.body.appendChild(modal);

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/*
|--------------------------------------------------------------------------
| MODAL CONTROLS
|--------------------------------------------------------------------------
*/

function openComponentModal(component = null) {
    const modal = document.getElementById("component-modal");
    const form = document.getElementById("component-form");
    const title = document.getElementById("component-modal-title");
    const saveButton = document.getElementById("save-component");

    if (!modal || !form) return;

    form.reset();

    editingComponentId = component?.id || null;

    title.textContent = component
        ? "Edit Component"
        : "Add Component";

    saveButton.textContent = component
        ? "Update Component"
        : "Save Component";

    if (component) {
        document.getElementById("component-mpn").value =
            component.mpn;

        document.getElementById("component-name").value =
            component.name;

        document.getElementById("component-manufacturer").value =
            component.manufacturer;

        document.getElementById("component-category").value =
            component.category;

        document.getElementById("component-package").value =
            component.packageType;

        document.getElementById("component-footprint").value =
            component.footprint;

        document.getElementById("component-location").value =
            component.location;

        document.getElementById("component-price").value =
            component.unitPrice;

        document.getElementById("component-stock").value =
            component.stock;

        document.getElementById("component-min-stock").value =
            component.minStock;

        document.getElementById("component-datasheet").value =
            component.datasheet;
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    document.getElementById("component-mpn").focus();
}

function closeComponentModal() {
    const modal = document.getElementById("component-modal");

    if (!modal) return;

    modal.hidden = true;
    document.body.style.overflow = "";

    editingComponentId = null;
}

/*
|--------------------------------------------------------------------------
| COMPONENT FORM VALIDATION
|--------------------------------------------------------------------------
*/

function validateComponentData(componentData) {
    if (
        !componentData.mpn ||
        !componentData.name ||
        !componentData.manufacturer
    ) {
        alert("Please complete all required component information.");
        return false;
    }

    if (
        !Number.isFinite(componentData.unitPrice) ||
        componentData.unitPrice < 0
    ) {
        alert("Please enter a valid non-negative unit price.");
        return false;
    }

    if (
        !Number.isInteger(componentData.stock) ||
        componentData.stock < 0
    ) {
        alert("Stock quantity must be a non-negative whole number.");
        return false;
    }

    if (
        !Number.isInteger(componentData.minStock) ||
        componentData.minStock < 0
    ) {
        alert("Minimum stock must be a non-negative whole number.");
        return false;
    }

    const safeDatasheet = getSafeDatasheetURL(
        componentData.datasheet
    );

    if (componentData.datasheet && !safeDatasheet) {
        alert(
            "Please provide a valid HTTP or HTTPS datasheet URL."
        );

        return false;
    }

    componentData.datasheet = safeDatasheet;

    const duplicate = appState.inventory.some(component =>
        component.mpn.toLowerCase() === componentData.mpn.toLowerCase() &&
        component.id !== editingComponentId
    );

    if (duplicate) {
        alert("A component with this MPN already exists.");
        return false;
    }

    return true;
}

/*
|--------------------------------------------------------------------------
| SAVE COMPONENT
|--------------------------------------------------------------------------
*/

function handleComponentSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    const wasEditing = Boolean(editingComponentId);

    const previousComponent = wasEditing
        ? getComponentById(editingComponentId)
        : null;

    if (wasEditing && !previousComponent) {
        alert("The component could not be found.");
        return;
    }

    const formData = new FormData(form);

    const componentData = {
        mpn: String(formData.get("mpn") || "").trim(),
        name: String(formData.get("name") || "").trim(),
        manufacturer: String(
            formData.get("manufacturer") || ""
        ).trim(),

        category: String(formData.get("category") || "Other"),
        packageType: String(
            formData.get("packageType") || "Other"
        ),

        footprint: String(
            formData.get("footprint") || ""
        ).trim(),

        location: String(
            formData.get("location") || ""
        ).trim(),

        unitPrice: Number(formData.get("unitPrice")),
        stock: Number(formData.get("stock")),
        minStock: Number(formData.get("minStock")),

        datasheet: String(
            formData.get("datasheet") || ""
        ).trim()
    };

    if (!validateComponentData(componentData)) return;

    const now = new Date().toISOString();

    const previousInventory = [...appState.inventory];

    let savedComponent;

    if (wasEditing) {
        savedComponent = {
            ...previousComponent,
            ...componentData,
            updatedAt: now
        };

        appState.inventory = appState.inventory.map(component =>
            component.id === editingComponentId
                ? savedComponent
                : component
        );

    } else {
        savedComponent = {
            id: generateID("CMP"),
            ...componentData,
            createdAt: now,
            updatedAt: now
        };

        appState.inventory = [
            savedComponent,
            ...appState.inventory
        ];
    }

    if (!saveInventory()) {
        appState.inventory = previousInventory;

        alert(
            "Unable to save inventory. Check your browser storage."
        );

        return;
    }

    if (
        wasEditing &&
        previousComponent.stock !== savedComponent.stock
    ) {
        recordStockMovement(
            savedComponent,
            previousComponent.stock,
            savedComponent.stock,
            "Manual component update"
        );

    } else if (!wasEditing && savedComponent.stock > 0) {
        recordStockMovement(
            savedComponent,
            0,
            savedComponent.stock,
            "Initial inventory entry"
        );
    }

    closeComponentModal();

    refreshInventory();

    alert(
        wasEditing
            ? "Component updated successfully!"
            : "Component added successfully!"
    );
}

/*
|--------------------------------------------------------------------------
| INVENTORY TABLE
|--------------------------------------------------------------------------
*/

function renderInventory() {
    const tableBody = document.getElementById(
        "inventory-table-body"
    );

    if (!tableBody) return;

    const searchInput = document.getElementById(
        "inventory-search"
    );

    const categoryFilter = document.getElementById(
        "category-filter"
    );

    const packageFilter = document.getElementById(
        "package-filter"
    );

    const searchTerm = (
        searchInput?.value || ""
    ).trim().toLowerCase();

    const selectedCategory = categoryFilter?.value || "";
    const selectedPackage = packageFilter?.value || "";

    const filteredInventory = appState.inventory.filter(component => {
        const matchesSearch = [
            component.mpn,
            component.name,
            component.manufacturer,
            component.location
        ].some(value =>
            String(value || "").toLowerCase().includes(searchTerm)
        );

        const matchesCategory =
            !selectedCategory ||
            component.category === selectedCategory;

        const matchesPackage =
            !selectedPackage ||
            component.packageType === selectedPackage;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesPackage
        );
    });

    const countElement = document.getElementById(
        "inventory-count"
    );

    if (countElement) {
        countElement.textContent =
            `Showing ${filteredInventory.length} of ${appState.inventory.length} components`;
    }

    if (filteredInventory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    No components found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = filteredInventory.map(component => {
        const status = getComponentStatus(component);

        const statusClass = status
            .toLowerCase()
            .replaceAll(" ", "-");

        const datasheetURL = getSafeDatasheetURL(
            component.datasheet
        );

        return `
            <tr>
                <td>
                    <div class="component-name">
                        <strong>
                            ${escapeHTML(component.mpn)}
                        </strong>

                        <span>
                            ${escapeHTML(component.name)}
                        </span>
                    </div>
                </td>

                <td>
                    ${escapeHTML(component.manufacturer)}
                </td>

                <td>
                    ${escapeHTML(component.category)}
                </td>

                <td>
                    ${escapeHTML(component.packageType)}

                    ${
                        component.footprint
                            ? `
                                <span class="table-subtext">
                                    ${escapeHTML(component.footprint)}
                                </span>
                            `
                            : ""
                    }
                </td>

                <td>
                    ${escapeHTML(component.location || "—")}
                </td>

                <td>
                    ${formatCurrency(
                        component.unitPrice,
                        getCurrentCurrency()
                    )}
                </td>

                <td>
                    <strong>${component.stock}</strong>
                </td>

                <td>
                    <span class="status-badge ${statusClass}">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>
                    <div class="table-actions">

                        ${
                            datasheetURL
                                ? `
                                    <a class="action-button view"
                                       href="${escapeHTML(datasheetURL)}"
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       title="View datasheet">
                                        <i data-lucide="file-text"></i>
                                    </a>
                                `
                                : ""
                        }

                        <button type="button"
                                class="action-button stock"
                                data-action="stock"
                                data-id="${escapeHTML(component.id)}"
                                title="Adjust stock">
                            <i data-lucide="package-plus"></i>
                        </button>

                        <button type="button"
                                class="action-button edit"
                                data-action="edit"
                                data-id="${escapeHTML(component.id)}"
                                title="Edit component">
                            <i data-lucide="pencil"></i>
                        </button>

                        <button type="button"
                                class="action-button delete"
                                data-action="delete"
                                data-id="${escapeHTML(component.id)}"
                                title="Delete component">
                            <i data-lucide="trash-2"></i>
                        </button>

                    </div>
                </td>
            </tr>
        `;
    }).join("");

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/*
|--------------------------------------------------------------------------
| STOCK ADJUSTMENT
|--------------------------------------------------------------------------
*/

function adjustStock(componentId) {
    const component = getComponentById(componentId);

    if (!component) return;

    const input = prompt(
        `Current stock: ${component.stock}\n\n` +
        "Enter the new total stock quantity:"
    );

    if (input === null) return;

    if (input.trim() === "") {
        alert("Please enter a stock quantity.");
        return;
    }

    const newStock = Number(input);

    if (!Number.isInteger(newStock) || newStock < 0) {
        alert(
            "Please enter a valid non-negative whole number."
        );

        return;
    }

    const previousStock = component.stock;

    if (previousStock === newStock) return;

    const previousUpdatedAt = component.updatedAt;

    component.stock = newStock;
    component.updatedAt = new Date().toISOString();

    if (!saveInventory()) {
        component.stock = previousStock;
        component.updatedAt = previousUpdatedAt;

        alert("Unable to save the stock adjustment.");

        return;
    }

    recordStockMovement(
        component,
        previousStock,
        newStock,
        "Manual stock adjustment"
    );

    refreshInventory();
}

/*
|--------------------------------------------------------------------------
| DELETE COMPONENT
|--------------------------------------------------------------------------
*/

function deleteComponent(componentId) {
    const component = getComponentById(componentId);

    if (!component) return;

    const confirmed = confirm(
        `Are you sure you want to delete ${component.mpn}?\n\n` +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    const previousInventory = [...appState.inventory];

    appState.inventory = appState.inventory.filter(
        item => item.id !== componentId
    );

    if (!saveInventory()) {
        appState.inventory = previousInventory;

        alert("Unable to delete the component.");

        return;
    }

    refreshInventory();

    alert("Component deleted successfully.");
}

/*
|--------------------------------------------------------------------------
| INVENTORY EVENT LISTENERS
|--------------------------------------------------------------------------
*/

function initializeInventoryEvents() {
    if (inventoryEventsInitialized) return;

    const addButton = document.getElementById(
        "add-component-button"
    );

    const form = document.getElementById(
        "component-form"
    );

    const modal = document.getElementById(
        "component-modal"
    );

    addButton?.addEventListener("click", () => {
        openComponentModal();
    });

    form?.addEventListener(
        "submit",
        handleComponentSubmit
    );

    document.getElementById("close-component-modal")
        ?.addEventListener("click", closeComponentModal);

    document.getElementById("cancel-component")
        ?.addEventListener("click", closeComponentModal);

    modal?.addEventListener("click", event => {
        if (event.target === modal) {
            closeComponentModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            modal &&
            !modal.hidden
        ) {
            closeComponentModal();
        }
    });

    document.getElementById("inventory-search")
        ?.addEventListener("input", renderInventory);

    document.getElementById("category-filter")
        ?.addEventListener("change", renderInventory);

    document.getElementById("package-filter")
        ?.addEventListener("change", renderInventory);

    document.getElementById("inventory-table-body")
        ?.addEventListener("click", event => {
            const button = event.target.closest(
                "[data-action]"
            );

            if (!button) return;

            const action = button.dataset.action;
            const componentId = button.dataset.id;

            if (action === "edit") {
                const component = getComponentById(componentId);

                if (component) {
                    openComponentModal(component);
                }
            }

            if (action === "stock") {
                adjustStock(componentId);
            }

            if (action === "delete") {
                deleteComponent(componentId);
            }
        });

    inventoryEventsInitialized = true;
}

/*
|--------------------------------------------------------------------------
| MODULE INITIALIZATION
|--------------------------------------------------------------------------
*/

export function initializeInventory() {
    migrateLegacyInventory();

    appState.inventory = appState.inventory.map(
        normalizeComponent
    );

    if (!saveInventory()) {
        console.warn(
            "Inventory initialization could not save normalized data."
        );
    }

    createComponentModal();

    initializeInventoryEvents();

    renderInventory();

    console.log("Inventory module initialized successfully.");

    return true;
}

/*
|--------------------------------------------------------------------------
| REFRESH INVENTORY
|--------------------------------------------------------------------------
| Refreshes the inventory table and the separate dashboard module.
|--------------------------------------------------------------------------
*/

export function refreshInventory() {
    renderInventory();

    refreshDashboard();
}

/*
|--------------------------------------------------------------------------
| PUBLIC INVENTORY ACCESS
|--------------------------------------------------------------------------
*/

export function getInventory() {
    return [...appState.inventory];
}
