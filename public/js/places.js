// Saved locations: the places you travel to often, reusable on the map and
// when planning a trip.
var currentUser;
var editingPlaceId = null;
var chosenPoint = null;      // {lat, lng} picked from the address lookup
var placeLookupTimer = null;

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        getPlaces();
    } else {
        window.location.href = "./login";
    }
});

function placesRef() {
    return db.collection("users").doc(currentUser.uid).collection("places");
}

var placeModal = new bootstrap.Modal(document.getElementById('placeModal'));

function openPlaceForm() {
    editingPlaceId = null;
    chosenPoint = null;
    document.getElementById('placeForm').reset();
    document.getElementById('placeSuggestions').innerHTML = "";
    document.getElementById('placeMessage').textContent = "";
    document.getElementById('placeFormTitle').textContent = "Add Place";
    document.getElementById('savePlaceButton').textContent = "Save Place";
    placeModal.show();
}

function closePlaceForm() {
    placeModal.hide();
}

function getPlaces() {
    let template = document.getElementById("placeCardTemplate");
    let group = document.getElementById("placeCardGroup");

    placesRef().get()
        .then(snapshot => {
            group.innerHTML = "";

            snapshot.forEach(doc => {
                let place = doc.data();
                let card = template.content.cloneNode(true);

                card.querySelector('.place-icon').textContent = place.icon || "location_on";
                card.querySelector('.place-label').textContent = place.label;
                card.querySelector('.place-address').textContent = place.address || "";

                card.querySelector('.place-directions')
                    .addEventListener("click", () => directionsToPlace(place));
                card.querySelector('.place-edit')
                    .addEventListener("click", () => editPlace(doc.id, place));
                card.querySelector('.place-delete')
                    .addEventListener("click", () => deletePlace(doc.id, place));

                group.appendChild(card);
            });

            document.getElementById("places-none").hidden = group.children.length > 0;
        })
        .catch(error => console.log("Error loading places: ", error));
}

// Open the map with this place as the destination.
function directionsToPlace(place) {
    let params = new URLSearchParams({
        to: place.lat + "," + place.lng + "," + place.label
    });
    window.location.href = "./main?" + params.toString();
}

function editPlace(placeId, place) {
    editingPlaceId = placeId;
    chosenPoint = { lat: place.lat, lng: place.lng };
    document.getElementById('placeLabel').value = place.label || "";
    document.getElementById('placeAddress').value = place.address || "";
    document.getElementById('placeIcon').value = place.icon || "location_on";
    document.getElementById('placeSuggestions').innerHTML = "";
    document.getElementById('placeMessage').textContent = "";
    document.getElementById('placeFormTitle').textContent = "Edit Place";
    document.getElementById('savePlaceButton').textContent = "Save Changes";
    placeModal.show();
}

// Address lookup inside the form.
function onPlaceAddressTyped() {
    let input = document.getElementById('placeAddress');
    let text = input.value;
    chosenPoint = null;

    clearTimeout(placeLookupTimer);
    if (text.trim().length < 3) {
        document.getElementById('placeSuggestions').innerHTML = "";
        return;
    }

    placeLookupTimer = setTimeout(() => {
        geocodeAddress(text).then(found => {
            if (input.value !== text) {
                return;
            }
            let list = document.getElementById('placeSuggestions');
            list.innerHTML = "";

            found.forEach(place => {
                let item = document.createElement("button");
                item.type = "button";
                item.className = "place-suggestion";
                item.innerHTML = '<span class="material-symbols-rounded">' +
                    (place.hasNumber ? "home_pin" : "location_on") + '</span><span></span>';
                item.querySelector('span:last-child').innerHTML = "";
                item.querySelector('span:last-child').append(place.label);
                let hint = document.createElement("small");
                hint.textContent = place.hint;
                item.querySelector('span:last-child').appendChild(hint);

                item.addEventListener("click", () => {
                    chosenPoint = { lat: place.lat, lng: place.lng };
                    input.value = place.label;
                    list.innerHTML = "";
                    document.getElementById('placeMessage').textContent = "";
                });

                list.appendChild(item);
            });
        });
    }, 500);
}

function savePlace(event) {
    event.preventDefault();

    let label = document.getElementById('placeLabel').value.trim();
    let address = document.getElementById('placeAddress').value.trim();
    let icon = document.getElementById('placeIcon').value;

    if (!label || !address) {
        document.getElementById('placeMessage').textContent = "Please enter a name and an address.";
        return;
    }
    if (!chosenPoint) {
        document.getElementById('placeMessage').textContent =
            "Pick one of the suggested addresses so we know where this is.";
        return;
    }

    let details = {
        label: label,
        address: address,
        icon: icon,
        lat: chosenPoint.lat,
        lng: chosenPoint.lng
    };

    let saving = editingPlaceId
        ? placesRef().doc(editingPlaceId).set(details, { merge: true })
        : placesRef().add(details);

    saving
        .then(() => {
            let wasEdit = !!editingPlaceId;
            editingPlaceId = null;
            closePlaceForm();
            getPlaces();
            showToast(wasEdit ? "Place updated." : "Place saved.");
        })
        .catch(error => {
            console.log("Error saving place: ", error);
            document.getElementById('placeMessage').textContent = "Could not save this place.";
        });
}

function deletePlace(placeId, place) {
    confirmDialog({
        title: "Delete This Place?",
        message: place.label,
        confirmLabel: "Delete Place"
    }).then(confirmed => {
        if (!confirmed) {
            return;
        }
        placesRef().doc(placeId).delete()
            .then(() => {
                getPlaces();
                showToast("Place deleted.", "success", {
                    label: "Undo",
                    onClick: () => {
                        placesRef().doc(placeId).set(place)
                            .then(() => {
                                getPlaces();
                                showToast("Place restored.");
                            });
                    }
                });
            })
            .catch(error => {
                console.log("Error deleting place: ", error);
                showToast("Could not delete this place.", "error");
            });
    });
}
