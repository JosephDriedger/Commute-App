// Directions: address lookup (Nominatim) and routing (OSRM), plus drawing the
// result on the Leaflet map created in webmap.js.

// OSRM profile per trip mode. There is no public transit router, so transit
// falls back to driving and the UI says so.
var ROUTING_PROFILES = {
    "Drive": "routed-car",
    "Bike": "routed-bike",
    "Walk": "routed-foot",
    "Bus or SkyTrain": "routed-car"
};

var directionsLayer = null;

var geocodeCache = {};

// Look up an address. Returns [{label, hint, lat, lng}].
// Free text search drops house numbers, so when the query starts with one we
// also ask Nominatim's structured endpoint, which keeps them.
function geocodeAddress(query) {
    let text = (query || "").trim();
    if (text.length < 3) {
        return Promise.resolve([]);
    }
    if (geocodeCache[text]) {
        return Promise.resolve(geocodeCache[text]);
    }

    let wantsHouseNumber = /^\d+[a-z]?\s+\S/i.test(text);

    return nominatim({ q: text })
        .then(results => {
            if (!wantsHouseNumber || results.some(hasHouseNumber)) {
                return results;
            }
            // Try again as a structured address lookup
            return structuredLookups(text).then(extra => extra.concat(results));
        })
        .then(results => {
            let ranked = results.map(result => toPlace(result, wantsHouseNumber))
                .sort((a, b) => b.score - a.score);
            let cleaned = dedupePlaces(ranked).slice(0, 6);
            geocodeCache[text] = cleaned;
            return cleaned;
        })
        .catch(error => {
            console.log("Error looking up address: ", error);
            return [];
        });
}

function nominatim(params) {
    let query = new URLSearchParams(Object.assign({
        format: "jsonv2",
        addressdetails: "1",
        limit: "6",
        countrycodes: "ca"
    }, params));

    return fetch("https://nominatim.openstreetmap.org/search?" + query.toString())
        .then(response => response.json());
}

// "5608 Clinton St, Burnaby" -> street + city. Without a comma the city has to
// be guessed, because Nominatim returns nothing when it is left in the street.
function structuredLookups(text) {
    if (text.indexOf(",") > -1) {
        let parts = text.split(",").map(part => part.trim());
        return nominatim({ street: parts[0], city: parts[1] || "" });
    }

    return nominatim({ street: text }).then(results => {
        if (results.length) {
            return results;
        }
        let words = text.split(/s+/);
        if (words.length < 3) {
            return [];
        }
        // Last word is probably the city: "5608 Clinton St Burnaby"
        return nominatim({ street: words.slice(0, -1).join(" "), city: words[words.length - 1] });
    });
}

function hasHouseNumber(result) {
    return !!(result.address && result.address.house_number);
}

// Build a readable label: "5608 Clinton Street" rather than "5608, Clinton Street".
function toPlace(result, wantsHouseNumber) {
    let address = result.address || {};
    let streetLine = [address.house_number, address.road].filter(Boolean).join(" ");
    let locality = address.city || address.town || address.village ||
        address.municipality || address.suburb || "";
    let name = result.name && result.name !== streetLine ? result.name : "";

    let label = streetLine || name || (result.display_name || "").split(",")[0];
    let hint = [name && streetLine ? name : "", locality, address.state]
        .filter(Boolean).join(", ");

    // Say so when the exact number is not in the map data
    if (wantsHouseNumber && !address.house_number) {
        hint = hint ? "Street only, number not found, " + hint : "Street only, number not found";
    }

    return {
        label: label,
        hint: hint || "Address",
        key: [address.house_number || "", address.road || label, locality].join("|").toLowerCase(),
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        hasNumber: !!address.house_number,
        score: (address.house_number ? 2 : 0) +
            (result.addresstype === "building" || result.addresstype === "place" ? 1 : 0)
    };
}

// Shops in one mall all share an address; keep one entry per address.
function dedupePlaces(places) {
    let seen = {};
    return places.filter(place => {
        let key = place.key;
        if (seen[key]) {
            return false;
        }
        seen[key] = true;
        return true;
    });
}

// Route between two {lat, lng} points. Returns {distance, duration, coordinates, steps}.
function getDirections(from, to, mode) {
    let profile = ROUTING_PROFILES[mode] || "routed-car";
    let url = "https://routing.openstreetmap.de/" + profile + "/route/v1/driving/" +
        from.lng + "," + from.lat + ";" + to.lng + "," + to.lat +
        "?overview=full&geometries=geojson&steps=true";

    return fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.code !== "Ok" || !data.routes.length) {
                throw new Error(data.message || "No route found");
            }
            let route = data.routes[0];
            return {
                distance: route.distance,
                duration: route.duration,
                coordinates: route.geometry.coordinates.map(pair => [pair[1], pair[0]]),
                steps: (route.legs[0] && route.legs[0].steps) || []
            };
        });
}

// Draw a route with start and end markers, and fit the map around it.
function drawDirections(route, fromLabel, toLabel) {
    if (!window.commuteMap || !window.L) {
        return;
    }
    clearDirections();

    let line = L.polyline(route.coordinates, {
        color: "#2e40b3",
        weight: 7,
        opacity: 0.9
    });

    let start = L.circleMarker(route.coordinates[0], {
        radius: 9, color: "#ffffff", weight: 3, fillColor: "#2e40b3", fillOpacity: 1
    }).bindPopup(fromLabel || "Start");

    let end = L.circleMarker(route.coordinates[route.coordinates.length - 1], {
        radius: 9, color: "#ffffff", weight: 3, fillColor: "#00b8b2", fillOpacity: 1
    }).bindPopup(toLabel || "Destination");

    directionsLayer = L.layerGroup([line, start, end]).addTo(window.commuteMap);
    window.commuteMap.fitBounds(line.getBounds(), { padding: [60, 60] });
}

function clearDirections() {
    if (directionsLayer && window.commuteMap) {
        window.commuteMap.removeLayer(directionsLayer);
        directionsLayer = null;
    }
}

// "1.2 km" / "450 m"
function formatDistance(metres) {
    return metres >= 1000 ? (metres / 1000).toFixed(1) + " km" : Math.round(metres) + " m";
}

// "1 h 5 min" / "8 min"
function formatDuration(seconds) {
    let minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return minutes + " min";
    }
    let hours = Math.floor(minutes / 60);
    return hours + " h " + (minutes % 60) + " min";
}

// Plain instruction from an OSRM maneuver, e.g. "Turn left onto Kingsway".
function describeStep(step) {
    let maneuver = step.maneuver || {};
    let road = step.name ? " onto " + step.name : "";
    let modifier = maneuver.modifier || "";

    switch (maneuver.type) {
        case "depart": return step.name ? "Head out on " + step.name : "Start your trip";
        case "arrive": return "Arrive at your destination";
        case "roundabout":
        case "rotary": return "Take the roundabout" + road;
        case "merge": return "Merge" + road;
        case "on ramp": return "Take the ramp" + road;
        case "off ramp": return "Take the exit" + road;
        case "fork": return "Keep " + (modifier || "going") + road;
        case "continue": return "Continue" + road;
        case "new name": return "Continue" + road;
        case "end of road": return "Turn " + modifier + road;
        default:
            if (modifier === "straight") return "Continue" + road;
            return "Turn " + modifier + road;
    }
}

// Icon for the instruction list.
function stepIcon(step) {
    let maneuver = step.maneuver || {};
    let modifier = maneuver.modifier || "";

    if (maneuver.type === "depart") return "trip_origin";
    if (maneuver.type === "arrive") return "place";
    if (maneuver.type === "roundabout" || maneuver.type === "rotary") return "rotate_right";
    if (maneuver.type === "merge") return "merge";
    if (modifier.includes("left")) return "turn_left";
    if (modifier.includes("right")) return "turn_right";
    if (modifier === "uturn") return "u_turn_left";
    return "straight";
}
