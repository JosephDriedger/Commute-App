function reportPage() {
    console.log("You're in " + window.location.pathname);
}

function goToMainOrHome() {
  firebase.auth().onAuthStateChanged(user => {
      // Check if user is logged in
      if (user) {
          // Do something for the currently logged in user here:
          window.location.href = "./main";
      } else {
          window.location.href = "./";
      }
      
  });
}

function goToUserOnlyPage(page) {
  firebase.auth().onAuthStateChanged(user => {
    // Check if user is logged in
    if (user) {
        // Do something for the currently logged in user here:
        window.location.href = page;
    } else {
        window.location.href = "./login";
    }
    
  });
}

// Sign Out User.
function signOut() {
  firebase.auth().signOut().then(function() {
    window.location.href = "./";
    console.log('Signed Out');
  }, function(error) {
    console.error('Sign Out Error', error);
  });
}
reportPage();

// Brief message in the corner of the screen. type: "success" | "error"
// An optional action ({label, onClick}) adds a button, used for Undo.
function showToast(message, type, action) {
  let holder = document.getElementById("toastHolder");
  if (!holder) {
    holder = document.createElement("div");
    holder.id = "toastHolder";
    holder.className = "toast-holder";
    document.body.appendChild(holder);
  }

  let toast = document.createElement("div");
  toast.className = "app-toast " + (type || "success");
  toast.setAttribute("role", "status");

  let icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.textContent = type === "error" ? "error" : "check_circle";
  toast.appendChild(icon);

  let text = document.createElement("span");
  text.className = "app-toast-text";
  text.textContent = message;
  toast.appendChild(text);

  let life = action ? 8000 : 3500;

  if (action) {
    let button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm app-toast-action";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      toast.remove();
      action.onClick();
    });
    toast.appendChild(button);
  }

  holder.appendChild(toast);
  setTimeout(() => toast.classList.add("leaving"), life);
  setTimeout(() => toast.remove(), life + 500);
}

// In-app replacement for window.confirm. Resolves true when confirmed.
function confirmDialog(options) {
  return new Promise(resolve => {
    let dialog = document.getElementById("confirmDialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "confirmDialog";
      dialog.className = "modal fade";
      dialog.tabIndex = -1;
      dialog.innerHTML =
        '<div class="modal-dialog modal-dialog-centered modal-sm">' +
        '  <div class="modal-content">' +
        '    <div class="modal-body text-center p-4">' +
        '      <span class="icon-tile danger mb-3"><span class="material-symbols-rounded confirm-icon">delete</span></span>' +
        '      <h2 class="confirm-title h5"></h2>' +
        '      <p class="confirm-message text-muted"></p>' +
        '      <div class="d-grid gap-2">' +
        '        <button type="button" class="btn btn-danger confirm-yes"></button>' +
        '        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(dialog);
    }

    dialog.querySelector(".confirm-title").textContent = options.title || "Are You Sure?";
    dialog.querySelector(".confirm-message").textContent = options.message || "";
    dialog.querySelector(".confirm-icon").textContent = options.icon || "delete";

    let yes = dialog.querySelector(".confirm-yes");
    yes.textContent = options.confirmLabel || "Delete";

    let modal = bootstrap.Modal.getOrCreateInstance(dialog);
    let answered = false;

    let onYes = () => {
      answered = true;
      modal.hide();
      resolve(true);
    };
    yes.addEventListener("click", onYes, { once: true });

    dialog.addEventListener("hidden.bs.modal", () => {
      yes.removeEventListener("click", onYes);
      if (!answered) {
        resolve(false);
      }
    }, { once: true });

    modal.show();
  });
}

// Material Symbols icon name for a trip mode.
function modeIcon(mode) {
  switch (mode) {
    case "Drive": return "directions_car";
    case "Bike": return "directions_bike";
    case "Bus or SkyTrain": return "directions_transit";
    case "Walk": return "directions_walk";
    default: return "route";
  }
}

// // Check if an incident has occured.
// window.setInterval(function() {
//   let keyWord
//   let routes = db.collection("users").doc(user.uid).collection("routes");
//   let schedules = db.collection("users").doc(user.uid).collection("Schedules")
//   incidentRef.get().then(allIncidents => {
//     allIncidents.forEach(doc => {
//       var street;
//     })
//   });
// }, 10)

// For Development Purposes Only
function createIncident(street, type, delay, description, suggestion) {
  var incidentRef = db.collection("incidents");

  incidentRef.add({
    street: street,
    type: type,
    delay: delay,
    description: description,
    suggestion: suggestion
  });
}