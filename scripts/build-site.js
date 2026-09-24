// Builds the static site that Firebase Hosting serves, into dist/.
//
// Locally the Express server in functions/index.js maps tidy paths like /routes
// to app/html/dropdown/routes.html. Firebase Hosting on the free plan serves
// files only, so this flattens the pages to the root of dist/ and copies the
// assets to the paths the pages already reference (./css, ./js, ./img, ./text,
// ./data). "cleanUrls" in firebase.json then serves routes.html at /routes.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// Pages the server routes, and where they live
const PAGES = [
    "index.html",
    "login.html",
    "signup.html",
    "main.html",
    "dropdown/profile.html",
    "dropdown/notifications.html",
    "dropdown/routes.html",
    "dropdown/places.html",
    "dropdown/schedule.html",
    "dropdown/passwordReset.html",
    "dropdown/privacy.html",
    "dropdown/language.html",
    "dropdown/help.html",
    "dropdown/themes.html"
];

// Folder in the repo -> folder in dist
const ASSETS = [
    ["public/css", "css"],
    ["public/js", "js"],
    ["public/img", "img"],
    ["public/text", "text"],
    ["app/data/json", "data"]
];

function copyDir(from, to) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from, { withFileTypes: true }).forEach(entry => {
        let source = path.join(from, entry.name);
        let target = path.join(to, entry.name);
        if (entry.isDirectory()) {
            copyDir(source, target);
        } else {
            fs.copyFileSync(source, target);
        }
    });
}

function build() {
    fs.rmSync(DIST, { recursive: true, force: true });
    fs.mkdirSync(DIST, { recursive: true });

    PAGES.forEach(page => {
        let source = path.join(ROOT, "app", "html", page);
        if (!fs.existsSync(source)) {
            throw new Error("Missing page: " + page);
        }
        // dropdown/routes.html is served at /routes, so it goes to the root
        fs.copyFileSync(source, path.join(DIST, path.basename(page)));
    });

    ASSETS.forEach(([from, to]) => {
        let source = path.join(ROOT, from);
        if (!fs.existsSync(source)) {
            throw new Error("Missing assets: " + from);
        }
        copyDir(source, path.join(DIST, to));
    });

    writeNotFoundPage();

    console.log("Built " + PAGES.length + " pages into dist/");
}

function writeNotFoundPage() {
    let page = `<!DOCTYPE html>
<html lang="en">

<head>
    <title>Page Not Found · Commute!</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/img/icon.png" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous" />
    <link rel="stylesheet" href="/css/style.css">
    <script src="/js/theme.js"></script>
</head>

<body>
    <main class="auth-wrap">
        <div class="auth-card">
            <img src="/img/icon.png" width="64" height="64" alt="Commute! logo" />
            <h1>Page Not Found</h1>
            <p>That page does not exist. It may have moved.</p>
            <a class="btn btn-primary btn-lg" href="/">Back to Commute!</a>
        </div>
    </main>
</body>

</html>
`;
    fs.writeFileSync(path.join(DIST, "404.html"), page);
}

build();
