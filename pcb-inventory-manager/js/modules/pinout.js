
import { PINOUT_DEVICES } from "../data/pinout-data.js";
import { escapeHTML } from "../core/utilities.js";

let selectedDeviceId = PINOUT_DEVICES[0]?.id || "";
let selectedPinNumber = null;
let searchQuery = "";
let pinoutEventsInitialized = false;

function getSelectedDevice() {
    return PINOUT_DEVICES.find(device => device.id === selectedDeviceId)
        || PINOUT_DEVICES[0];
}

function getSelectedPin(device) {
    if (!device) return null;

    return device.pins.find(pin => pin.number === selectedPinNumber)
        || device.pins[0]
        || null;
}

function getTypeClass(type) {
    const normalized = String(type || "").toLowerCase();

    if (normalized.includes("power")) return "power";
    if (normalized.includes("ground")) return "ground";
    if (normalized.includes("analog")) return "analog";
    if (normalized.includes("pwm")) return "pwm";
    if (normalized.includes("uart")) return "uart";
    if (normalized.includes("spi")) return "spi";
    if (normalized.includes("i2c")) return "i2c";
    if (normalized.includes("reset") || normalized.includes("control")) return "control";
    if (normalized.includes("clock")) return "clock";

    return "gpio";
}

function getFilteredPins(device) {
    if (!device) return [];

    const query = searchQuery.trim().toLowerCase();

    if (!query) return device.pins;

    return device.pins.filter(pin => {
        const searchable = [
            pin.number,
            pin.name,
            pin.type,
            pin.function,
            pin.notes
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });
}

function injectPinoutStyles() {
    if (document.getElementById("pinout-module-styles")) return;

    const style = document.createElement("style");
    style.id = "pinout-module-styles";

    style.textContent = `
        .pinout-layout {
            display: grid;
            gap: 20px;
        }

        .pinout-toolbar {
            display: grid;
            grid-template-columns: minmax(180px, 1fr) minmax(220px, 2fr);
            gap: 12px;
        }

        .pinout-toolbar select,
        .pinout-toolbar input {
            width: 100%;
            min-height: 43px;
            padding: 10px 12px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 8px;
            background: #fff;
            color: var(--text-primary, #26352d);
            font: inherit;
        }

        .pinout-device-heading {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 18px;
        }

        .pinout-device-heading h3 {
            margin: 0 0 6px;
            color: var(--text-primary, #26352d);
            font-size: 18px;
        }

        .pinout-device-heading p {
            margin: 0;
            color: var(--text-secondary, #718078);
            font-size: 13px;
            line-height: 1.6;
        }

        .pinout-package-label {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 20px;
            background: #e8f2e6;
            color: var(--primary, #276221);
            font-size: 11px;
            font-weight: 700;
        }

        .pinout-workspace {
            display: grid;
            grid-template-columns: minmax(0, 1.5fr) minmax(250px, .8fr);
            gap: 18px;
            align-items: start;
        }

        .pinout-board {
            min-width: 0;
            padding: 18px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 12px;
            background: #f7faf7;
        }

        .pinout-board-title {
            margin: 0 0 14px;
            text-align: center;
            color: var(--text-secondary, #718078);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        .pinout-chip {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(105px, .85fr) minmax(0, 1fr);
            align-items: stretch;
            gap: 5px;
            max-width: 650px;
            margin: 0 auto;
        }

        .pinout-side {
            display: grid;
            align-content: center;
            gap: 5px;
        }

        .pinout-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100%;
            padding: 12px 6px;
            border: 2px solid #234b2b;
            border-radius: 12px;
            background: linear-gradient(145deg, #3b8132, #276221);
            color: #fff;
            text-align: center;
        }

        .pinout-center-icon {
            display: grid;
            place-items: center;
            width: 42px;
            height: 42px;
            margin-bottom: 12px;
            border: 1px solid rgba(255,255,255,.35);
            border-radius: 10px;
            background: rgba(255,255,255,.12);
            font-size: 21px;
        }

        .pinout-center strong {
            font-size: 13px;
            line-height: 1.4;
            overflow-wrap: anywhere;
        }

        .pinout-center small {
            margin-top: 7px;
            color: #d8ebd5;
            font-size: 10px;
        }

        .pinout-pin {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 5px;
            min-width: 0;
            min-height: 34px;
            padding: 6px 8px;
            border: 1px solid #d9e2d8;
            border-radius: 6px;
            background: #fff;
            color: #314238;
            cursor: pointer;
            font-size: 10px;
            text-align: left;
            transition: .15s ease;
        }

        .pinout-pin:hover {
            border-color: var(--primary, #276221);
            background: #edf6eb;
        }

        .pinout-pin.active {
            border-color: var(--primary, #276221);
            background: #dff0dc;
            box-shadow: 0 0 0 2px rgba(39,98,33,.12);
            color: #1e4c19;
            font-weight: 700;
        }

        .pinout-pin-number {
            flex: 0 0 auto;
            color: #718078;
            font-size: 9px;
        }

        .pinout-pin-name {
            min-width: 0;
            overflow-wrap: anywhere;
            font-weight: 600;
        }

        .pinout-side.left .pinout-pin {
            flex-direction: row;
        }

        .pinout-side.right .pinout-pin {
            flex-direction: row-reverse;
            text-align: right;
        }

        .pinout-side.right .pinout-pin-number {
            text-align: right;
        }

        .pinout-detail {
            padding: 18px;
            border: 1px solid var(--border-color, #e2dfda);
            border-radius: 12px;
            background: #fff;
        }

        .pinout-detail h3 {
            margin: 0 0 5px;
            color: var(--text-primary, #26352d);
            font-size: 18px;
            overflow-wrap: anywhere;
        }

        .pinout-detail-subtitle {
            margin: 0 0 16px;
            color: var(--text-secondary, #718078);
            font-size: 12px;
        }

        .pinout-type-badge {
            display: inline-block;
            margin-bottom: 16px;
            padding: 6px 9px;
            border-radius: 20px;
            background: #e8f2e6;
            color: #276221;
            font-size: 11px;
            font-weight: 700;
        }

        .pinout-type-badge.power {
            background: #fff1d9;
            color: #946200;
        }

        .pinout-type-badge.ground {
            background: #e8e9ec;
            color: #444b55;
        }

        .pinout-type-badge.analog {
            background: #e6efff;
            color: #285a9c;
        }

        .pinout-type-badge.uart,
        .pinout-type-badge.spi,
        .pinout-type-badge.i2c {
            background: #f0e9fb;
            color: #6941a5;
        }

        .pinout-detail-block {
            padding: 13px 0;
            border-top: 1px solid var(--border-color, #e2dfda);
        }

        .pinout-detail-block span {
            display: block;
            margin-bottom: 6px;
            color: var(--text-secondary, #718078);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .06em;
            text-transform: uppercase;
        }

        .pinout-detail-block p {
            margin: 0;
            color: var(--text-primary, #26352d);
            font-size: 13px;
            line-height: 1.6;
        }

        .pinout-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 9px 14px;
            margin-top: 18px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color, #e2dfda);
        }

        .pinout-legend span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--text-secondary, #718078);
            font-size: 10px;
        }

        .pinout-legend i {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #3b8132;
        }

        .pinout-legend i.power {
            background: #d49b35;
        }

        .pinout-legend i.ground {
            background: #69717c;
        }

        .pinout-legend i.analog {
            background: #3978c6;
        }

        .pinout-legend i.communication {
            background: #9065c4;
        }

        .pinout-results {
            margin-top: 15px;
            color: var(--text-secondary, #718078);
            font-size: 12px;
        }

        .pinout-empty {
            grid-column: 1 / -1;
            padding: 28px 12px;
            color: var(--text-secondary, #718078);
            text-align: center;
            font-size: 13px;
        }

        .pinout-disclaimer {
            padding: 12px 14px;
            border-left: 3px solid #d2a33d;
            border-radius: 6px;
            background: #fff8e9;
            color: #745a20;
            font-size: 11px;
            line-height: 1.6;
        }

        @media (max-width: 850px) {
            .pinout-workspace {
                grid-template-columns: 1fr;
            }

            .pinout-detail {
                order: -1;
            }
        }

        @media (max-width: 560px) {
            .pinout-toolbar {
                grid-template-columns: 1fr;
            }

            .pinout-board {
                padding: 9px;
            }

            .pinout-chip {
                grid-template-columns: minmax(0, 1fr) 76px minmax(0, 1fr);
                gap: 3px;
            }

            .pinout-pin {
                min-height: 36px;
                padding: 5px 4px;
                font-size: 9px;
            }

            .pinout-pin-number {
                font-size: 8px;
            }

            .pinout-center {
                padding: 7px 3px;
            }

            .pinout-center-icon {
                width: 30px;
                height: 30px;
                font-size: 15px;
            }

            .pinout-center strong {
                font-size: 10px;
            }

            .pinout-center small {
                font-size: 8px;
            }
        }
    `;

    document.head.appendChild(style);
}

function renderPinButton(pin) {
    const active = pin.number === selectedPinNumber;
    const sideLabel = pin.side === "left" ? "left" : "right";

    return `
        <button
            type="button"
            class="pinout-pin ${active ? "active" : ""}"
            data-pin-number="${pin.number}"
            aria-pressed="${active}"
            title="${escapeHTML(pin.name)} — ${escapeHTML(pin.function)}"
        >
            <span class="pinout-pin-number">${pin.number}</span>
            <span class="pinout-pin-name">${escapeHTML(pin.name)}</span>
        </button>
    `;
}

function renderPinDetail(pin) {
    if (!pin) {
        return `
            <div class="pinout-detail">
                <div class="pinout-empty">Select a pin to view its details.</div>
            </div>
        `;
    }

    const typeClass = getTypeClass(pin.type);

    return `
        <aside class="pinout-detail" aria-live="polite">
            <h3>${escapeHTML(pin.name)}</h3>
            <p class="pinout-detail-subtitle">Physical Pin ${pin.number}</p>

            <span class="pinout-type-badge ${typeClass}">
                ${escapeHTML(pin.type)}
            </span>

            <div class="pinout-detail-block">
                <span>Pin Function</span>
                <p>${escapeHTML(pin.function)}</p>
            </div>

            <div class="pinout-detail-block">
                <span>Additional Information</span>
                <p>${escapeHTML(pin.notes)}</p>
            </div>
        </aside>
    `;
}

function renderPinout() {
    const page = document.getElementById("pinout");
    if (!page) return;

    const device = getSelectedDevice();

    let content = document.getElementById("pinout-module-content");

    if (!content) {
        content = document.createElement("div");
        content.id = "pinout-module-content";
        page.appendChild(content);
    }

    if (!device) {
        content.innerHTML = `
            <div class="panel">
                <p class="pinout-empty">No pinout data is available.</p>
            </div>
        `;
        return;
    }

    const filteredPins = getFilteredPins(device);
    const leftPins = filteredPins.filter(pin => pin.side === "left");
    const rightPins = filteredPins.filter(pin => pin.side === "right");

    if (!filteredPins.some(pin => pin.number === selectedPinNumber)) {
        selectedPinNumber = filteredPins[0]?.number ?? null;
    }

    const selectedPin = getSelectedPin(device);

    content.innerHTML = `
        <div class="pinout-layout">
            <div class="pinout-toolbar">
                <select id="pinout-device-select" aria-label="Select microcontroller">
                    ${PINOUT_DEVICES.map(item => `
                        <option value="${escapeHTML(item.id)}"
                            ${item.id === selectedDeviceId ? "selected" : ""}>
                            ${escapeHTML(item.name)}
                        </option>
                    `).join("")}
                </select>

                <input
                    type="search"
                    id="pinout-search"
                    placeholder="Search pin number, name, or function..."
                    value="${escapeHTML(searchQuery)}"
                    aria-label="Search pins"
                >
            </div>

            <div class="panel">
                <div class="pinout-device-heading">
                    <div>
                        <h3>${escapeHTML(device.name)}</h3>
                        <p>${escapeHTML(device.manufacturer)} · ${escapeHTML(device.description)}</p>
                    </div>

                    <span class="pinout-package-label">
                        ${escapeHTML(device.package)}
                    </span>
                </div>

                <div class="pinout-workspace">
                    <div class="pinout-board">
                        <p class="pinout-board-title">Pin Configuration</p>

                        ${filteredPins.length ? `
                            <div class="pinout-chip">
                                <div class="pinout-side left">
                                    ${leftPins.map(renderPinButton).join("")}
                                </div>

                                <div class="pinout-center">
                                    <div class="pinout-center-icon">⌘</div>
                                    <strong>${escapeHTML(device.name)}</strong>
                                    <small>${device.pins.length} PIN REFERENCES</small>
                                </div>

                                <div class="pinout-side right">
                                    ${rightPins.map(renderPinButton).join("")}
                                </div>
                            </div>
                        ` : `
                            <div class="pinout-empty">
                                No pins match your search.
                            </div>
                        `}

                        <p class="pinout-results">
                            Showing ${filteredPins.length} of ${device.pins.length} pins
                        </p>

                        <div class="pinout-legend">
                            <span><i></i> GPIO / Digital</span>
                            <span><i class="power"></i> Power</span>
                            <span><i class="ground"></i> Ground</span>
                            <span><i class="analog"></i> Analog</span>
                            <span><i class="communication"></i> Communication</span>
                        </div>
                    </div>

                    ${renderPinDetail(selectedPin)}
                </div>
            </div>

            <div class="pinout-disclaimer">
                Pin functions may vary depending on the exact board revision and configuration.
                Always verify electrical limits, startup/strapping behavior, and connections
                against the manufacturer's datasheet before building a circuit.
            </div>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function initializePinoutEvents() {
    const page = document.getElementById("pinout");
    if (!page) return;

    page.addEventListener("change", event => {
        if (event.target.id === "pinout-device-select") {
            selectedDeviceId = event.target.value;
            selectedPinNumber = null;
            searchQuery = "";
            renderPinout();
        }
    });

    page.addEventListener("input", event => {
        if (event.target.id === "pinout-search") {
            const cursorPosition = event.target.selectionStart;
            searchQuery = event.target.value;
            renderPinout();

            const searchInput = document.getElementById("pinout-search");

            if (searchInput) {
                searchInput.focus();
                searchInput.setSelectionRange(cursorPosition, cursorPosition);
            }
        }
    });

    page.addEventListener("click", event => {
        const pinButton = event.target.closest("[data-pin-number]");

        if (!pinButton) return;

        selectedPinNumber = Number(pinButton.dataset.pinNumber);
        renderPinout();
    });

    document.querySelectorAll("[data-page='pinout']").forEach(button => {
        button.addEventListener("click", () => {
            renderPinout();
        });
    });
}

export function initializePinout() {
    const page = document.getElementById("pinout");

    if (!page) {
        console.warn("Pinout initialization skipped: #pinout was not found.");
        return false;
    }

    injectPinoutStyles();
    renderPinout();

    if (!pinoutEventsInitialized) {
        initializePinoutEvents();
        pinoutEventsInitialized = true;
    }

    console.log("Pinout module initialized successfully.");
    return true;
}

export function refreshPinout() {
    renderPinout();
}
