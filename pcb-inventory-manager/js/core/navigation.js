
const pageInformation = {
    dashboard: {
        title: "Dashboard",
        description: "Overview of your PCB component inventory"
    },
    inventory: {
        title: "Inventory Catalog",
        description: "Manage and monitor your electronic components"
    },
    bom: {
        title: "BOM Manager",
        description: "Manage your bill of materials and projects"
    },
    pinout: {
        title: "Pinout Inspector",
        description: "Explore component pin configurations"
    },
    analytics: {
        title: "Analytics",
        description: "Review your inventory performance"
    },
    settings: {
        title: "Settings",
        description: "Manage your application preferences"
    }
};

let sidebarPinnedOpen = false;
let suppressSidebarHover = false;

export function initializeNavigation() {
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.querySelector("#sidebar-toggle");

    const navButtons = document.querySelectorAll("[data-page]");

    if (!sidebar || !sidebarToggle) {
        console.error("Navigation elements were not found.");
        return null;
    }

    // =================================================
    // SIDEBAR CONTROLS
    // =================================================

    function expandSidebar() {
        if (suppressSidebarHover || sidebarPinnedOpen) return;

        sidebar.classList.add("sidebar-expanded");
    }

    function collapseSidebar() {
        if (sidebarPinnedOpen || suppressSidebarHover) return;

        sidebar.classList.remove("sidebar-expanded");
    }

    function updateToggleButton() {
        sidebarToggle.setAttribute(
            "aria-expanded",
            String(sidebarPinnedOpen)
        );
    }

    sidebar.addEventListener("mouseenter", expandSidebar);
    sidebar.addEventListener("mouseleave", collapseSidebar);

    sidebarToggle.addEventListener("click", () => {
        sidebarPinnedOpen = !sidebarPinnedOpen;

        sidebar.classList.toggle(
            "sidebar-expanded",
            sidebarPinnedOpen
        );

        updateToggleButton();
    });

    // =================================================
    // PAGE NAVIGATION
    // =================================================

    function navigateToPage(pageId) {
        const pageInfo = pageInformation[pageId];

        if (!pageInfo) {
            console.warn(`Page "${pageId}" does not exist.`);
            return;
        }

        const targetPage = document.getElementById(pageId);

        if (!targetPage) {
            console.warn(`Page element "${pageId}" was not found.`);
            return;
        }

        // Hide all pages.
        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        // Display selected page.
        targetPage.classList.add("active");

        // Update navigation buttons.
        navButtons.forEach(button => {
            const isActive = button.dataset.page === pageId;

            button.classList.toggle("active", isActive);

            if (isActive) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        });

        // Update topbar title.
        const pageTitle = document.getElementById("page-title");

        if (pageTitle) {
            pageTitle.textContent = pageInfo.title;
        }

        // Update page description if available.
        const pageDescription = document.getElementById(
            "page-description"
        );

        if (pageDescription) {
            pageDescription.textContent = pageInfo.description;
        }

        // Close sidebar after navigation.
        sidebarPinnedOpen = false;
        sidebar.classList.remove("sidebar-expanded");

        updateToggleButton();

        // Return to top of page.
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    // =================================================
    // NAVIGATION EVENT LISTENERS
    // =================================================

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const pageId = button.dataset.page;

            navigateToPage(pageId);
        });
    });

    // =================================================
    // INITIAL ACTIVE PAGE
    // =================================================

    const activePage = document.querySelector(".page.active");

    if (activePage && pageInformation[activePage.id]) {
        navigateToPage(activePage.id);
    }

    // =================================================
    // RETURN NAVIGATION FUNCTIONS
    // =================================================

    return {
        navigateToPage,

        getCurrentPage() {
            return document.querySelector(".page.active")?.id || null;
        },

        expandSidebar() {
            sidebarPinnedOpen = true;
            sidebar.classList.add("sidebar-expanded");
            updateToggleButton();
        },

        collapseSidebar() {
            sidebarPinnedOpen = false;
            sidebar.classList.remove("sidebar-expanded");
            updateToggleButton();
        }
    };
}
