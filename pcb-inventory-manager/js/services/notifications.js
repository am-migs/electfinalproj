
import { appState, updateState } from "../core/state.js";
import { escapeHTML, formatDate, getStockStatus } from "../core/utilities.js";

let initialized = false;

function getNotifications() {
    return Array.isArray(appState.notifications)
        ? appState.notifications
        : [];
}

function getCurrentAlerts() {
    const existing = getNotifications();
    const previousById = new Map(
        existing.map(notification => [notification.id, notification])
    );

    const generated = [];
    const settings = appState.settings || {};

    if (settings.notificationsEnabled !== false) {
        if (settings.minimumStockAlerts !== false) {
            (appState.inventory || []).forEach(component => {
                const status = getStockStatus(
                    component.stock,
                    component.minStock
                );

                if (status === "In Stock") return;

                const id = `stock-${component.id}`;
                const previous = previousById.get(id);

                generated.push({
                    id,
                    type: "stock",
                    title: status === "Out of Stock"
                        ? "Component Out of Stock"
                        : "Low Stock Warning",
                    message: `${component.name || component.mpn || "Component"} has ${Number(component.stock) || 0} unit(s) remaining. Minimum stock: ${Number(component.minStock) || 0}.`,
                    date: component.updatedAt || new Date().toISOString(),
                    read: previous?.read || false,
                    entityId: component.id
                });
            });
        }

        (appState.stockMovements || [])
            .slice(0, 20)
            .forEach(movement => {
                const id = `movement-${movement.id}`;
                const previous = previousById.get(id);
                const difference = Number(movement.quantityChanged) || 0;

                generated.push({
                    id,
                    type: "movement",
                    title: difference > 0
                        ? "Stock Added"
                        : difference < 0
                            ? "Stock Removed"
                            : "Stock Updated",
                    message: `${movement.componentName || movement.mpn || "Component"}: ${difference > 0 ? "+" : ""}${difference} unit(s). ${movement.reason || ""}`.trim(),
                    date: movement.date || new Date().toISOString(),
                    read: previous?.read || false,
                    entityId: movement.componentId
                });
            });
    }

    generated.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return generated;
}

function synchronizeNotifications() {
    const notifications = getCurrentAlerts();

    appState.notifications = notifications;
    updateState("notifications", notifications);

    return notifications;
}

function injectStyles() {
    if (document.getElementById("notification-center-styles")) return;

    const style = document.createElement("style");
    style.id = "notification-center-styles";

    style.textContent = `
        .notification-wrapper {
            position: relative;
        }

        #notification-button {
            position: relative;
        }

        .notification-count {
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            background: #c43d35;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
        }

        .notification-count[hidden] {
            display: none;
        }

        .notification-panel {
            position: fixed;
            top: 78px;
            right: 25px;
            z-index: 1000;
            width: min(390px, calc(100vw - 30px));
            max-height: min(560px, calc(100vh - 100px));
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #fff;
            border: 1px solid #CBDED3;
            border-radius: 13px;
            box-shadow: 0 12px 35px rgba(25, 55, 30, .18);
        }

        .notification-panel[hidden] {
            display: none;
        }

        .notification-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 17px;
            border-bottom: 1px solid #E2DFDA;
        }

        .notification-panel-header h3 {
            margin: 0;
            color: #276221;
            font-size: 15px;
        }

        .notification-panel-header button {
            border: 0;
            background: transparent;
            color: #3B8132;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
        }

        .notification-list {
            overflow-y: auto;
            padding: 7px 14px;
        }

        .notification-item {
            display: flex;
            gap: 11px;
            padding: 13px 3px;
            border-bottom: 1px solid #edf1ed;
        }

        .notification-item:last-child {
            border-bottom: 0;
        }

        .notification-item.unread {
            background: #f5faf3;
        }

        .notification-icon {
            width: 34px;
            height: 34px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9px;
            background: #e5f4e2;
            color: #276221;
        }

        .notification-icon.stock {
            background: #fff4d8;
            color: #946200;
        }

        .notification-icon.out {
            background: #fde8e7;
            color: #a52c25;
        }

        .notification-copy {
            min-width: 0;
            flex: 1;
        }

        .notification-copy strong {
            display: block;
            margin-bottom: 4px;
            color: #26352d;
            font-size: 12px;
        }

        .notification-copy p {
            margin: 0 0 5px;
            color: #718078;
            font-size: 11px;
            line-height: 1.5;
            overflow-wrap: anywhere;
        }

        .notification-copy small {
            color: #8a978f;
            font-size: 10px;
        }

        .notification-unread-dot {
            width: 7px;
            height: 7px;
            margin-top: 5px;
            flex-shrink: 0;
            border-radius: 50%;
            background: #3b8132;
        }

        .notification-empty {
            padding: 35px 15px;
            color: #718078;
            text-align: center;
            font-size: 12px;
        }

        @media (max-width: 480px) {
            .notification-panel {
                top: 70px;
                right: 10px;
                width: calc(100vw - 20px);
            }
        }
    `;

    document.head.appendChild(style);
}

function renderNotificationList() {
    const panel = document.getElementById("notification-panel");
    const list = document.getElementById("notification-list");

    if (!panel || !list) return;

    const notifications = synchronizeNotifications();

    if (!notifications.length) {
        list.innerHTML = `
            <div class="notification-empty">
                <p>No notifications at the moment.</p>
                <small>Stock alerts and inventory activity will appear here.</small>
            </div>
        `;
        updateNotificationCount();
        return;
    }

    list.innerHTML = notifications.map(notification => {
        const isOutOfStock =
            notification.type === "stock" &&
            notification.title.includes("Out of Stock");

        const iconClass = notification.type === "stock"
            ? (isOutOfStock ? "out" : "stock")
            : "";

        const icon = notification.type === "stock"
            ? "alert-triangle"
            : "package";

        const date = new Date(notification.date);
        const formattedDate = Number.isNaN(date.getTime())
            ? "Date unavailable"
            : formatDate(date);

        return `
            <article class="notification-item ${notification.read ? "" : "unread"}">
                <div class="notification-icon ${iconClass}">
                    <i data-lucide="${icon}"></i>
                </div>

                <div class="notification-copy">
                    <strong>${escapeHTML(notification.title)}</strong>
                    <p>${escapeHTML(notification.message)}</p>
                    <small>${escapeHTML(formattedDate)}</small>
                </div>

                ${notification.read ? "" : `
                    <span class="notification-unread-dot"
                        aria-label="Unread notification"></span>
                `}
            </article>
        `;
    }).join("");

    if (window.lucide) {
        window.lucide.createIcons();
    }

    updateNotificationCount();
}

function updateNotificationCount() {
    const countElement = document.getElementById("notification-count");
    if (!countElement) return;

    const unreadCount = getNotifications().filter(item => !item.read).length;

    countElement.textContent = unreadCount > 99
        ? "99+"
        : String(unreadCount);

    countElement.hidden = unreadCount === 0;
}

function markAllAsRead() {
    const notifications = getNotifications().map(notification => ({
        ...notification,
        read: true
    }));

    appState.notifications = notifications;
    updateState("notifications", notifications);

    renderNotificationList();
}

function togglePanel() {
    const panel = document.getElementById("notification-panel");
    if (!panel) return;

    const shouldOpen = panel.hidden;

    if (shouldOpen) {
        renderNotificationList();
    }

    panel.hidden = !shouldOpen;
}

function createNotificationPanel() {
    if (document.getElementById("notification-panel")) return;

    const panel = document.createElement("section");
    panel.id = "notification-panel";
    panel.className = "notification-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Notification center");

    panel.innerHTML = `
        <div class="notification-panel-header">
            <h3>Notifications</h3>
            <button type="button" id="mark-notifications-read">
                Mark all as read
            </button>
        </div>

        <div class="notification-list" id="notification-list">
            <div class="notification-empty">Loading notifications...</div>
        </div>
    `;

    document.body.appendChild(panel);
}

function initializeEvents() {
    const button = document.getElementById("notification-button");
    const panel = document.getElementById("notification-panel");
    const markReadButton = document.getElementById("mark-notifications-read");

    if (!button || !panel) {
        console.warn("Notification center could not find its required elements.");
        return false;
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        togglePanel();
    });

    markReadButton?.addEventListener("click", markAllAsRead);

    document.addEventListener("click", event => {
        if (
            !panel.hidden &&
            !panel.contains(event.target) &&
            !button.contains(event.target)
        ) {
            panel.hidden = true;
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            panel.hidden = true;
        }
    });

    return true;
}

export function refreshNotifications() {
    synchronizeNotifications();
    updateNotificationCount();

    if (!document.getElementById("notification-panel")?.hidden) {
        renderNotificationList();
    }
}

export function initializeNotifications() {
    if (initialized) return true;

    const button = document.getElementById("notification-button");

    if (!button) {
        console.warn("Notification initialization skipped: notification button not found.");
        return false;
    }

    injectStyles();

    const count = document.createElement("span");
    count.id = "notification-count";
    count.className = "notification-count";
    count.hidden = true;
    count.setAttribute("aria-live", "polite");
    button.appendChild(count);

    createNotificationPanel();

    if (!initializeEvents()) return false;

    synchronizeNotifications();
    updateNotificationCount();

    initialized = true;

    console.log("Notification center initialized successfully.");
    return true;
}
