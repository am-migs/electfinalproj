
import { appState, updateState } from "../core/state.js";
import {
    generateID,
    formatCurrency,
    escapeHTML
} from "../core/utilities.js";

const BATCH_SIZES = [1, 10, 100];

let activeProjectId = null;
let selectedBatchSize = 1;
let bomInitialized = false;

function currency() {
    return appState.settings?.currency || "PHP";
}

function money(value) {
    return formatCurrency(value, currency());
}

function getActiveProject() {
    return appState.projects.find(
        project => project.id === activeProjectId
    ) || null;
}

function saveProjects() {
    return updateState("projects", appState.projects);
}

function ensureProjectData(project) {
    if (!Array.isArray(project.items)) {
        project.items = [];
    }

    return project;
}

function getInventoryComponent(componentId) {
    return appState.inventory.find(
        component => component.id === componentId
    );
}

function getProjectItem(project, componentId) {
    return project.items.find(
        item => item.componentId === componentId
    );
}

function calculateProject(project) {
    const items = project.items.map(item => {
        const component = getInventoryComponent(item.componentId);
        const quantityPerBoard = Math.max(
            0,
            Number(item.quantityPerBoard) || 0
        );

        const unitPrice = Number(
            component?.unitPrice ?? item.unitPrice ?? 0
        );

        const requiredQuantity = quantityPerBoard * selectedBatchSize;
        const availableStock = Number(component?.stock) || 0;
        const shortage = Math.max(
            0,
            requiredQuantity - availableStock
        );

        return {
            ...item,
            component,
            quantityPerBoard,
            unitPrice,
            requiredQuantity,
            availableStock,
            shortage,
            lineCost: quantityPerBoard * unitPrice,
            batchCost: requiredQuantity * unitPrice
        };
    });

    const unitCost = items.reduce(
        (total, item) => total + item.lineCost,
        0
    );

    const batchCost = items.reduce(
        (total, item) => total + item.batchCost,
        0
    );

    const totalShortage = items.reduce(
        (total, item) => total + item.shortage,
        0
    );

    return {
        items,
        unitCost,
        batchCost,
        totalShortage,
        shortageItems: items.filter(item => item.shortage > 0)
    };
}

function injectBOMStyles() {
    if (document.getElementById("bom-module-styles")) return;

    const style = document.createElement("style");
    style.id = "bom-module-styles";

    style.textContent = `
        .bom-layout {
            display: grid;
            gap: 20px;
        }

        .bom-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 18px;
        }

        .bom-project-select {
            min-width: 220px;
            max-width: 100%;
        }

        .bom-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 20px;
        }

        .bom-summary-card {
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: var(--radius-md, 12px);
            padding: 18px;
            min-width: 0;
        }

        .bom-summary-card span {
            display: block;
            color: var(--text-secondary, #718078);
            font-size: 12px;
            margin-bottom: 8px;
        }

        .bom-summary-card strong {
            display: block;
            color: var(--text-primary, #26352d);
            font-size: clamp(18px, 2vw, 25px);
            overflow-wrap: anywhere;
        }

        .bom-panel {
            background: var(--bg-card, #fff);
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: var(--radius-md, 12px);
            padding: 20px;
            min-width: 0;
        }

        .bom-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 16px;
        }

        .bom-panel-header h3 {
            margin: 0 0 4px;
            color: var(--text-primary, #26352d);
        }

        .bom-panel-header p {
            margin: 0;
            color: var(--text-secondary, #718078);
            font-size: 13px;
        }

        .bom-table-wrap {
            width: 100%;
            overflow-x: auto;
        }

        .bom-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 850px;
        }

        .bom-table th,
        .bom-table td {
            padding: 12px 10px;
            border-bottom: 1px solid var(--border-color, #e2dfda);
            text-align: left;
            font-size: 13px;
            vertical-align: middle;
        }

        .bom-table th {
            color: var(--text-secondary, #718078);
            font-weight: 600;
            white-space: nowrap;
        }

        .bom-table td strong {
            color: var(--text-primary, #26352d);
        }

        .bom-muted {
            color: var(--text-secondary, #718078);
        }

        .bom-shortage {
            color: #b42318;
            font-weight: 700;
        }

        .bom-ok {
            color: #276221;
            font-weight: 700;
        }

        .bom-actions {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .bom-action-button {
            border: 1px solid var(--border-color, #e2dfda);
            background: #fff;
            color: var(--text-primary, #26352d);
            border-radius: 7px;
            padding: 7px 9px;
            cursor: pointer;
        }

        .bom-action-button:hover {
            background: var(--green-pale, #cce7c9);
        }

        .bom-form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .bom-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
        }

        .bom-field.full {
            grid-column: 1 / -1;
        }

        .bom-field label {
            color: var(--text-primary, #26352d);
            font-size: 13px;
            font-weight: 600;
        }

        .bom-field input,
        .bom-field select,
        .bom-project-select {
            width: 100%;
            min-height: 42px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 8px;
            padding: 9px 11px;
            background: #fff;
            color: var(--text-primary, #26352d);
            font: inherit;
        }

        .bom-form-actions {
            display: flex;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 9px;
            margin-top: 18px;
        }

        .bom-primary,
        .bom-secondary,
        .bom-danger {
            border: 0;
            border-radius: 8px;
            padding: 10px 15px;
            font-weight: 600;
            cursor: pointer;
        }

        .bom-primary {
            background: var(--primary, #276221);
            color: #fff;
        }

        .bom-secondary {
            background: var(--sage, #cbded3);
            color: #26352d;
        }

        .bom-danger {
            background: #fce8e6;
            color: #b42318;
        }

        .bom-primary:disabled {
            opacity: .5;
            cursor: not-allowed;
        }

        .bom-batch-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .bom-batch-button {
            padding: 8px 13px;
            border: 1px solid var(--border-color, #e2dfda);
            background: #fff;
            color: var(--text-primary, #26352d);
            border-radius: 8px;
            cursor: pointer;
        }

        .bom-batch-button.active {
            background: var(--primary, #276221);
            color: #fff;
            border-color: var(--primary, #276221);
        }

        .bom-empty {
            padding: 28px 12px;
            text-align: center;
            color: var(--text-secondary, #718078);
        }

        .bom-alert {
            border: 1px solid #f2b8b5;
            background: #fff5f4;
            color: #912018;
            border-radius: 9px;
            padding: 13px 15px;
            margin-bottom: 16px;
            font-size: 13px;
        }

        .bom-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(0, 0, 0, .48);
        }

        .bom-modal {
            width: min(560px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 14px;
            padding: 22px;
            box-shadow: 0 18px 55px rgba(0, 0, 0, .2);
        }

        .bom-modal h3 {
            margin: 0 0 18px;
            color: #26352d;
        }

        .bom-order-list {
            display: grid;
            gap: 10px;
        }

        .bom-order-item {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 12px;
            background: #fff5f4;
            border-radius: 8px;
            color: #912018;
            font-size: 13px;
        }

        @media (max-width: 900px) {
            .bom-summary-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 560px) {
            .bom-summary-grid {
                grid-template-columns: 1fr 1fr;
                gap: 9px;
            }

            .bom-summary-card {
                padding: 13px;
            }

            .bom-panel {
                padding: 14px;
            }

            .bom-form-grid {
                grid-template-columns: 1fr;
            }

            .bom-field.full {
                grid-column: auto;
            }

            .bom-toolbar {
                align-items: stretch;
            }

            .bom-project-select {
                min-width: 100%;
            }
        }
    `;

    document.head.appendChild(style);
}

function renderProjectOptions() {
    const select = document.getElementById("bom-project-select");
    if (!select) return;

    if (!appState.projects.some(project => project.id === activeProjectId)) {
        activeProjectId = appState.projects[0]?.id || null;
    }

    select.innerHTML = `
        <option value="">Select a project</option>
        ${appState.projects.map(project => `
            <option value="${escapeHTML(project.id)}"
                ${project.id === activeProjectId ? "selected" : ""}>
                ${escapeHTML(project.name)}
            </option>
        `).join("")}
    `;

    select.value = activeProjectId || "";
}

function renderBOMPage() {
    const page = document.getElementById("bom");
    if (!page) return;

    const heading = page.querySelector(".section-heading");

    if (heading) {
        heading.innerHTML = `
            <div>
                <h2>Bill of Materials Manager</h2>
                <p>Manage project components, production quantities, and costs.</p>
            </div>
            <button class="primary-button" id="bom-create-project">
                <i data-lucide="plus"></i>
                Create Project
            </button>
        `;
    }

    let content = document.getElementById("bom-module-content");

    if (!content) {
        content = document.createElement("div");
        content.id = "bom-module-content";
        page.appendChild(content);
    }

    content.innerHTML = `
        <div class="bom-layout">
            <div class="bom-toolbar">
                <select id="bom-project-select" class="bom-project-select"
                    aria-label="Select project">
                    <option value="">Select a project</option>
                </select>

                <div class="bom-actions">
                    <button class="bom-secondary" id="bom-edit-project" disabled>
                        Edit Project
                    </button>
                    <button class="bom-danger" id="bom-delete-project" disabled>
                        Delete Project
                    </button>
                </div>
            </div>

            <div id="bom-project-workspace">
                <div class="bom-panel bom-empty">
                    Create a project to start building its Bill of Materials.
                </div>
            </div>
        </div>
    `;

    renderProjectOptions();
    renderProjectWorkspace();

    if (window.lucide) window.lucide.createIcons();
}

function renderProjectWorkspace() {
    const workspace = document.getElementById("bom-project-workspace");
    const project = getActiveProject();

    const editButton = document.getElementById("bom-edit-project");
    const deleteButton = document.getElementById("bom-delete-project");

    if (editButton) editButton.disabled = !project;
    if (deleteButton) deleteButton.disabled = !project;

    if (!workspace) return;

    if (!project) {
        workspace.innerHTML = `
            <div class="bom-panel bom-empty">
                No project selected. Create a project to begin.
            </div>
        `;
        return;
    }

    ensureProjectData(project);

    const calculation = calculateProject(project);
    const availableComponents = appState.inventory.filter(component =>
        !getProjectItem(project, component.id)
    );

    workspace.innerHTML = `
        <div class="bom-summary-grid">
            <div class="bom-summary-card">
                <span>Components in BOM</span>
                <strong>${project.items.length}</strong>
            </div>

            <div class="bom-summary-card">
                <span>Cost per Board</span>
                <strong>${money(calculation.unitCost)}</strong>
            </div>

            <div class="bom-summary-card">
                <span>${selectedBatchSize}× Production Cost</span>
                <strong>${money(calculation.batchCost)}</strong>
            </div>

            <div class="bom-summary-card">
                <span>Missing Units</span>
                <strong class="${calculation.totalShortage ? "bom-shortage" : "bom-ok"}">
                    ${calculation.totalShortage}
                </strong>
            </div>
        </div>

        <div class="bom-panel">
            <div class="bom-panel-header">
                <div>
                    <h3>${escapeHTML(project.name)}</h3>
                    <p>${escapeHTML(project.description || "Project Bill of Materials")}</p>
                </div>

                <button class="bom-primary" id="bom-add-component"
                    ${availableComponents.length === 0 ? "disabled" : ""}>
                    Add Inventory Component
                </button>
            </div>

            <div class="bom-table-wrap">
                <table class="bom-table">
                    <thead>
                        <tr>
                            <th>Designator</th>
                            <th>Component</th>
                            <th>MPN</th>
                            <th>Qty / Board</th>
                            <th>Unit Price</th>
                            <th>Required (${selectedBatchSize}×)</th>
                            <th>Available</th>
                            <th>Shortage</th>
                            <th>Line Cost</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${calculation.items.length ? calculation.items.map(item => `
                            <tr>
                                <td><strong>${escapeHTML(item.designators || "—")}</strong></td>
                                <td>${escapeHTML(item.component?.name || item.name || "Deleted component")}</td>
                                <td>${escapeHTML(item.component?.mpn || item.mpn || "—")}</td>
                                <td>${item.quantityPerBoard}</td>
                                <td>${money(item.unitPrice)}</td>
                                <td>${item.requiredQuantity}</td>
                                <td>${item.availableStock}</td>
                                <td class="${item.shortage ? "bom-shortage" : "bom-ok"}">
                                    ${item.shortage}
                                </td>
                                <td>${money(item.batchCost)}</td>
                                <td>
                                    <div class="bom-actions">
                                        <button class="bom-action-button"
                                            data-bom-action="edit-item"
                                            data-id="${escapeHTML(item.componentId)}"
                                            title="Edit BOM item">Edit</button>
                                        <button class="bom-action-button"
                                            data-bom-action="remove-item"
                                            data-id="${escapeHTML(item.componentId)}"
                                            title="Remove BOM item">Remove</button>
                                    </div>
                                </td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="10" class="bom-empty">
                                    No components added to this BOM yet.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="bom-panel">
            <div class="bom-panel-header">
                <div>
                    <h3>Production Cost Analysis</h3>
                    <p>Estimate the total component cost for different production runs.</p>
                </div>

                <div class="bom-batch-controls">
                    ${BATCH_SIZES.map(size => `
                        <button class="bom-batch-button ${selectedBatchSize === size ? "active" : ""}"
                            data-batch-size="${size}">
                            ${size}×
                        </button>
                    `).join("")}
                </div>
            </div>

            <div class="bom-summary-grid">
                ${BATCH_SIZES.map(size => `
                    <div class="bom-summary-card">
                        <span>${size} Board${size > 1 ? "s" : ""}</span>
                        <strong>${money(calculation.unitCost * size)}</strong>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="bom-panel">
            <div class="bom-panel-header">
                <div>
                    <h3>Shortage Detection & Order List</h3>
                    <p>Compares required batch quantities against current inventory.</p>
                </div>

                <button class="bom-secondary" id="bom-export-order"
                    ${calculation.shortageItems.length ? "" : "disabled"}>
                    Export Order List CSV
                </button>
            </div>

            ${calculation.shortageItems.length ? `
                <div class="bom-alert">
                    ${calculation.shortageItems.length} component type(s) have insufficient stock
                    for a ${selectedBatchSize}-board production run.
                </div>

                <div class="bom-order-list">
                    ${calculation.shortageItems.map(item => `
                        <div class="bom-order-item">
                            <span>
                                <strong>${escapeHTML(item.component?.mpn || item.mpn || "Unknown MPN")}</strong>
                                <br>
                                ${escapeHTML(item.component?.name || item.name || "Component")}
                            </span>
                            <strong>Order ${item.shortage} unit(s)</strong>
                        </div>
                    `).join("")}
                </div>
            ` : `
                <div class="bom-empty">
                    No shortages detected for this production quantity.
                </div>
            `}
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

function showProjectModal(project = null) {
    const isEditing = Boolean(project);

    const backdrop = document.createElement("div");
    backdrop.className = "bom-modal-backdrop";
    backdrop.id = "bom-modal-backdrop";

    backdrop.innerHTML = `
        <form class="bom-modal" id="bom-project-form">
            <h3>${isEditing ? "Edit Project" : "Create New Project"}</h3>

            <div class="bom-form-grid">
                <div class="bom-field full">
                    <label for="bom-project-name">Project Name *</label>
                    <input id="bom-project-name" name="name"
                        maxlength="100" required
                        value="${escapeHTML(project?.name || "")}"
                        placeholder="e.g. ESP32 Weather Station">
                </div>

                <div class="bom-field full">
                    <label for="bom-project-description">Description</label>
                    <input id="bom-project-description" name="description"
                        maxlength="250"
                        value="${escapeHTML(project?.description || "")}"
                        placeholder="Short project description">
                </div>
            </div>

            <div class="bom-form-actions">
                <button type="button" class="bom-secondary" id="bom-cancel-modal">
                    Cancel
                </button>
                <button type="submit" class="bom-primary">
                    ${isEditing ? "Save Changes" : "Create Project"}
                </button>
            </div>
        </form>
    `;

    document.body.appendChild(backdrop);

    document.getElementById("bom-cancel-modal").addEventListener("click", () => {
        backdrop.remove();
    });

    backdrop.addEventListener("click", event => {
        if (event.target === backdrop) backdrop.remove();
    });

    document.getElementById("bom-project-form").addEventListener("submit", event => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") || "").trim();
        const description = String(formData.get("description") || "").trim();

        if (!name) {
            alert("Project name is required.");
            return;
        }

        const previousProjects = [...appState.projects];

        if (isEditing) {
            appState.projects = appState.projects.map(item =>
                item.id === project.id
                    ? { ...item, name, description, updatedAt: new Date().toISOString() }
                    : item
            );
        } else {
            const newProject = {
                id: generateID("PRJ"),
                name,
                description,
                items: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            appState.projects = [...appState.projects, newProject];
            activeProjectId = newProject.id;
        }

        if (!saveProjects()) {
            appState.projects = previousProjects;
            alert("Unable to save the project. Check browser storage.");
            return;
        }

        backdrop.remove();
        renderProjectOptions();
        renderProjectWorkspace();
    });

    document.getElementById("bom-project-name").focus();
}

function showBOMItemModal(project, existingItem = null) {
    const isEditing = Boolean(existingItem);

    const choices = isEditing
        ? [getInventoryComponent(existingItem.componentId)].filter(Boolean)
        : appState.inventory.filter(component =>
            !getProjectItem(project, component.id)
        );

    if (!choices.length) {
        alert("There are no available inventory components to add.");
        return;
    }

    const backdrop = document.createElement("div");
    backdrop.className = "bom-modal-backdrop";

    backdrop.innerHTML = `
        <form class="bom-modal" id="bom-item-form">
            <h3>${isEditing ? "Edit BOM Component" : "Add Component to BOM"}</h3>

            <div class="bom-form-grid">
                <div class="bom-field full">
                    <label for="bom-component-select">Inventory Component *</label>
                    <select id="bom-component-select" name="componentId" required
                        ${isEditing ? "disabled" : ""}>
                        ${choices.map(component => `
                            <option value="${escapeHTML(component.id)}">
                                ${escapeHTML(component.mpn)} — ${escapeHTML(component.name)}
                                (Stock: ${Number(component.stock) || 0})
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="bom-field full">
                    <label for="bom-designators">Designators *</label>
                    <input id="bom-designators" name="designators"
                        required maxlength="200"
                        value="${escapeHTML(existingItem?.designators || "")}"
                        placeholder="e.g. R1, R2, U1">
                </div>

                <div class="bom-field full">
                    <label for="bom-quantity">Quantity per Board *</label>
                    <input id="bom-quantity" name="quantityPerBoard"
                        type="number" min="1" step="1" required
                        value="${Number(existingItem?.quantityPerBoard) || 1}">
                </div>
            </div>

            <div class="bom-form-actions">
                <button type="button" class="bom-secondary" id="bom-cancel-item">
                    Cancel
                </button>
                <button type="submit" class="bom-primary">
                    ${isEditing ? "Save Changes" : "Add to BOM"}
                </button>
            </div>
        </form>
    `;

    document.body.appendChild(backdrop);

    document.getElementById("bom-cancel-item").addEventListener("click", () => {
        backdrop.remove();
    });

    backdrop.addEventListener("click", event => {
        if (event.target === backdrop) backdrop.remove();
    });

    document.getElementById("bom-item-form").addEventListener("submit", event => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const componentId = String(formData.get("componentId") || "");
        const designators = String(formData.get("designators") || "").trim();
        const quantityPerBoard = Number(formData.get("quantityPerBoard"));

        if (!designators) {
            alert("Enter at least one designator.");
            return;
        }

        if (!Number.isInteger(quantityPerBoard) || quantityPerBoard < 1) {
            alert("Quantity per board must be a whole number greater than zero.");
            return;
        }

        const component = getInventoryComponent(componentId);

        if (!component) {
            alert("The selected inventory component no longer exists.");
            return;
        }

        if (!isEditing && getProjectItem(project, componentId)) {
            alert("This component is already in the project BOM. Edit its existing row instead.");
            return;
        }

        const previousItems = project.items.map(item => ({ ...item }));

        if (isEditing) {
            project.items = project.items.map(item =>
                item.componentId === existingItem.componentId
                    ? {
                        ...item,
                        designators,
                        quantityPerBoard,
                        unitPrice: Number(component.unitPrice) || 0
                    }
                    : item
            );
        } else {
            project.items.push({
                componentId,
                mpn: component.mpn,
                name: component.name,
                designators,
                quantityPerBoard,
                unitPrice: Number(component.unitPrice) || 0
            });
        }

        project.updatedAt = new Date().toISOString();

        if (!saveProjects()) {
            project.items = previousItems;
            alert("Unable to save the BOM item.");
            return;
        }

        backdrop.remove();
        renderProjectWorkspace();
    });

    document.getElementById("bom-designators").focus();
}

function removeBOMItem(project, componentId) {
    const item = getProjectItem(project, componentId);
    if (!item) return;

    const confirmed = confirm(
        `Remove ${item.mpn || "this component"} from the project BOM?`
    );

    if (!confirmed) return;

    const previousItems = [...project.items];

    project.items = project.items.filter(
        entry => entry.componentId !== componentId
    );

    project.updatedAt = new Date().toISOString();

    if (!saveProjects()) {
        project.items = previousItems;
        alert("Unable to remove the BOM item.");
        return;
    }

    renderProjectWorkspace();
}

function exportOrderList(project) {
    const calculation = calculateProject(project);

    if (!calculation.shortageItems.length) return;

    const rows = [
        ["Project", "Component", "MPN", "Required Quantity", "Available Stock", "Shortage", "Unit Price"]
    ];

    calculation.shortageItems.forEach(item => {
        rows.push([
            project.name,
            item.component?.name || item.name || "",
            item.component?.mpn || item.mpn || "",
            item.requiredQuantity,
            item.availableStock,
            item.shortage,
            item.unitPrice
        ]);
    });

    const csv = rows.map(row =>
        row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")
    ).join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9-_]/gi, "_")}_order_list.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function initializeBOMEvents() {
    const page = document.getElementById("bom");
    if (!page || bomInitialized) return;

    page.addEventListener("click", event => {
        const target = event.target;

        if (target.closest("#bom-create-project")) {
            showProjectModal();
            return;
        }

        if (target.closest("#bom-edit-project")) {
            const project = getActiveProject();
            if (project) showProjectModal(project);
            return;
        }

        if (target.closest("#bom-delete-project")) {
            const project = getActiveProject();
            if (!project) return;

            if (!confirm(`Delete project "${project.name}" and its BOM?`)) return;

            const previousProjects = [...appState.projects];

            appState.projects = appState.projects.filter(
                item => item.id !== project.id
            );

            if (!saveProjects()) {
                appState.projects = previousProjects;
                alert("Unable to delete the project.");
                return;
            }

            activeProjectId = appState.projects[0]?.id || null;
            renderProjectOptions();
            renderProjectWorkspace();
            return;
        }

        if (target.closest("#bom-add-component")) {
            const project = getActiveProject();
            if (project) showBOMItemModal(project);
            return;
        }

        if (target.closest("#bom-export-order")) {
            const project = getActiveProject();
            if (project) exportOrderList(project);
            return;
        }

        const batchButton = target.closest("[data-batch-size]");
        if (batchButton) {
            selectedBatchSize = Number(batchButton.dataset.batchSize);
            renderProjectWorkspace();
            return;
        }

        const actionButton = target.closest("[data-bom-action]");
        if (actionButton) {
            const project = getActiveProject();
            if (!project) return;

            const componentId = actionButton.dataset.id;
            const action = actionButton.dataset.bomAction;

            if (action === "edit-item") {
                const item = getProjectItem(project, componentId);
                if (item) showBOMItemModal(project, item);
            }

            if (action === "remove-item") {
                removeBOMItem(project, componentId);
            }
        }
    });

    page.addEventListener("change", event => {
        if (event.target.id === "bom-project-select") {
            activeProjectId = event.target.value || null;
            renderProjectWorkspace();
        }
    });

    bomInitialized = true;
}

export function initializeBOM() {
    if (!Array.isArray(appState.projects)) {
        appState.projects = [];
    }

    appState.projects.forEach(ensureProjectData);

    injectBOMStyles();
    renderBOMPage();
    initializeBOMEvents();

    console.log("BOM Manager initialized successfully.");

    return true;
}

export function refreshBOM() {
    renderProjectOptions();
    renderProjectWorkspace();
}

export function getBOMProjects() {
    return [...appState.projects];
}
