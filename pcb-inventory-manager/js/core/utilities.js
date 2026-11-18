
export function generateID(prefix = "PCB") {
    const timestamp = Date.now().toString(36).toUpperCase();

    const random = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
}

export function formatCurrency(amount, currency = "PHP") {
    const value = Number(amount) || 0;

    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

export function formatDate(date) {
    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(new Date(date));
}

export function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

export function validatePositiveNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function getStockStatus(stock, minimumStock) {
    const quantity = Number(stock);
    const minimum = Number(minimumStock);

    if (quantity <= 0) {
        return "Out of Stock";
    }

    if (quantity <= minimum) {
        return "Low Stock";
    }

    return "In Stock";
}

export function calculateInventoryValue(inventory) {
    return inventory.reduce((total, component) => {
        const price = Number(component.unitPrice) || 0;
        const quantity = Number(component.stock) || 0;

        return total + (price * quantity);
    }, 0);
}

export function calculatePercentage(part, total) {
    if (!total) return 0;

    return (Number(part) / Number(total)) * 100;
}
