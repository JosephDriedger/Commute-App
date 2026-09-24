var currentUser;
var editingRouteId = null;   // set while the form is editing an existing route

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    getRoutes(user);
  } else {
    // No user is signed in.
    window.location.href = "./login";
  }
});

function routesRef() {
  return db.collection("users").doc(currentUser.uid).collection("routes");
}

// Display each of the user's saved routes as a card.
function getRoutes(user) {
  let routeCardTemplate = document.getElementById("routeCardTemplate");
  let routeCardGroup = document.getElementById("routeCardGroup");
  if (!routeCardTemplate || !routeCardGroup) {
    return;
  }

  routesRef().get()
    .then(allRoutes => {
      routeCardGroup.innerHTML = "";

      allRoutes.forEach(doc => {
        let route = doc.data();
        // Older routes were saved with different field names
        let start = route.start || route.orginaddress;
        let end = route.end || route.destinationaddress;
        let mode = route.mode || route.tripmode;

        if (!start || !end) {
          console.log("Important Value missing, skipping route " + doc.id);
          return;
        }

        let routeCard = routeCardTemplate.content.cloneNode(true);
        routeCard.querySelector('.card-title').textContent = route.name || (start + " to " + end);
        routeCard.querySelector('.route-start').textContent = start;
        routeCard.querySelector('.route-end').textContent = end;
        routeCard.querySelector('.route-mode').textContent = mode || "";
        routeCard.querySelector('.route-icon').textContent = modeIcon(mode);

        // Travel time and distance, when the route was planned on the map
        let trip = routeCard.querySelector('.route-trip');
        if (route.durationMinutes) {
          trip.textContent = route.durationMinutes + " min" +
            (route.distanceMetres ? " · " + formatDistance(route.distanceMetres) : "");
        } else {
          trip.hidden = true;
        }

        routeCard.querySelector('.route-map')
          .addEventListener("click", () => showRouteOnMap(doc.id, route));
        routeCard.querySelector('.route-edit')
          .addEventListener("click", () => editRoute(doc.id, route));
        routeCard.querySelector('.route-delete')
          .addEventListener("click", () => deleteRoute(doc.id, route));

        routeCardGroup.appendChild(routeCard);
      });

      let noRoutes = document.getElementById("routes-none");
      if (noRoutes) {
        noRoutes.hidden = routeCardGroup.children.length > 0;
      }
    })
    .catch(error => console.log("Error loading routes: ", error));
}

// Open this route on the map. Addresses typed by hand are looked up first.
function showRouteOnMap(routeId, route) {
  let mode = route.mode || route.tripmode || "Drive";
  let start = route.start || route.orginaddress;
  let end = route.end || route.destinationaddress;

  if (route.startCoords && route.endCoords) {
    goToMapWith(route.startCoords, start, route.endCoords, end, mode);
    return;
  }

  showToast("Looking up this route...");
  Promise.all([geocodeAddress(start), geocodeAddress(end)])
    .then(([fromResults, toResults]) => {
      if (!fromResults.length || !toResults.length) {
        showToast("Could not find those addresses on the map.", "error");
        return;
      }
      // Remember what we found so the next tap is instant
      routesRef().doc(routeId).set({
        startCoords: { lat: fromResults[0].lat, lng: fromResults[0].lng },
        endCoords: { lat: toResults[0].lat, lng: toResults[0].lng }
      }, { merge: true }).catch(error => console.log("Error saving coordinates: ", error));

      goToMapWith(fromResults[0], start, toResults[0], end, mode);
    })
    .catch(error => {
      console.log("Error looking up route: ", error);
      showToast("Could not find those addresses on the map.", "error");
    });
}

function goToMapWith(from, fromLabel, to, toLabel, mode) {
  let params = new URLSearchParams({
    from: from.lat + "," + from.lng + "," + fromLabel,
    to: to.lat + "," + to.lng + "," + toLabel,
    mode: mode
  });
  window.location.href = "./main?" + params.toString();
}

function loadSkeleton() {
  $('#addroute').load('./text/addroute.html');
}

var myModal;
if (document.getElementById('exampleModalLong')) {
  loadSkeleton();
  myModal = new bootstrap.Modal(document.getElementById('exampleModalLong'));
}

function togglemodal() {
  myModal.toggle();
}

function showmodal() {
  // Adding a new route, so clear anything left from an edit
  editingRouteId = null;
  let form = document.getElementById('routeForm');
  if (form) {
    form.reset();
    document.getElementById('routeMessage').textContent = "";
    document.getElementById('exampleModalLongTitle').textContent = "Add Route";
    document.getElementById('saveRouteButton').textContent = "Save Route";
  }
  myModal.show();
}

function hidemodal() {
  myModal.hide();
}

// Open the form filled in with an existing route.
function editRoute(routeId, route) {
  editingRouteId = routeId;
  document.getElementById('nameInput').value = route.name || "";
  document.getElementById('startInput').value = route.start || route.orginaddress || "";
  document.getElementById('endInput').value = route.end || route.destinationaddress || "";
  document.getElementById('modeInput').value = route.mode || route.tripmode || "Drive";
  document.getElementById('routeMessage').textContent = "";
  document.getElementById('exampleModalLongTitle').textContent = "Edit Route";
  document.getElementById('saveRouteButton').textContent = "Save Changes";
  myModal.show();
}

// Save the route entered in the form, as a new route or an edit.
function saveRoute(event) {
  if (event) {
    event.preventDefault();
  }
  if (!currentUser) {
    return;
  }

  let name = document.getElementById('nameInput').value.trim();
  let start = document.getElementById('startInput').value.trim();
  let end = document.getElementById('endInput').value.trim();
  let mode = document.getElementById('modeInput').value;

  if (!start || !end) {
    document.getElementById('routeMessage').textContent = "Please enter a starting and ending address.";
    return;
  }

  let details = { name: name, start: start, end: end, mode: mode };
  let saving;

  if (editingRouteId) {
    saving = routesRef().doc(editingRouteId).set(details, { merge: true });
  } else {
    details.created = firebase.firestore.FieldValue.serverTimestamp();
    saving = routesRef().add(details);
  }

  saving
    .then(() => {
      let wasEdit = !!editingRouteId;
      editingRouteId = null;
      document.getElementById('routeForm').reset();
      document.getElementById('routeMessage').textContent = "";
      hidemodal();
      getRoutes(currentUser);
      showToast(wasEdit ? "Route updated." : "Route saved.");
    })
    .catch(error => {
      document.getElementById('routeMessage').textContent = "Could not save route. Please try again.";
      console.log("Error saving route: ", error);
    });
}

function deleteRoute(routeId, route) {
  confirmDialog({
    title: "Delete This Route?",
    message: route.name || ((route.start || "") + " to " + (route.end || "")),
    confirmLabel: "Delete Route"
  }).then(confirmed => {
    if (!confirmed) {
      return;
    }
    routesRef().doc(routeId).delete()
      .then(() => {
        getRoutes(currentUser);
        showToast("Route deleted.", "success", {
          label: "Undo",
          onClick: () => undoDeleteRoute(routeId, route)
        });
      })
      .catch(error => {
        console.log("Error deleting route: ", error);
        showToast("Could not delete this route.", "error");
      });
  });
}

function undoDeleteRoute(routeId, route) {
  routesRef().doc(routeId).set(route)
    .then(() => {
      getRoutes(currentUser);
      showToast("Route restored.");
    })
    .catch(error => {
      console.log("Error restoring route: ", error);
      showToast("Could not restore this route.", "error");
    });
}
