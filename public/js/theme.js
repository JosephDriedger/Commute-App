// Applies the saved theme before the page paints, so there is no flash of the
// wrong colours. Loaded from <head> on every page.
(function () {
    var STORAGE_KEY = "commute-theme";

    function readTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY) || "system";
        } catch (err) {
            // Private browsing or blocked storage
            return "system";
        }
    }

    function applyTheme(theme) {
        if (theme === "light" || theme === "dark") {
            document.documentElement.setAttribute("data-theme", theme);
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
    }

    window.getTheme = readTheme;

    window.setTheme = function (theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (err) {
            // Keep the change for this page even if it can't be saved
        }
        applyTheme(theme);
    };

    applyTheme(readTheme());
})();
