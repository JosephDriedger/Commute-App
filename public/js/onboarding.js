// First-run guidance: a welcome prompt for brand new accounts and a checklist
// that nudges people through the first three things worth doing.
var onboardingUser;

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        onboardingUser = user;
        loadOnboarding(user);
    }
});

function loadOnboarding(user) {
    let userRef = db.collection("users").doc(user.uid);

    Promise.all([
        userRef.get(),
        userRef.collection("routes").get(),
        userRef.collection("Schedules").get()
    ])
        .then(([userDoc, routes, schedules]) => {
            let profile = userDoc.exists ? userDoc.data() : {};
            let isNewAccount = new URLSearchParams(window.location.search).has("welcome");

            if (profile.onboardingDismissed && !isNewAccount) {
                return;
            }

            let steps = [
                {
                    done: !!(profile.city || profile.transport),
                    icon: "person",
                    label: "Complete Your Profile",
                    hint: "Tell us how you usually travel.",
                    href: "./profile"
                },
                {
                    done: routes.size > 0,
                    icon: "route",
                    label: "Save Your First Route",
                    hint: "The trip you take most often.",
                    href: "./routes"
                },
                {
                    done: schedules.size > 0,
                    icon: "calendar_month",
                    label: "Plan Your First Trip",
                    hint: "So you know when to leave.",
                    href: "./schedule"
                }
            ];

            if (steps.every(step => step.done)) {
                return;
            }

            renderOnboarding(steps);
            if (isNewAccount) {
                showWelcome(steps);
            }
        })
        .catch(error => console.log("Error loading onboarding: ", error));
}

function renderOnboarding(steps) {
    let holder = document.getElementById("onboarding");
    if (!holder) {
        return;
    }

    let done = steps.filter(step => step.done).length;

    let card = document.createElement("div");
    card.className = "onboard-card";
    card.innerHTML =
        '<div class="onboard-head">' +
        '  <div>' +
        '    <strong>Getting Started</strong>' +
        '    <span class="onboard-progress"></span>' +
        '  </div>' +
        '  <button type="button" class="btn btn-ghost btn-sm onboard-close" title="Dismiss" aria-label="Dismiss">' +
        '    <span class="material-symbols-rounded">close</span>' +
        '  </button>' +
        '</div>' +
        '<ol class="onboard-steps"></ol>';
    card.querySelector('.onboard-progress').textContent = done + " of " + steps.length + " done";
    card.querySelector('.onboard-close').addEventListener("click", dismissOnboarding);

    let list = card.querySelector('.onboard-steps');
    steps.forEach(step => {
        let item = document.createElement("li");
        item.className = step.done ? "done" : "";

        let link = document.createElement("a");
        link.href = step.href;
        link.innerHTML =
            '<span class="onboard-check material-symbols-rounded">' +
            (step.done ? "check_circle" : "radio_button_unchecked") + '</span>' +
            '<span class="onboard-text"><strong></strong><small></small></span>' +
            '<span class="material-symbols-rounded onboard-go">chevron_right</span>';
        link.querySelector('strong').textContent = step.label;
        link.querySelector('small').textContent = step.hint;

        item.appendChild(link);
        list.appendChild(item);
    });

    holder.innerHTML = "";
    holder.appendChild(card);
}

// Welcome prompt, shown once right after an account is created.
function showWelcome(steps) {
    let modalEl = document.getElementById("welcomeModal");
    if (!modalEl) {
        return;
    }

    let firstStep = steps.find(step => !step.done);
    let startButton = document.getElementById("welcomeStart");
    startButton.textContent = firstStep ? firstStep.label : "Explore the Map";
    startButton.href = firstStep ? firstStep.href : "#";

    new bootstrap.Modal(modalEl).show();

    // Drop ?welcome=1 so a refresh doesn't show it again
    try {
        window.history.replaceState({}, "", window.location.pathname);
    } catch (err) {
        // Not critical if the browser refuses
    }
}

function dismissOnboarding() {
    let holder = document.getElementById("onboarding");
    if (holder) {
        holder.innerHTML = "";
    }
    if (onboardingUser) {
        db.collection("users").doc(onboardingUser.uid)
            .set({ onboardingDismissed: true }, { merge: true })
            .catch(error => console.log("Error saving onboarding state: ", error));
    }
}
