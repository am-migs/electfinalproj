
/* =====================================================
   PCB COMPONENT BOM & INVENTORY MANAGER
   Main JavaScript File
   ===================================================== */


/* =====================================================
   1. PAGE CONFIGURATION
   ===================================================== */

const pageInformation = {
    dashboard: {
        title: "Dashboard"
    },
    inventory: {
        title: "Inventory Catalog"
    },
    bom: {
        title: "BOM Manager"
    },
    pinout: {
        title: "Pinout Inspector"
    },
    analytics: {
        title: "Analytics"
    }
};


/* =====================================================
   2. GET HTML ELEMENTS
   ===================================================== */

const navigationButtons = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

const pageTitle = document.getElementById("page-title");

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");


/* =====================================================
   3. SIDEBAR STATE
   ===================================================== */

let sidebarPinnedOpen = false;
let suppressSidebarHover = false;


/* =====================================================
   4. SIDEBAR EXPANSION ON HOVER
   ===================================================== */

sidebar.addEventListener("mouseenter", () => {
    if (!suppressSidebarHover) {
        sidebar.classList.add("sidebar-expanded");
    }
});

sidebar.addEventListener("mouseleave", () => {
    suppressSidebarHover = false;

    if (!sidebarPinnedOpen) {
        sidebar.classList.remove("sidebar-expanded");
    }
});


/* =====================================================
   5. SIDEBAR TOGGLE BUTTON
   ===================================================== */

sidebarToggle.addEventListener("click", () => {
    sidebarPinnedOpen = !sidebarPinnedOpen;

    suppressSidebarHover = false;

    sidebar.classList.toggle(
        "sidebar-expanded",
        sidebarPinnedOpen
    );

    sidebarToggle.setAttribute(
        "aria-expanded",
        sidebarPinnedOpen
    );
});


/* =====================================================
   6. PAGE NAVIGATION
   ===================================================== */

function navigateToPage(pageId) {

    if (!pageInformation[pageId]) {
        console.error("Page not found:", pageId);
        return;
    }

    navigationButtons.forEach(button => {
        button.classList.remove("active");
    });

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const selectedButton = document.querySelector(
        `.nav-link[data-page="${pageId}"]`
    );

    const selectedPage = document.getElementById(pageId);

    if (selectedButton) {
        selectedButton.classList.add("active");
    }

    if (selectedPage) {
        selectedPage.classList.add("active");
    }

    pageTitle.textContent = pageInformation[pageId].title;

    // Collapse sidebar after navigation.
    sidebarPinnedOpen = false;
    suppressSidebarHover = true;

    sidebar.classList.remove("sidebar-expanded");

    sidebarToggle.setAttribute("aria-expanded", "false");
}


navigationButtons.forEach(button => {
    button.addEventListener("click", () => {
        navigateToPage(button.dataset.page);
    });
});


/* =====================================================
   7. PHILIPPINE PESO FORMATTER
   ===================================================== */

const pesoFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});


function formatPHP(amount) {
    return pesoFormatter.format(Number(amount) || 0);
}


/* =====================================================
   8. INVENTORY STORAGE CONFIGURATION
   ===================================================== */

const STORAGE_KEY = "pcbManagerInventory";

let inventory = [];

let editingComponentId = null;


/* =====================================================
   9. INVENTORY HELPER FUNCTIONS
   ===================================================== */

// Generate unique component ID.
function generateId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}


// Safely display user-provided text in HTML.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];
    });
}


// Validate datasheet URLs.
function getSafeURL(value) {
    if (!value) return null;

    try {
        const url = new URL(value);

        if (
            url.protocol === "https:" ||
            url.protocol === "http:"
        ) {
            return url.href;
        }
    } catch (error) {
        return null;
    }

    return null;
}


// Determine component stock status.
function getStockStatus(component) {
    const quantity = Number(component.stock);
    const minimum = Number(component.minStock);

    if (quantity <= 0) {
        return {
            label: "Out of Stock",
            className: "status-out"
        };
    }

    if (quantity <= minimum) {
        return {
            label: "Low Stock",
            className: "status-low"
        };
    }

    return {
        label: "In Stock",
        className: "status-available"
    };
}


/* =====================================================
   10. LOAD AND SAVE INVENTORY
   ===================================================== */

function loadInventory() {
    try {
        const savedInventory = localStorage.getItem(STORAGE_KEY);

        if (savedInventory) {
            const parsedInventory = JSON.parse(savedInventory);

            inventory = Array.isArray(parsedInventory)
                ? parsedInventory
                : [];
        } else {
            inventory = [];
        }

    } catch (error) {
        console.error("Unable to load inventory:", error);
        inventory = [];
    }
}


function saveInventory() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(inventory)
        );
    } catch (error) {
        console.error("Unable to save inventory:", error);

        alert(
            "Your inventory could not be saved. " +
            "Check your browser storage settings."
        );
    }
}


/* =====================================================
   11. INVENTORY ELEMENTS
   ===================================================== */

const inventoryTableBody = document.getElementById(
    "inventory-table-body"
);

const inventorySearch = document.getElementById(
    "inventory-search"
);

const categoryFilter = document.getElementById(
    "category-filter"
);

const packageFilter = document.getElementById(
    "package-filter"
);

const addComponentButton = document.getElementById(
    "add-component-button"
);

const totalComponents = document.getElementById(
    "total-components"
);

const totalUnits = document.getElementById(
    "total-units"
);

const lowStock = document.getElementById(
    "low-stock"
);

const inventoryValue = document.getElementById(
    "inventory-value"
);

const recentInventory = document.getElementById(
    "recent-inventory"
);

const dashboardAlerts = document.getElementById(
    "dashboard-alerts"
);


/* =====================================================
   12. CREATE COMPONENT MODAL
   ===================================================== */

function createComponentModal() {

    const modalHTML = `
        <div class="modal-overlay" id="component-modal" hidden>
            <div
                class="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="component-modal-title"
            >

                <div class="modal-header">
                    <div>
                        <h2 id="component-modal-title">
                            Add Component
                        </h2>

                        <p>
                            Enter the component information below.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="modal-close"
                        id="close-component-modal"
                        aria-label="Close modal"
                    >
                        <i data-lucide="x"></i>
                    </button>
                </div>


                <form id="component-form">

                    <h3 class="modal-section-title">
                        Component Information
                    </h3>

                    <div class="form-row">

                        <div class="form-group">
                            <label for="component-mpn">
                                Manufacturer Part Number
                                <span class="form-required">*</span>
                            </label>

                            <input
                                type="text"
                                id="component-mpn"
                                placeholder="e.g. ATmega328P"
                                maxlength="80"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="component-name">
                                Component Name
                                <span class="form-required">*</span>
                            </label>

                            <input
                                type="text"
                                id="component-name"
                                placeholder="e.g. 8-bit Microcontroller"
                                maxlength="100"
                                required
                            >
                        </div>

                    </div>


                    <div class="form-row">

                        <div class="form-group">
                            <label for="component-manufacturer">
                                Manufacturer
                                <span class="form-required">*</span>
                            </label>

                            <input
                                type="text"
                                id="component-manufacturer"
                                placeholder="e.g. Microchip"
                                maxlength="80"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="component-category">
                                Category
                                <span class="form-required">*</span>
                            </label>

                            <select id="component-category" required>
                                <option value="">Select category</option>
                                <option value="Microcontrollers">Microcontrollers</option>
                                <option value="Resistors">Resistors</option>
                                <option value="Capacitors">Capacitors</option>
                                <option value="Connectors">Connectors</option>
                                <option value="Sensors">Sensors</option>
                                <option value="ICs">ICs</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                    </div>


                    <h3 class="modal-section-title">
                        Package and Storage
                    </h3>

                    <div class="form-row">

                        <div class="form-group">
                            <label for="component-package">
                                Package Type
                                <span class="form-required">*</span>
                            </label>

                            <select id="component-package" required>
                                <option value="">Select package</option>
                                <option value="SMD">SMD</option>
                                <option value="Through-Hole">Through-Hole</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="component-footprint">
                                Footprint
                            </label>

                            <input
                                type="text"
                                id="component-footprint"
                                placeholder="e.g. DIP-28, SOIC-8"
                                maxlength="60"
                            >
                        </div>

                    </div>


                    <div class="form-group">
                        <label for="component-location">
                            Storage Location
                            <span class="form-required">*</span>
                        </label>

                        <input
                            type="text"
                            id="component-location"
                            placeholder="e.g. Drawer A1, Box 03"
                            maxlength="80"
                            required
                        >
                    </div>


                    <h3 class="modal-section-title">
                        Stock and Pricing
                    </h3>

                    <div class="form-row">

                        <div class="form-group">
                            <label for="component-price">
                                Unit Price (PHP)
                                <span class="form-required">*</span>
                            </label>

                            <input
                                type="number"
                                id="component-price"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                required
                            >
                        </div>

                        <div class="form-group">
                            <label for="component-stock">
                                Stock Quantity
                                <span class="form-required">*</span>
                            </label>

                            <input
                                type="number"
                                id="component-stock"
                                min="0"
                                step="1"
                                placeholder="0"
                                required
                            >
                        </div>

                    </div>


                    <div class="form-group">
                        <label for="component-min-stock">
                            Minimum Stock Level
                            <span class="form-required">*</span>
                        </label>

                        <input
                            type="number"
                            id="component-min-stock"
                            min="0"
                            step="1"
                            value="5"
                            required
                        >

                        <small>
                            The component will be marked Low Stock
                            when its quantity reaches this value.
                        </small>
                    </div>


                    <h3 class="modal-section-title">
                        Additional Information
                    </h3>

                    <div class="form-group">
                        <label for="component-datasheet">
                            Datasheet URL
                        </label>

                        <input
                            type="url"
                            id="component-datasheet"
                            placeholder="https://example.com/datasheet.pdf"
                            maxlength="500"
                        >

                        <small>
                            Optional link to the component datasheet.
                        </small>
                    </div>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="outline-button"
                            id="cancel-component"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="primary-button"
                            id="save-component-button"
                        >
                            <i data-lucide="save"></i>
                            Save Component
                        </button>

                    </div>

                </form>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    initializeIcons();
}


createComponentModal();


/* =====================================================
   13. MODAL ELEMENTS
   ===================================================== */

const componentModal = document.getElementById(
    "component-modal"
);

const componentForm = document.getElementById(
    "component-form"
);

const modalTitle = document.getElementById(
    "component-modal-title"
);

const closeModalButton = document.getElementById(
    "close-component-modal"
);

const cancelModalButton = document.getElementById(
    "cancel-component"
);


/* =====================================================
   14. MODAL FUNCTIONS
   ===================================================== */

function openComponentModal(component = null) {

    editingComponentId = component ? component.id : null;

    componentForm.reset();

    modalTitle.textContent = component
        ? "Edit Component"
        : "Add Component";

    document.getElementById(
        "save-component-button"
    ).innerHTML = component
        ? '<i data-lucide="save"></i> Update Component'
        : '<i data-lucide="save"></i> Save Component';


    if (component) {

        document.getElementById("component-mpn").value =
            component.mpn || "";

        document.getElementById("component-name").value =
            component.name || "";

        document.getElementById("component-manufacturer").value =
            component.manufacturer || "";

        document.getElementById("component-category").value =
            component.category || "";

        document.getElementById("component-package").value =
            component.packageType || "";

        document.getElementById("component-footprint").value =
            component.footprint || "";

        document.getElementById("component-location").value =
            component.location || "";

        document.getElementById("component-price").value =
            component.unitPrice ?? 0;

        document.getElementById("component-stock").value =
            component.stock ?? 0;

        document.getElementById("component-min-stock").value =
            component.minStock ?? 5;

        document.getElementById("component-datasheet").value =
            component.datasheet || "";
    } else {

        document.getElementById("component-min-stock").value = 5;
    }

    componentModal.hidden = false;

    initializeIcons();

    document.getElementById("component-mpn").focus();
}


function closeComponentModal() {
    componentModal.hidden = true;
    componentForm.reset();
    editingComponentId = null;
}


addComponentButton.addEventListener("click", () => {
    openComponentModal();
});


closeModalButton.addEventListener("click", closeComponentModal);

cancelModalButton.addEventListener("click", closeComponentModal);


componentModal.addEventListener("click", event => {
    if (event.target === componentModal) {
        closeComponentModal();
    }
});


document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        !componentModal.hidden
    ) {
        closeComponentModal();
    }
});


/* =====================================================
   15. SAVE COMPONENT
   ===================================================== */

componentForm.addEventListener("submit", event => {

    event.preventDefault();

    const mpn = document.getElementById(
        "component-mpn"
    ).value.trim();

    const name = document.getElementById(
        "component-name"
    ).value.trim();

    const manufacturer = document.getElementById(
        "component-manufacturer"
    ).value.trim();

    const category = document.getElementById(
        "component-category"
    ).value;

    const packageType = document.getElementById(
        "component-package"
    ).value;

    const footprint = document.getElementById(
        "component-footprint"
    ).value.trim();

    const location = document.getElementById(
        "component-location"
    ).value.trim();

    const unitPrice = Number(document.getElementById(
        "component-price"
    ).value);

    const stock = Number(document.getElementById(
        "component-stock"
    ).value);

    const minStock = Number(document.getElementById(
        "component-min-stock"
    ).value);

    const datasheetInput = document.getElementById(
        "component-datasheet"
    ).value.trim();


    // Validate numerical values.
    if (
        !Number.isFinite(unitPrice) ||
        !Number.isInteger(stock) ||
        !Number.isInteger(minStock) ||
        unitPrice < 0 ||
        stock < 0 ||
        minStock < 0
    ) {
        alert("Please enter valid price and stock values.");
        return;
    }


    // Validate datasheet URL if supplied.
    if (datasheetInput && !getSafeURL(datasheetInput)) {
        alert("Please enter a valid HTTP or HTTPS datasheet URL.");
        return;
    }


    const existingComponent = editingComponentId
        ? inventory.find(item => item.id === editingComponentId)
        : null;


    const componentData = {
        id: editingComponentId || generateId(),

        mpn,
        name,
        manufacturer,
        category,
        packageType,
        footprint,
        location,
        unitPrice,
        stock,
        minStock,
        datasheet: datasheetInput,

        createdAt: existingComponent
            ? existingComponent.createdAt
            : new Date().toISOString(),

        updatedAt: new Date().toISOString()
    };


    if (editingComponentId) {

        inventory = inventory.map(item =>
            item.id === editingComponentId
                ? componentData
                : item
        );

    } else {

        inventory.push(componentData);

    }


    saveInventory();

    renderInventory();
    updateDashboard();

    closeComponentModal();

    alert(
        editingComponentId
            ? "Component updated successfully!"
            : "Component added successfully!"
    );

});


/* =====================================================
   16. RENDER INVENTORY TABLE
   ===================================================== */

function renderInventory() {

    const searchTerm = inventorySearch.value
        .trim()
        .toLowerCase();

    const selectedCategory = categoryFilter.value;
    const selectedPackage = packageFilter.value;


    const filteredInventory = inventory.filter(component => {

        const matchesSearch =
            component.mpn.toLowerCase().includes(searchTerm) ||
            component.manufacturer.toLowerCase().includes(searchTerm) ||
            component.name.toLowerCase().includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            component.category === selectedCategory;

        const matchesPackage =
            selectedPackage === "all" ||
            component.packageType === selectedPackage;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesPackage
        );
    });


    if (filteredInventory.length === 0) {

        inventoryTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-message">
                    ${
                        inventory.length === 0
                            ? "No components added yet. Click Add Component to get started."
                            : "No components match your search or filters."
                    }
                </td>
            </tr>
        `;

        updateInventoryCount(0);
        return;
    }


    inventoryTableBody.innerHTML = filteredInventory.map(component => {

        const status = getStockStatus(component);

        const safeDatasheet = getSafeURL(component.datasheet);

        return `
            <tr>

                <td>
                    <div class="component-name">
                        <strong>${escapeHTML(component.mpn)}</strong>
                        <span>${escapeHTML(component.name)}</span>
                    </div>
                </td>

                <td>${escapeHTML(component.manufacturer)}</td>

                <td>${escapeHTML(component.category)}</td>

                <td>${escapeHTML(component.packageType)}</td>

                <td>${escapeHTML(component.location)}</td>

                <td>${formatPHP(component.unitPrice)}</td>

                <td>${Number(component.stock)}</td>

                <td>
                    <span class="status-badge ${status.className}">
                        ${status.label}
                    </span>
                </td>

                <td>
                    <div class="action-buttons">

                        ${
                            safeDatasheet
                                ? `
                                    <a
                                        class="action-button view"
                                        href="${escapeHTML(safeDatasheet)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="View Datasheet"
                                        aria-label="View datasheet"
                                    >
                                        <i data-lucide="file-text"></i>
                                    </a>
                                `
                                : ""
                        }

                        <button
                            class="action-button edit"
                            data-action="edit"
                            data-id="${escapeHTML(component.id)}"
                            title="Edit Component"
                            aria-label="Edit component"
                        >
                            <i data-lucide="pencil"></i>
                        </button>

                        <button
                            class="action-button"
                            data-action="stock"
                            data-id="${escapeHTML(component.id)}"
                            title="Adjust Stock"
                            aria-label="Adjust stock"
                        >
                            <i data-lucide="package-plus"></i>
                        </button>

                        <button
                            class="action-button delete"
                            data-action="delete"
                            data-id="${escapeHTML(component.id)}"
                            title="Delete Component"
                            aria-label="Delete component"
                        >
                            <i data-lucide="trash-2"></i>
                        </button>

                    </div>
                </td>

            </tr>
        `;

    }).join("");


    updateInventoryCount(filteredInventory.length);

    initializeIcons();
}


function updateInventoryCount(count) {
    const existingCount = document.getElementById(
        "inventory-count"
    );

    if (existingCount) {
        existingCount.textContent =
            `Showing ${count} component${count === 1 ? "" : "s"}`;
    }
}


/* =====================================================
   17. INVENTORY TABLE ACTIONS
   ===================================================== */

inventoryTableBody.addEventListener("click", event => {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const componentId = button.dataset.id;
    const action = button.dataset.action;

    const component = inventory.find(
        item => item.id === componentId
    );

    if (!component) return;


    // EDIT COMPONENT
    if (action === "edit") {
        openComponentModal(component);
    }


    // DELETE COMPONENT
    if (action === "delete") {

        const confirmed = confirm(
            `Are you sure you want to delete ${component.mpn}?`
        );

        if (!confirmed) return;

        inventory = inventory.filter(
            item => item.id !== componentId
        );

        saveInventory();

        renderInventory();
        updateDashboard();
    }


    // ADJUST STOCK
    if (action === "stock") {

        const newQuantity = prompt(
            `Current stock: ${component.stock}\n\n` +
            `Enter the new stock quantity:`,
            component.stock
        );

        if (newQuantity === null) return;

        const parsedQuantity = Number(newQuantity);

        if (
            newQuantity.trim() === "" ||
            !Number.isInteger(parsedQuantity) ||
            parsedQuantity < 0
        ) {
            alert("Please enter a valid non-negative whole number.");
            return;
        }

        component.stock = parsedQuantity;
        component.updatedAt = new Date().toISOString();

        saveInventory();

        renderInventory();
        updateDashboard();
    }

});


/* =====================================================
   18. SEARCH AND FILTER EVENTS
   ===================================================== */

inventorySearch.addEventListener("input", renderInventory);

categoryFilter.addEventListener("change", renderInventory);

packageFilter.addEventListener("change", renderInventory);


/* =====================================================
   19. UPDATE DASHBOARD STATISTICS
   ===================================================== */

function updateDashboard() {

    const componentCount = inventory.length;

    const stockUnits = inventory.reduce(
        (total, component) =>
            total + Number(component.stock),
        0
    );

    const lowStockComponents = inventory.filter(
        component =>
            Number(component.stock) <= Number(component.minStock)
    );

    const totalValue = inventory.reduce(
        (total, component) =>
            total +
            Number(component.unitPrice) *
            Number(component.stock),
        0
    );


    totalComponents.textContent = componentCount;

    totalUnits.textContent = stockUnits;

    lowStock.textContent = lowStockComponents.length;

    inventoryValue.textContent = formatPHP(totalValue);


    updateRecentInventory();

    updateDashboardAlerts();
}


/* =====================================================
   20. RECENT INVENTORY
   ===================================================== */

function updateRecentInventory() {

    const recentComponents = [...inventory]
        .sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        )
        .slice(0, 5);


    if (recentComponents.length === 0) {

        recentInventory.innerHTML = `
            <p class="empty-message">
                No inventory data available yet.
            </p>
        `;

        return;
    }


    recentInventory.innerHTML = recentComponents.map(component => `
        <div class="recent-item">

            <div>
                <strong>${escapeHTML(component.mpn)}</strong>
                <span>
                    ${escapeHTML(component.name)}
                    · ${escapeHTML(component.category)}
                </span>
            </div>

            <strong>${Number(component.stock)} units</strong>

        </div>
    `).join("");
}


/* =====================================================
   21. DASHBOARD STOCK ALERTS
   ===================================================== */

function updateDashboardAlerts() {

    const alertComponents = inventory
        .filter(component =>
            Number(component.stock) <= Number(component.minStock)
        )
        .sort((a, b) =>
            Number(a.stock) - Number(b.stock)
        )
        .slice(0, 5);


    if (alertComponents.length === 0) {

        dashboardAlerts.innerHTML = `
            <p class="empty-message">
                No stock alerts available.
            </p>
        `;

        return;
    }


    dashboardAlerts.innerHTML = alertComponents.map(component => {

        const status = getStockStatus(component);

        return `
            <div class="alert-item">

                <div>
                    <strong>${escapeHTML(component.mpn)}</strong>
                    <span>
                        ${escapeHTML(component.name)}
                    </span>
                </div>

                <span class="alert-quantity">
                    ${Number(component.stock)} left
                    · ${status.label}
                </span>

            </div>
        `;

    }).join("");
}


/* =====================================================
   22. INVENTORY COUNT DISPLAY
   ===================================================== */

function createInventoryCount() {

    const toolbar = document.querySelector(
        ".inventory-toolbar"
    );

    if (!toolbar) return;

    const count = document.createElement("div");

    count.id = "inventory-count";
    count.className = "inventory-count";
    count.textContent = "Showing 0 components";

    toolbar.insertAdjacentElement("afterend", count);
}


/* =====================================================
   23. LUCIDE ICON INITIALIZATION
   ===================================================== */

function initializeIcons() {

    if (window.lucide) {
        window.lucide.createIcons();
    } else {
        console.warn("Lucide icons could not be loaded.");
    }
}


/* =====================================================
   24. APPLICATION INITIALIZATION
   ===================================================== */

function initializeApp() {

    // Start on Dashboard.
    navigateToPage("dashboard");

    // Load previously saved inventory.
    loadInventory();

    // Create inventory count display.
    createInventoryCount();

    // Display inventory and dashboard information.
    renderInventory();

    updateDashboard();

    // Initialize icons.
    initializeIcons();

    console.log(
        "PCB Inventory Manager initialized successfully."
    );
}


document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);
