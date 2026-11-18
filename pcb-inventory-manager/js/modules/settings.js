    
import { appState, updateState } from "../core/state.js";
import { escapeHTML } from "../core/utilities.js";
import { exportStoredData } from "../core/storage.js";

const CURRENCIES = [
    { code: "PHP", name: "Philippine Peso (₱)" },
    { code: "USD", name: "US Dollar ($)" },
    { code: "EUR", name: "Euro (€)" },
    { code: "JPY", name: "Japanese Yen (¥)" },
    { code: "SGD", name: "Singapore Dollar (S$)" }
];

function getInitials(name) {
    return String(name || "Administrator")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "AD";
}

function addSettingsStyles() {
    if (document.getElementById("settings-module-styles")) return;

    const style = document.createElement("style");
    style.id = "settings-module-styles";

    style.textContent = `
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
        }

        .settings-card {
            padding: 23px;
            background: #fff;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-sm);
        }

        .settings-card h3 {
            color: var(--primary);
            font-size: 15px;
            margin-bottom: 5px;
        }

        .settings-description {
            color: var(--text-secondary);
            font-size: 11px;
            margin-bottom: 20px;
        }

        .settings-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 18px;
        }

        .settings-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 13px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .settings-toggle:last-child {
            border-bottom: none;
        }

        .settings-toggle strong {
            display: block;
            font-size: 12px;
            color: var(--text-primary);
        }

        .settings-toggle small {
            display: block;
            color: var(--text-secondary);
            font-size: 10px;
            margin-top: 3px;
        }

        .settings-toggle input {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
        }

        .settings-message {
            margin-top: 12px;
            font-size: 11px;
            color: var(--primary);
        }

        .settings-danger {
            border-color: #EBC6BF;
        }

        @media (max-width: 768px) {
            .settings-grid {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(style);
}

function addSettingsPage() {
    const sidebarNav = document.querySelector(".sidebar-nav");
    const pageContent = document.querySelector(".page-content");

    if (!sidebarNav || !pageContent) {
        throw new Error("Settings page containers were not found.");
    }

    if (!document.querySelector('[data-page="settings"]')) {
        const button = document.createElement("button");
        button.className = "nav-link";
        button.dataset.page = "settings";
        button.innerHTML = `
            <i data-lucide="settings"></i>
            <span>Settings</span>
        `;

        sidebarNav.appendChild(button);
    }

    if (!document.getElementById("settings")) {
        const section = document.createElement("section");
        section.className = "page";
        section.id = "settings";

        section.innerHTML = `
            <div class="section-heading">
                <div>
                    <h2>Settings and Profile</h2>
                    <p>Manage your administrator profile and application preferences.</p>
                </div>
            </div>

            <div class="settings-grid">
                <div class="settings-card">
                    <h3>Administrator Profile</h3>
                    <p class="settings-description">
                        Update the profile information displayed in the application.
                    </p>

                    <form id="settings-profile-form">
                        <div class="form-group">
                            <label for="settings-name">Full Name</label>
                            <input id="settings-name" name="name"
                                type="text" maxlength="80" required>
                        </div>

                        <div class="form-group">
                            <label for="settings-email">Email Address</label>
                            <input id="settings-email" name="email"
                                type="email" maxlength="120">
                        </div>

                        <div class="form-group">
                            <label for="settings-role">Role</label>
                            <input id="settings-role" name="role"
                                type="text" maxlength="60" required>
                        </div>

                        <button class="primary-button" type="submit">
                            Save Profile
                        </button>
                    </form>

                    <p class="settings-message" id="profile-message"
                        aria-live="polite"></p>
                </div>

                <div class="settings-card">
                    <h3>Application Preferences</h3>
                    <p class="settings-description">
                        Configure how the inventory manager displays information.
                    </p>

                    <div class="form-group">
                        <label for="settings-currency">Display Currency</label>
                        <select id="settings-currency">
                            ${CURRENCIES.map(currency => `
                                <option value="${currency.code}">
                                    ${currency.name}
                                </option>
                            `).join("")}
                        </select>
                        <small>Changing currency updates displayed currency formatting. It does not convert stored component prices.</small>
                    </div>

                    <div class="settings-toggle">
                        <div>
                            <strong>Low Stock Alerts</strong>
                            <small>Enable alerts for components at or below minimum stock.</small>
                        </div>
                        <input type="checkbox" id="settings-low-stock">
                    </div>

                    <div class="settings-toggle">
                        <div>
                            <strong>Notifications</strong>
                            <small>Enable application notification preferences.</small>
                        </div>
                        <input type="checkbox" id="settings-notifications">
                    </div>

                    <p class="settings-message" id="preferences-message"
                        aria-live="polite"></p>
                </div>

                <div class="settings-card">
                    <h3>Data Backup</h3>
                    <p class="settings-description">
                        Download a JSON backup of your locally stored application data.
                    </p>

                    <button class="secondary-button" id="settings-export">
                        <i data-lucide="download"></i>
                        Export Data Backup
                    </button>

                    <p class="settings-message" id="backup-message"
                        aria-live="polite"></p>
                </div>

                <div class="settings-card">
                    <h3>Application Information</h3>
                    <p class="settings-description">
                        Current application details.
                    </p>

                    <div class="settings-toggle">
                        <div>
                            <strong>Application</strong>
                            <small>PCB Component BOM & Inventory Manager</small>
                        </div>
                    </div>

                    <div class="settings-toggle">
                        <div>
                            <strong>Storage</strong>
                            <small>Browser LocalStorage</small>
                        </div>
                    </div>

                    <div class="settings-toggle">
                        <div>
                            <strong>Version</strong>
                            <small>1.0.0 – Frontend Development</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        pageContent.appendChild(section);
    }
}

function loadProfileForm() {
    const profile = appState.profile || {};

    document.getElementById("settings-name").value =
        profile.name || "Administrator";

    document.getElementById("settings-email").value =
        profile.email || "";

    document.getElementById("settings-role").value =
        profile.role || "Administrator";
}

function loadPreferences() {
    const settings = appState.settings || {};

    document.getElementById("settings-currency").value =
        settings.currency || "PHP";

    document.getElementById("settings-low-stock").checked =
        settings.minimumStockAlerts !== false;

    document.getElementById("settings-notifications").checked =
        settings.notificationsEnabled !== false;
}

function updateTopbarProfile() {
    const profile = appState.profile || {};
    const name = profile.name || "Administrator";
    const role = profile.role || "Inventory Manager";

    const avatar = document.querySelector(".user-avatar");
    const profileDetails = document.querySelector(".user-profile");

    if (avatar) {
        avatar.textContent = getInitials(name);
    }

    if (profileDetails) {
        const strong = profileDetails.querySelector("strong");
        const span = profileDetails.querySelector("span");

        if (strong) strong.textContent = name;
        if (span) span.textContent = role;
    }
}

function saveProfile(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const profile = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        role: String(formData.get("role") || "").trim()
    };

    if (!profile.name || !profile.role) {
        return;
    }

    profile.initials = getInitials(profile.name);

    const saved = updateState("profile", profile);

    const message = document.getElementById("profile-message");

    if (saved) {
        updateTopbarProfile();
        message.textContent = "Profile updated successfully.";
    } else {
        message.textContent = "Unable to save profile.";
    }
}

function savePreferences() {
    const settings = {
        ...appState.settings,
        currency: document.getElementById("settings-currency").value,
        minimumStockAlerts: document.getElementById("settings-low-stock").checked,
        notificationsEnabled: document.getElementById("settings-notifications").checked
    };

    const saved = updateState("settings", settings);

    const message = document.getElementById("preferences-message");

    if (saved) {
        message.textContent =
            "Preferences saved. Reload the application to apply currency changes everywhere.";
    } else {
        message.textContent = "Unable to save preferences.";
    }
}

function exportBackup() {
    const backup = {
        application: "PCB Component BOM & Inventory Manager",
        exportedAt: new Date().toISOString(),
        data: exportStoredData()
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pcb-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    document.getElementById("backup-message").textContent =
        "Backup file generated successfully.";
}

export function initializeSettings() {
    addSettingsStyles();
    addSettingsPage();

    loadProfileForm();
    loadPreferences();
    updateTopbarProfile();

    document.getElementById("settings-profile-form")
        .addEventListener("submit", saveProfile);

    document.getElementById("settings-currency")
        .addEventListener("change", savePreferences);

    document.getElementById("settings-low-stock")
        .addEventListener("change", savePreferences);

    document.getElementById("settings-notifications")
        .addEventListener("change", savePreferences);

    document.getElementById("settings-export")
        .addEventListener("click", exportBackup);

    if (window.lucide) {
        window.lucide.createIcons();
    }

    console.log("Settings module initialized.");
}
