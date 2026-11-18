
import { searchComponents } from "../services/jlcparts.js";

let initialized = false;
let activeSearchController = null;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function createSearchInterface() {
    const inventoryPage = document.getElementById("inventory");

    if (!inventoryPage || document.getElementById("catalog-search-panel")) {
        return;
    }

    const heading = inventoryPage.querySelector(".section-heading");

    if (!heading) return;

    const panel = document.createElement("div");

    panel.id = "catalog-search-panel";
    panel.className = "panel catalog-search-panel";

    panel.innerHTML = `
        <div class="panel-header">
            <div>
                <h3>JLCParts Component Catalog</h3>
                <p>Search the open-source JLCPCB component catalogue.</p>
            </div>
            <span class="catalog-source-label">OPEN CATALOG</span>
        </div>

        <form id="catalog-search-form" class="catalog-search-form">
            <input
                type="search"
                id="catalog-search-input"
                placeholder="Search by LCSC number, manufacturer, or description..."
                minlength="3"
                required
            >

            <button type="submit" class="primary-button" id="catalog-search-button">
                Search Catalog
            </button>
        </form>

        <p id="catalog-search-status" class="catalog-search-status"
           aria-live="polite">
            Enter at least 3 characters to search the catalogue.
        </p>

        <div id="catalog-search-results" class="catalog-search-results">
        </div>
    `;

    heading.insertAdjacentElement("afterend", panel);

    document.getElementById("catalog-search-form")
        .addEventListener("submit", handleSearch);

    document.getElementById("catalog-search-results")
        .addEventListener("click", handleResultSelection);
}

function setStatus(message, type = "") {
    const status = document.getElementById("catalog-search-status");

    if (!status) return;

    status.textContent = message;
    status.dataset.type = type;
}

function setLoading(isLoading) {
    const button = document.getElementById("catalog-search-button");

    if (!button) return;

    button.disabled = isLoading;
    button.textContent = isLoading ? "Searching..." : "Search Catalog";
}

async function handleSearch(event) {
    event.preventDefault();

    const input = document.getElementById("catalog-search-input");
    const resultsContainer = document.getElementById("catalog-search-results");

    const query = input.value.trim();

    if (query.length < 3) {
        setStatus("Please enter at least 3 characters.", "error");
        return;
    }

    if (activeSearchController) {
        activeSearchController.abort();
    }

    activeSearchController = new AbortController();

    resultsContainer.innerHTML = "";
    setLoading(true);
    setStatus("Searching the JLCParts catalogue. The first search may take longer...");

    try {
        const results = await searchComponents(query, {
            limit: 30,
            signal: activeSearchController.signal
        });

        if (results.length === 0) {
            setStatus("No matching components were found.", "empty");
            return;
        }

        renderResults(results);

        setStatus(
            `${results.length} matching component(s) found.`,
            "success"
        );

    } catch (error) {
        if (error.name === "AbortError") return;

        console.error("JLCParts search failed:", error);

        setStatus(
            "Unable to search the catalogue. Check your connection or try again later.",
            "error"
        );

    } finally {
        setLoading(false);
    }
}

function renderResults(results) {
    const container = document.getElementById("catalog-search-results");

    container.innerHTML = results.map((component, index) => `
        <article class="catalog-result">
            <div class="catalog-result-information">
                <strong>${escapeHTML(component.lcsc)}</strong>
                <h4>${escapeHTML(component.description)}</h4>

                <p>
                    ${escapeHTML(component.manufacturer || "Unknown manufacturer")}
                </p>

                <div class="catalog-result-meta">
                    <span>${escapeHTML(component.category || "Uncategorized")}</span>
                    ${component.stock !== null
                        ? `<span>Stock: ${escapeHTML(component.stock)}</span>`
                        : ""}
                </div>
            </div>

            <button
                type="button"
                class="secondary-button catalog-select-button"
                data-result-index="${index}"
            >
                Use Component
            </button>
        </article>
    `).join("");

    container._catalogResults = results;
}

function handleResultSelection(event) {
    const button = event.target.closest("[data-result-index]");

    if (!button) return;

    const container = document.getElementById("catalog-search-results");
    const results = container?._catalogResults || [];

    const component = results[Number(button.dataset.resultIndex)];

    if (!component) return;

    const addButton = document.getElementById("add-component-button");

    if (!addButton) {
        setStatus("The inventory component form is unavailable.", "error");
        return;
    }

    addButton.click();

    const fields = {
        "component-mpn": component.lcsc,
        "component-name": component.description,
        "component-manufacturer": component.manufacturer,
        "component-datasheet": component.datasheet || ""
    };

    for (const [id, value] of Object.entries(fields)) {
        const field = document.getElementById(id);

        if (field) {
            field.value = value;
        }
    }

    const categoryField = document.getElementById("component-category");

    if (categoryField) {
        categoryField.value = "Other";
    }

    setStatus(
        `${component.lcsc} was added to the component form. Review the information, complete the remaining fields, and save it.`,
        "success"
    );
}

export function initializeCatalogSearch() {
    if (initialized) return true;

    createSearchInterface();

    initialized = Boolean(
        document.getElementById("catalog-search-form")
    );

    return initialized;
}
