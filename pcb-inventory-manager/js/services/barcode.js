import { appState } from "../core/state.js";
import { escapeHTML } from "../core/utilities.js";

let initialized = false;
let libraryPromise = null;

function loadScript(url, globalName) {
    if (window[globalName]) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        let script = document.querySelector(
            `script[data-pcb-library="${globalName}"]`
        );

        if (script) {
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener("error", reject, { once: true });
            return;
        }

        script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.dataset.pcbLibrary = globalName;

        script.onload = resolve;
        script.onerror = () => {
            reject(new Error(`Unable to load ${globalName}.`));
        };

        document.head.appendChild(script);
    });
}

function loadLibraries() {
    if (!libraryPromise) {
        libraryPromise = loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
            "QRCode"
        ).then(() => {
            return loadScript(
                "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
                "JsBarcode"
            );
        });
    }

    return libraryPromise;
}

function findComponent(id) {
    return appState.inventory.find(component => component.id === id);
}

function createLabelModal() {
    if (document.getElementById("component-label-modal")) {
        return;
    }

    const modal = document.createElement("div");

    modal.id = "component-label-modal";
    modal.className = "modal-overlay";
    modal.hidden = true;

    modal.innerHTML = `
        <div class="modal label-modal"
             role="dialog"
             aria-modal="true"
             aria-labelledby="component-label-title">

            <div class="modal-header">
                <div>
                    <h2 id="component-label-title">
                        Component Identification Label
                    </h2>
                    <p>QR code and Code 128 barcode</p>
                </div>

                <button type="button"
                        class="modal-close"
                        id="label-close"
                        aria-label="Close">
                    ×
                </button>
            </div>

            <div id="label-content" class="label-content"></div>

            <div class="modal-footer">
                <button type="button"
                        class="btn btn-secondary"
                        id="label-cancel">
                    Close
                </button>

                <button type="button"
                        class="btn btn-primary"
                        id="label-print">
                    Print Label
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const style = document.createElement("style");

    style.textContent = `
        .label-modal {
            width: min(560px, calc(100vw - 24px));
        }

        .label-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 18px;
        }

        .label-card {
            border: 1px solid #dce5dc;
            border-radius: 10px;
            padding: 14px;
            text-align: center;
            min-width: 0;
        }

        .label-card h3 {
            color: #276221;
            margin-bottom: 8px;
        }

        .label-card p {
            font-size: 12px;
            overflow-wrap: anywhere;
            margin: 4px 0;
        }

        .label-card svg {
            width: 100%;
            height: auto;
        }

        @media (max-width: 520px) {
            .label-content {
                grid-template-columns: 1fr;
            }
        }

        @media print {
            body * {
                visibility: hidden !important;
            }

            #component-label-modal,
            #component-label-modal * {
                visibility: visible !important;
            }

            #component-label-modal {
                position: absolute;
                inset: 0;
                display: block !important;
                background: #fff;
            }

            #component-label-modal .modal {
                width: 100%;
                max-width: none;
                box-shadow: none;
                border: 0;
            }

            #component-label-modal .modal-header button,
            #component-label-modal .modal-footer {
                display: none !important;
            }
        }
    `;

    document.head.appendChild(style);

    const closeModal = () => {
        modal.hidden = true;
        document.body.style.overflow = "";
    };

    modal.querySelector("#label-close")
        .addEventListener("click", closeModal);

    modal.querySelector("#label-cancel")
        .addEventListener("click", closeModal);

    modal.querySelector("#label-print")
        .addEventListener("click", () => window.print());

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });
}

async function showComponentLabel(id) {
    const component = findComponent(id);

    if (!component) {
        return;
    }

    createLabelModal();

    const modal = document.getElementById("component-label-modal");
    const content = document.getElementById("label-content");

    content.innerHTML = `
        <div class="label-card">
            <h3>QR Code</h3>
            <div id="label-qr"></div>
            <p><strong>${escapeHTML(component.mpn)}</strong></p>
            <p>${escapeHTML(component.name)}</p>
        </div>

        <div class="label-card">
            <h3>Barcode</h3>
            <svg id="label-barcode"></svg>
            <p><strong>${escapeHTML(component.mpn)}</strong></p>
            <p>Stock: ${Number(component.stock) || 0}</p>
            <p>Location: ${escapeHTML(component.location || "Not assigned")}</p>
        </div>
    `;

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    try {
        await loadLibraries();

        const qrData = JSON.stringify({
            id: component.id,
            mpn: component.mpn,
            name: component.name,
            manufacturer: component.manufacturer,
            category: component.category,
            stock: Number(component.stock) || 0,
            location: component.location || ""
        });

        new window.QRCode(
            document.getElementById("label-qr"),
            {
                text: qrData,
                width: 150,
                height: 150,
                correctLevel: window.QRCode.CorrectLevel.M
            }
        );

        window.JsBarcode(
            "#label-barcode",
            String(component.mpn || component.id).slice(0, 80),
            {
                format: "CODE128",
                displayValue: true,
                fontSize: 12,
                height: 55,
                margin: 5
            }
        );
    } catch (error) {
        content.insertAdjacentHTML(
            "beforeend",
            "<p>Unable to generate labels. Check your internet connection.</p>"
        );

        console.error("Barcode generation failed:", error);
    }
}

function addLabelButtons() {
    const tableBody = document.getElementById("inventory-table-body");

    if (!tableBody) {
        return;
    }

    tableBody.querySelectorAll("tr").forEach(row => {
        const actions = row.querySelector(".table-actions");
        const editButton = row.querySelector(
            '[data-action="edit"][data-id]'
        );

        if (
            !actions ||
            !editButton ||
            actions.querySelector("[data-label-id]")
        ) {
            return;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.className = "action-button";
        button.dataset.labelId = editButton.dataset.id;
        button.title = "Generate QR and barcode label";
        button.setAttribute(
            "aria-label",
            "Generate component label"
        );

        button.innerHTML = '<i data-lucide="qr-code"></i>';

        actions.insertBefore(button, actions.firstChild);

        if (window.lucide) {
            window.lucide.createIcons({
                nodes: [button]
            });
        }
    });
}

export function initializeBarcodeLabels() {
    if (initialized) {
        return true;
    }

    const tableBody = document.getElementById("inventory-table-body");

    if (!tableBody) {
        console.warn("Barcode labels: inventory table not found.");
        return false;
    }

    createLabelModal();

    tableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-label-id]");

        if (button) {
            showComponentLabel(button.dataset.labelId);
        }
    });

    addLabelButtons();

    const observer = new MutationObserver(addLabelButtons);

    observer.observe(tableBody, {
        childList: true,
        subtree: true
    });

    initialized = true;

    return true;
}