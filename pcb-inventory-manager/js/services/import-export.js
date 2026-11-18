
import { appState, updateState } from "../core/state.js";
import { generateID, escapeHTML } from "../core/utilities.js";
import { refreshInventory } from "../modules/inventory.js";

const CSV_COLUMNS = [
    "mpn",
    "name",
    "manufacturer",
    "category",
    "packageType",
    "footprint",
    "location",
    "unitPrice",
    "stock",
    "minStock",
    "datasheet"
];

let initialized = false;

function escapeCSV(value) {
    const text = String(value ?? "");

    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export function exportInventoryCSV() {
    if (!appState.inventory.length) {
        return {
            success: false,
            message: "There are no inventory records to export."
        };
    }

    const rows = [
        CSV_COLUMNS.join(","),
        ...appState.inventory.map(component =>
            CSV_COLUMNS.map(column =>
                escapeCSV(component[column])
            ).join(",")
        )
    ];

    const csv = "\uFEFF" + rows.join("\r\n");

    downloadFile(
        csv,
        `pcb-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
        "text/csv;charset=utf-8;"
    );

    return {
        success: true,
        message: `${appState.inventory.length} components exported successfully.`
    };
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const character = text[i];
        const nextCharacter = text[i + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            value += '"';
            i++;
        } else if (character === '"') {
            insideQuotes = !insideQuotes;
        } else if (character === "," && !insideQuotes) {
            row.push(value);
            value = "";
        } else if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {
            if (character === "\r" && nextCharacter === "\n") {
                i++;
            }

            row.push(value);

            if (row.some(cell => cell.trim() !== "")) {
                rows.push(row);
            }

            row = [];
            value = "";
        } else {
            value += character;
        }
    }

    row.push(value);

    if (row.some(cell => cell.trim() !== "")) {
        rows.push(row);
    }

    return rows;
}

function normalizeHeader(header) {
    return String(header || "")
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase();
}

function validateImportedRow(row, headers, rowNumber) {
    const record = {};

    headers.forEach((header, index) => {
        record[header] = String(row[index] ?? "").trim();
    });

    const requiredFields = [
        "mpn",
        "name",
        "manufacturer"
    ];

    for (const field of requiredFields) {
        if (!record[field]) {
            throw new Error(
                `Row ${rowNumber}: Missing required field "${field}".`
            );
        }
    }

    const unitPrice = Number(record.unitprice ?? 0);
    const stock = Number(record.stock ?? 0);
    const minStock = Number(record.minstock ?? 0);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(
            `Row ${rowNumber}: Invalid unit price.`
        );
    }

    if (!Number.isInteger(stock) || stock < 0) {
        throw new Error(
            `Row ${rowNumber}: Stock must be a non-negative whole number.`
        );
    }

    if (!Number.isInteger(minStock) || minStock < 0) {
        throw new Error(
            `Row ${rowNumber}: Minimum stock must be a non-negative whole number.`
        );
    }

    let datasheet = record.datasheet || "";

    if (datasheet) {
        try {
            const url = new URL(datasheet);

            if (!["http:", "https:"].includes(url.protocol)) {
                throw new Error();
            }

            datasheet = url.href;
        } catch {
            throw new Error(
                `Row ${rowNumber}: Invalid datasheet URL.`
            );
        }
    }

    return {
        id: generateID("CMP"),
        mpn: record.mpn,
        name: record.name,
        manufacturer: record.manufacturer,
        category: record.category || "Other",
        packageType: record.packagetype || "Other",
        footprint: record.footprint || "",
        location: record.location || "",
        unitPrice,
        stock,
        minStock,
        datasheet,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

export async function importInventoryCSV(file) {
    if (!file || !file.name.toLowerCase().endsWith(".csv")) {
        return {
            success: false,
            message: "Please select a CSV file."
        };
    }

    try {
        const text = await file.text();
        const rows = parseCSV(text);

        if (rows.length < 2) {
            throw new Error("The CSV file contains no component records.");
        }

        const headers = rows[0].map(normalizeHeader);

        for (const column of ["mpn", "name", "manufacturer"]) {
            if (!headers.includes(column)) {
                throw new Error(
                    `The CSV file is missing the required "${column}" column.`
                );
            }
        }

        const importedComponents = [];
        const existingMPNs = new Set(
            appState.inventory.map(component =>
                component.mpn.trim().toLowerCase()
            )
        );

        let duplicates = 0;
        let invalid = 0;
        const errors = [];

        for (let i = 1; i < rows.length; i++) {
            try {
                const component = validateImportedRow(
                    rows[i],
                    headers,
                    i + 1
                );

                const normalizedMPN = component.mpn.toLowerCase();

                if (existingMPNs.has(normalizedMPN)) {
                    duplicates++;
                    continue;
                }

                existingMPNs.add(normalizedMPN);
                importedComponents.push(component);

            } catch (error) {
                invalid++;

                if (errors.length < 5) {
                    errors.push(error.message);
                }
            }
        }

        if (!importedComponents.length) {
            return {
                success: false,
                message:
                    `No components were imported. ` +
                    `${duplicates} duplicates skipped, ` +
                    `${invalid} invalid rows.`,
                errors
            };
        }

        const previousInventory = [...appState.inventory];

        appState.inventory = [
            ...importedComponents,
            ...appState.inventory
        ];

        if (!updateState("inventory", appState.inventory)) {
            appState.inventory = previousInventory;

            throw new Error(
                "Unable to save imported components to LocalStorage."
            );
        }

        refreshInventory();

        return {
            success: true,
            imported: importedComponents.length,
            duplicates,
            invalid,
            errors,
            message:
                `${importedComponents.length} components imported. ` +
                `${duplicates} duplicates skipped. ` +
                `${invalid} invalid rows skipped.`
        };

    } catch (error) {
        console.error("CSV import failed:", error);

        return {
            success: false,
            message: error.message || "Unable to import CSV file."
        };
    }
}

function showTransferMessage(message, isError = false) {
    const output = document.getElementById("inventory-transfer-message");

    if (!output) return;

    output.textContent = message;
    output.style.color = isError ? "#A34435" : "var(--primary)";
}

function createTransferControls() {
    const toolbar = document.querySelector(".inventory-toolbar");

    if (!toolbar || document.getElementById("inventory-export-csv")) {
        return;
    }

    const controls = document.createElement("div");
    controls.className = "inventory-transfer-controls";

    controls.innerHTML = `
        <button type="button"
                class="secondary-button"
                id="inventory-import-csv">
            <i data-lucide="upload"></i>
            Import CSV
        </button>

        <button type="button"
                class="secondary-button"
                id="inventory-export-csv">
            <i data-lucide="download"></i>
            Export CSV
        </button>

        <input type="file"
               id="inventory-csv-file"
               accept=".csv,text/csv"
               hidden>
    `;

    toolbar.appendChild(controls);

    const message = document.createElement("p");
    message.id = "inventory-transfer-message";
    message.className = "settings-message";
    message.setAttribute("aria-live", "polite");

    toolbar.insertAdjacentElement("afterend", message);

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function initializeTransferEvents() {
    const importButton = document.getElementById("inventory-import-csv");
    const exportButton = document.getElementById("inventory-export-csv");
    const fileInput = document.getElementById("inventory-csv-file");

    importButton?.addEventListener("click", () => {
        fileInput?.click();
    });

    fileInput?.addEventListener("change", async event => {
        const file = event.target.files?.[0];

        if (!file) return;

        showTransferMessage("Importing components...");

        const result = await importInventoryCSV(file);

        showTransferMessage(
            result.message,
            !result.success
        );

        if (result.errors?.length) {
            console.warn("CSV import row errors:", result.errors);
        }

        event.target.value = "";
    });

    exportButton?.addEventListener("click", () => {
        const result = exportInventoryCSV();

        showTransferMessage(
            result.message,
            !result.success
        );
    });
}

export function initializeImportExport() {
    if (initialized) return;

    createTransferControls();
    initializeTransferEvents();

    initialized = true;

    console.log("Inventory CSV import/export initialized.");
}
