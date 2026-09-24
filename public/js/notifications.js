var currentUser;

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUser = db.collection("users").doc(user.uid);
        loadNotificationSettings();
        postNotifications(user);
    } else {
        window.location.href = "./login";
    }
});

function loadNotificationSettings() {
    currentUser.get()
        .then(userDoc => {
            let pushNotifications = userDoc.exists && userDoc.data().pushNotifications;
            document.getElementById("turnOnNotifications").checked = pushNotifications === true;
        })
        .catch(error => console.log("Error loading notification settings: ", error));
}

function saveNotifications() {
    let pushNotifications = document.getElementById("turnOnNotifications").checked;

    currentUser.set({
        pushNotifications: pushNotifications
    }, { merge: true })
    .then(() => {
        showToast("Push notifications turned " + (pushNotifications ? "on." : "off."));
    })
    .catch(error => {
        console.log("Error saving notification settings: ", error);
        showToast("Could not save your notification setting.", "error");
    });
}

// Display each of the user's notifications as a card.
function postNotifications(user) {
    let notificationTemplate = document.getElementById("notificationTemplate");
    let notificationGroup = document.getElementById("notification-group");

    db.collection("users").doc(user.uid).collection("Notifications")
        .get()
        .then(allIncidents => {
            notificationGroup.innerHTML = "";
            allIncidents.forEach(doc => {
                let incident = doc.data();
                let notificationCard = notificationTemplate.content.cloneNode(true);

                notificationCard.querySelector('.notify-head').textContent =
                    incident.route || "Your Routes Are Impacted";
                notificationCard.querySelector('.notify-description').textContent =
                    incident.description || "Empty Description.";
                notificationCard.querySelector('.notify-suggestion').textContent =
                    incident.suggestion || "No suggestions available.";
                notificationCard.querySelector('.notify-dismiss')
                    .addEventListener("click", () => dismissNotification(doc.id, incident));

                notificationGroup.appendChild(notificationCard);
            });
            document.getElementById("notification-none").hidden = allIncidents.size > 0;
        })
        .catch(error => console.log("Error loading notifications: ", error));
}

function dismissNotification(notificationId, incident) {
    currentUser.collection("Notifications").doc(notificationId).delete()
        .then(() => {
            refreshAlerts();
            showToast("Alert dismissed.", "success", {
                label: "Undo",
                onClick: () => restoreNotification(notificationId, incident)
            });
        })
        .catch(error => {
            console.log("Error dismissing notification: ", error);
            showToast("Could not dismiss this alert.", "error");
        });
}

function restoreNotification(notificationId, incident) {
    currentUser.collection("Notifications").doc(notificationId).set(incident)
        .then(() => {
            refreshAlerts();
            showToast("Alert restored.");
        })
        .catch(error => {
            console.log("Error restoring notification: ", error);
            showToast("Could not restore this alert.", "error");
        });
}

function refreshAlerts() {
    let user = firebase.auth().currentUser;
    postNotifications(user);
    updateNotificationCount(user);
}

// Test Purposes
function createNotification() {
    currentUser.collection("Notifications").add({
        route: "Route 1",
        description: "Accident on Highway 1",
        suggestion: "Leave 1 hour earlier"
    }).then(function () {
        console.log("Notification Added");
    });
}
