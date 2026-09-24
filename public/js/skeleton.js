function loadSkeleton(){
    $('#navbarPlaceholder').load('./text/navbar.html', onNavbarLoaded);
    $('#footerPlaceholder').addClass('app-footer').load('./text/footer.html');
}
loadSkeleton();  //invoke the function

function onNavbarLoaded() {
    highlightActiveLink();
    hideRedundantAuthButton();
    firebase.auth().onAuthStateChanged(user => {
        document.body.classList.toggle('signed-in', !!user);
        document.body.classList.toggle('signed-out', !user);
        if (user) {
            let name = user.displayName || user.email || "?";
            document.getElementById('navAvatar').textContent = name.charAt(0).toUpperCase();
        }
        updateNotificationCount(user);
    });
}

// No "Log In" button while already on the login or sign-up page.
function hideRedundantAuthButton() {
    let page = window.location.pathname.split("/").pop();
    if (page === "login" || page === "signup") {
        document.querySelectorAll(".app-navbar .signed-out-only").forEach(el => el.remove());
    }
}

// Mark the navbar/tab bar link for the current page as active.
function highlightActiveLink() {
    let page = window.location.pathname.replace(/\/$/, "").split("/").pop();
    document.querySelectorAll('.app-navbar .nav-link, .app-navbar .dropdown-item, .tabbar a').forEach(link => {
        let target = (link.getAttribute('href') || "").replace("./", "");
        if (page && target === page) {
            link.classList.add('active');
        }
    });
}

// Show the number of notifications in the navbar badges.
function updateNotificationCount(user) {
    let badges = document.querySelectorAll('.notify-num');
    if (!user) {
        badges.forEach(badge => badge.hidden = true);
        return;
    }
    db.collection("users").doc(user.uid).collection("Notifications").get()
        .then(snap => {
            badges.forEach(badge => {
                badge.textContent = snap.size;
                badge.hidden = snap.size === 0;
            });
        })
        .catch(error => console.log("Error counting notifications: ", error));
}
