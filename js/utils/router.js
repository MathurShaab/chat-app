export const Router = {
    // Browser ka title dynamically change karne ke liye
    setViewTitle(viewName) {
        const formatName = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        document.title = `Nexus Chat | ${formatName}`;
    },

    // Current page track karne ke liye system utility
    getCurrentRoute() {
        return window.location.hash || '#/login';
    }
};