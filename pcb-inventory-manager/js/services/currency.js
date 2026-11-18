const CACHE_KEY = "pcbManager_currencyRates";
const API_URL = "https://open.er-api.com/v6/latest/PHP";

const SUPPORTED_CURRENCIES = [
    "PHP",
    "USD",
    "EUR",
    "JPY",
    "SGD"
];

let rates = { PHP: 1 };
let updatedAt = null;
let request = null;
let initialized = false;

function loadCachedRates() {
    try {
        const cached = JSON.parse(
            localStorage.getItem(CACHE_KEY) || "null"
        );

        if (
            cached &&
            cached.base === "PHP" &&
            cached.rates &&
            typeof cached.rates === "object"
        ) {
            rates = {
                PHP: 1,
                ...cached.rates
            };

            updatedAt = cached.updatedAt || null;
        }
    } catch (error) {
        console.warn("Unable to load cached exchange rates.", error);
    }
}

function saveCachedRates() {
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                base: "PHP",
                rates,
                updatedAt
            })
        );
    } catch (error) {
        console.warn("Unable to save exchange rates.", error);
    }
}

export function convertFromPHP(amount, currency = "PHP") {
    const value = Number(amount) || 0;
    const rate = Number(rates[currency]);

    if (currency === "PHP" || !Number.isFinite(rate)) {
        return value;
    }

    return value * rate;
}

export function getCurrencyRate(currency = "PHP") {
    return Number(rates[currency]) ||
        (currency === "PHP" ? 1 : null);
}

export function getCurrencyInformation() {
    return {
        base: "PHP",
        rates: { ...rates },
        updatedAt,
        supportedCurrencies: [...SUPPORTED_CURRENCIES]
    };
}

export async function refreshCurrency() {
    if (request) {
        return request;
    }

    request = (async () => {
        const response = await fetch(API_URL, {
            headers: {
                Accept: "application/json"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Exchange-rate request failed: HTTP ${response.status}`
            );
        }

        const result = await response.json();

        if (result.result !== "success" || !result.rates) {
            throw new Error("Invalid exchange-rate response.");
        }

        const updatedRates = { PHP: 1 };

        SUPPORTED_CURRENCIES.forEach(currency => {
            const rate = Number(result.rates[currency]);

            if (Number.isFinite(rate) && rate > 0) {
                updatedRates[currency] = rate;
            }
        });

        rates = updatedRates;
        updatedAt =
            result.time_last_update_utc ||
            new Date().toISOString();

        saveCachedRates();

        window.dispatchEvent(
            new CustomEvent("pcb:currency-updated", {
                detail: getCurrencyInformation()
            })
        );

        window.PCBManager?.refreshAnalytics?.();

        return getCurrencyInformation();
    })();

    try {
        return await request;
    } finally {
        request = null;
    }
}

export async function initializeCurrency() {
    if (initialized) {
        return getCurrencyInformation();
    }

    initialized = true;
    loadCachedRates();

    document.addEventListener("change", event => {
        if (event.target?.id === "settings-currency") {
            window.PCBManager?.refreshAnalytics?.();
        }
    });

    try {
        return await refreshCurrency();
    } catch (error) {
        console.warn(
            "Live exchange rates unavailable. Using cached rates or PHP.",
            error
        );

        return getCurrencyInformation();
    }
}