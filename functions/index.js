// https://expressjs.com/en/guide/routing.html


// REQUIRES
const express = require("express");
const path = require("path");

// Running this file directly (npm start / npm run dev) serves the app with
// Express alone; firebase-functions is only loaded when Cloud Functions
// requires this module.
const isLocalServer = require.main === module;

const app = express();
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

// Resolve paths from this file rather than the working directory,
// so the server works no matter where it is started from.
const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "app", "html");

// just like a simple web server like Apache web server
// we are mapping file system paths to the app's virtual paths
app.use("/js", express.static(path.join(ROOT, "public", "js")));
app.use("/css", express.static(path.join(ROOT, "public", "css")));
app.use("/img", express.static(path.join(ROOT, "public", "img")));
app.use("/text", express.static(path.join(ROOT, "public", "text")));
app.use("/data", express.static(path.join(ROOT, "app", "data", "json")));

// Virtual path -> HTML file (relative to app/html)
const pages = {
    "/": "index.html",
    "/login": "login.html",
    "/signup": "signup.html",
    "/main": "main.html",

    /* Dropdown Pages */
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

Object.entries(pages).forEach(([route, file]) => {
    app.get(route, function (req, res) {
        res.sendFile(path.join(HTML, file));
    });
});

// for resource not found (i.e., 404)
app.use(function (req, res, next) {
    res.status(404).send("<html><head><title>Page not found!</title></head><body><p>Nothing here.</p></body></html>");
});

// RUN SERVER (npm start / npm run dev), otherwise export for Cloud Functions
if (isLocalServer) {
    // Port from `npm run dev -- --port 3000`, the PORT variable, or the default.
    const portFlag = process.argv.indexOf("--port");
    const port = (portFlag > -1 && process.argv[portFlag + 1]) || process.env.PORT || 8000;

    const server = app.listen(port, function () {
        console.log("Commute! is running at http://localhost:" + port);
    });

    server.on("error", function (error) {
        if (error.code === "EADDRINUSE") {
            console.error("\nPort " + port + " is already in use - the app may already be running.");
            console.error("Close the other server, or start this one on a different port:");
            console.error("    npm run dev -- --port 3000   (or set PORT=3000)\n");
            process.exit(1);
        }
        throw error;
    });
} else {
    const functions = require("firebase-functions");
    exports.app = functions.https.onRequest(app);
}
