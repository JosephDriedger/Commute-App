// Local development server. No dependencies: Node's own http module only.
//
// It serves the source folders directly, using the same tidy paths Firebase
// Hosting serves in production ("/routes", not "/routes.html"), so you can edit
// a page and refresh without rebuilding. Run `npm run preview` instead to check
// the built dist/ through the real Firebase emulator before deploying.

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "app", "html");

// Port from `npm run dev -- --port 3000`, the PORT variable, or the default.
const portFlag = process.argv.indexOf("--port");
const PORT = Number((portFlag > -1 && process.argv[portFlag + 1]) || process.env.PORT || 8000);

// Tidy path -> page, matching the pages that build-site.js publishes
const PAGES = {
    "/": "index.html",
    "/login": "login.html",
    "/signup": "signup.html",
    "/main": "main.html",
    "/profile": "dropdown/profile.html",
    "/notifications": "dropdown/notifications.html",
    "/routes": "dropdown/routes.html",
    "/places": "dropdown/places.html",
    "/schedule": "dropdown/schedule.html",
    "/passwordReset": "dropdown/passwordReset.html",
    "/privacy": "dropdown/privacy.html",
    "/language": "dropdown/language.html",
    "/help": "dropdown/help.html",
    "/themes": "dropdown/themes.html"
};

// URL prefix -> folder on disk
const ASSETS = {
    "/css": path.join(ROOT, "public", "css"),
    "/js": path.join(ROOT, "public", "js"),
    "/img": path.join(ROOT, "public", "img"),
    "/text": path.join(ROOT, "public", "text"),
    "/data": path.join(ROOT, "app", "data", "json")
};

const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2"
};

function sendFile(res, file) {
    fs.readFile(file, (error, body) => {
        if (error) {
            sendNotFound(res);
            return;
        }
        res.writeHead(200, {
            "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
            "Cache-Control": "no-cache"
        });
        res.end(body);
    });
}

function sendNotFound(res) {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end("<!DOCTYPE html><html><head><title>Page Not Found</title></head>" +
        "<body style=\"font-family: system-ui; padding: 2rem\">" +
        "<h1>Page Not Found</h1><p><a href=\"/\">Back to Commute!</a></p></body></html>");
}

const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);

    // Firebase redirects /routes.html to /routes, so do the same here
    if (urlPath.endsWith(".html") && PAGES[urlPath.slice(0, -5)]) {
        res.writeHead(301, { Location: urlPath.slice(0, -5) });
        res.end();
        return;
    }

    if (PAGES[urlPath]) {
        sendFile(res, path.join(HTML, PAGES[urlPath]));
        return;
    }

    let prefix = Object.keys(ASSETS).find(key => urlPath.startsWith(key + "/"));
    if (prefix) {
        let file = path.join(ASSETS[prefix], urlPath.slice(prefix.length + 1));
        // Stay inside the folder we are serving
        if (file.startsWith(ASSETS[prefix])) {
            sendFile(res, file);
            return;
        }
    }

    sendNotFound(res);
});

server.on("error", error => {
    if (error.code === "EADDRINUSE") {
        console.error("\nPort " + PORT + " is already in use - the app may already be running.");
        console.error("Close the other server, or start this one on a different port:");
        console.error("    npm run dev -- --port 3000   (or set PORT=3000)\n");
        process.exit(1);
    }
    throw error;
});

server.listen(PORT, () => {
    console.log("Commute! is running at http://localhost:" + PORT);
});
