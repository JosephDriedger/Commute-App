// Trip planner on the map page: pick a start and destination, choose a mode,
// and draw real directions. Suggestions come from places.json first, then from
// an address lookup.
var places = {};
var tripMode = "Drive";
var tripEnds = { from: null, to: null };   // {label, lat, lng}
var activeField = null;
var lookupTimer = null;
var lastRoute = null;
var userPlaces = [];   // the ones saved on the Places page

function loadSearchbar() {
    $('#searchbarPlaceholder').load('./text/search.html', function () {
        wirePlanner();
        loadPlaces();
        loadUserPlaces();
    });
}
loadSearchbar();  //invoke the function

function wirePlanner() {
    document.querySelectorAll('.trip-input').forEach(input => {
        input.addEventListener("focus", () => openSuggestions(input.dataset.field));
        input.addEventListener("input", () => onFieldTyped(input));
    });

    document.querySelectorAll('.mode-chip').forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove("selected"));
            chip.classList.add("selected");
            tripMode = chip.dataset.mode;
            if (tripEnds.from && tripEnds.to) {
                planTrip();
            }
        });
    });

    document.getElementById("goButton").addEventListener("click", planTrip);
    document.getElementById("clearTrip").addEventListener("click", clearTrip);
    document.getElementById("toggleSteps").addEventListener("click", toggleSteps);
    document.getElementById("saveTripRoute").addEventListener("click", saveTripAsRoute);
    document.querySelector(".locate-me").addEventListener("click", useMyLocation);
    document.querySelector(".swap-ends").addEventListener("click", swapEnds);

    // Close the suggestion list when focus leaves the card
    document.addEventListener("click", event => {
        if (!event.target.closest(".search-card")) {
            document.getElementById("suggestionsWrap").hidden = true;
        }
    });

    applyDeepLink();
}

// Open the map with a route already set: /main?from=...&to=...&mode=...
function applyDeepLink() {
    let params = new URLSearchParams(window.location.search);
    let from = parsePoint(params.get("from"));
    let to = parsePoint(params.get("to"));
    let mode = params.get("mode");

    if (mode) {
        let chip = document.querySelector('.mode-chip[data-mode="' + mode + '"]');
        if (chip) {
            chip.click();
        }
    }
    if (from) {
        setEnd("from", from);
    }
    if (to) {
        setEnd("to", to);
    }
    if (from && to) {
        planTrip();
    } else if (to) {
        // Came from a saved place: just needs a starting point
        document.getElementById("fromInput").focus();
    }
}

// "49.25,-123.0,BCIT Burnaby" -> {lat, lng, label}
function parsePoint(value) {
    if (!value) {
        return null;
    }
    let parts = value.split(",");
    let lat = parseFloat(parts[0]);
    let lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) {
        return null;
    }
    return { lat: lat, lng: lng, label: parts.slice(2).join(",") || "Selected place" };
}

function loadPlaces() {
    fetch('./data/places.json')
        .then(response => response.json())
        .then(data => {
            places = data;
        })
        .catch(error => console.log("Error loading places: ", error));
}

// The user's own saved places, which sort above everything else.
function loadUserPlaces() {
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            return;
        }
        db.collection("users").doc(user.uid).collection("places").get()
            .then(snapshot => {
                userPlaces = [];
                snapshot.forEach(doc => {
                    let place = doc.data();
                    userPlaces.push({
                        label: place.label,
                        hint: place.address,
                        lat: place.lat,
                        lng: place.lng,
                        icon: place.icon || "location_on",
                        tone: "",
                        saved: true
                    });
                });
            })
            .catch(error => console.log("Error loading saved places: ", error));
    });
}

// Icon for a place, based on the tags in places.json.
function placeIcon(tags) {
    tags = (tags || "").toLowerCase();
    if (tags.includes("airport")) return { icon: "flight", tone: "accent" };
    if (tags.includes("school") || tags.includes("university")) return { icon: "school", tone: "" };
    if (tags.includes("mall") || tags.includes("store")) return { icon: "shopping_bag", tone: "accent" };
    if (tags.includes("home")) return { icon: "home", tone: "" };
    return { icon: "location_on", tone: "accent" };
}

function savedPlaceMatches(filter) {
    let needle = (filter || "").toUpperCase();

    let mine = userPlaces.filter(place =>
        [place.label, place.hint].join(" ").toUpperCase().indexOf(needle) > -1);

    return mine.concat(Object.keys(places)
        .filter(id => {
            let place = places[id];
            return [place.name, place.address, place.tags].join(" ").toUpperCase().indexOf(needle) > -1;
        })
        .map(id => {
            let place = places[id];
            let style = placeIcon(place.tags);
            return {
                label: place.name,
                hint: place.address,
                lat: parseFloat(place.lat),
                lng: parseFloat(place.long),
                icon: style.icon,
                tone: style.tone
            };
        }));
}

function openSuggestions(field) {
    activeField = field;
    document.getElementById("suggestionsWrap").hidden = false;
    let input = document.getElementById(field + "Input");
    renderSuggestions(savedPlaceMatches(input.value));
}

function onFieldTyped(input) {
    activeField = input.dataset.field;
    let text = input.value;
    let matches = savedPlaceMatches(text);
    document.getElementById("suggestionsWrap").hidden = false;
    renderSuggestions(matches);

    // Look up addresses too, once typing settles
    clearTimeout(lookupTimer);
    if (text.trim().length >= 3) {
        lookupTimer = setTimeout(() => {
            geocodeAddress(text).then(found => {
                if (input.value !== text) {
                    return;   // moved on already
                }
                renderSuggestions(matches.concat(found.map(place => ({
                    label: place.label,
                    hint: place.hint,
                    lat: place.lat,
                    lng: place.lng,
                    icon: place.hasNumber ? "home_pin" : "location_on",
                    tone: "accent"
                }))));
            });
        }, 500);
    }
}

function renderSuggestions(items) {
    let list = document.getElementById("searchResults");
    if (!list) {
        return;
    }
    list.innerHTML = "";

    items.forEach(item => {
        let li = document.createElement("li");
        let link = document.createElement("a");
        link.href = "#";
        link.innerHTML =
            '<span class="icon-tile ' + item.tone + '">' +
            '<span class="material-symbols-rounded">' + item.icon + '</span></span>' +
            '<span class="place-text"></span>';
        link.querySelector('.place-text').append(item.label);
        let hint = document.createElement("small");
        hint.textContent = item.hint || "";
        link.querySelector('.place-text').appendChild(hint);

        link.addEventListener("click", event => {
            event.preventDefault();
            setEnd(activeField || "to", item);
            if (tripEnds.from && tripEnds.to) {
                planTrip();
            }
        });

        li.appendChild(link);
        list.appendChild(li);
    });

    document.getElementById("searchEmpty").hidden = items.length > 0;
    document.getElementById("suggestionsTitle").textContent =
        activeField === "from" ? "Starting Point" : "Destination";
}

function setEnd(field, point) {
    tripEnds[field] = { label: point.label, lat: point.lat, lng: point.lng };
    document.getElementById(field + "Input").value = point.label;
    document.getElementById("suggestionsWrap").hidden = true;
}

function swapEnds() {
    let from = tripEnds.from;
    let to = tripEnds.to;
    if (from) {
        setEnd("to", from);
    }
    if (to) {
        setEnd("from", to);
    }
    if (tripEnds.from && tripEnds.to) {
        planTrip();
    }
}

function useMyLocation() {
    if (!navigator.geolocation) {
        showToast("This browser cannot share your location.", "error");
        return;
    }
    document.getElementById("fromInput").value = "Finding you...";
    navigator.geolocation.getCurrentPosition(
        position => {
            setEnd("from", {
                label: "My Location",
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
            if (tripEnds.to) {
                planTrip();
            }
        },
        () => {
            document.getElementById("fromInput").value = "";
            showToast("Could not get your location.", "error");
        }
    );
}

function planTrip() {
    if (!tripEnds.from || !tripEnds.to) {
        showToast("Choose a starting point and a destination first.", "error");
        return;
    }

    let button = document.getElementById("goButton");
    button.disabled = true;

    getDirections(tripEnds.from, tripEnds.to, tripMode)
        .then(route => {
            lastRoute = route;
            drawDirections(route, tripEnds.from.label, tripEnds.to.label);
            showTripResult(route);
        })
        .catch(error => {
            console.log("Error getting directions: ", error);
            showToast("Could not find a route between those places.", "error");
        })
        .then(() => {
            button.disabled = false;
        });
}

function showTripResult(route) {
    document.getElementById("tripResult").hidden = false;
    document.getElementById("suggestionsWrap").hidden = true;
    document.getElementById("tripDuration").textContent = formatDuration(route.duration);
    document.getElementById("tripDistance").textContent = formatDistance(route.distance);

    let note = document.getElementById("tripNote");
    note.hidden = tripMode !== "Bus or SkyTrain";
    note.textContent = "Transit times are not available, so this shows the driving route.";

    let steps = document.getElementById("tripSteps");
    steps.innerHTML = "";
    route.steps.forEach(step => {
        let li = document.createElement("li");
        li.innerHTML = '<span class="material-symbols-rounded"></span><span class="step-text"></span>' +
            '<small class="step-distance"></small>';
        li.querySelector('.material-symbols-rounded').textContent = stepIcon(step);
        li.querySelector('.step-text').textContent = describeStep(step);
        li.querySelector('.step-distance').textContent = step.distance ? formatDistance(step.distance) : "";
        steps.appendChild(li);
    });
}

function toggleSteps() {
    let steps = document.getElementById("tripSteps");
    steps.hidden = !steps.hidden;
}

function clearTrip() {
    clearDirections();
    lastRoute = null;
    tripEnds = { from: null, to: null };
    document.getElementById("fromInput").value = "";
    document.getElementById("toInput").value = "";
    document.getElementById("tripResult").hidden = true;
    document.getElementById("tripSteps").hidden = true;
}

// Save the planned trip as a route on the Routes page.
function saveTripAsRoute() {
    let user = firebase.auth().currentUser;
    if (!user) {
        window.location.href = "./login";
        return;
    }
    if (!lastRoute || !tripEnds.from || !tripEnds.to) {
        return;
    }

    db.collection("users").doc(user.uid).collection("routes")
        .add({
            name: tripEnds.from.label + " to " + tripEnds.to.label,
            start: tripEnds.from.label,
            end: tripEnds.to.label,
            startCoords: { lat: tripEnds.from.lat, lng: tripEnds.from.lng },
            endCoords: { lat: tripEnds.to.lat, lng: tripEnds.to.lng },
            mode: tripMode,
            durationMinutes: Math.round(lastRoute.duration / 60),
            distanceMetres: Math.round(lastRoute.distance),
            created: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => showToast("Route saved. Find it under Routes."))
        .catch(error => {
            console.log("Error saving route: ", error);
            showToast("Could not save this route.", "error");
        });
}
