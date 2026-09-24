// Account creation. FirebaseUI has no confirm password field, so the sign-up
// page uses this form instead. Logging in still uses FirebaseUI.
var signingUp = false;

firebase.auth().onAuthStateChanged(user => {
    // Already signed in, and not mid sign-up: nothing to do here
    if (user && !signingUp) {
        window.location.assign("./main");
    }
});

function showSignupMessage(text, type) {
    let message = document.getElementById("signupMessage");
    message.textContent = text;
    message.className = "signup-message " + (type || "error");
    message.hidden = !text;
}

// Live feedback while the two password fields are filled in.
function checkPasswords() {
    let password = document.getElementById("passwordInput").value;
    let confirm = document.getElementById("confirmInput").value;

    let lengthRule = document.getElementById("ruleLength");
    lengthRule.classList.toggle("met", password.length >= 6);

    let matchRule = document.getElementById("ruleMatch");
    matchRule.classList.toggle("met", password.length > 0 && password === confirm);

    // Only complain about a mismatch once they have started confirming
    if (confirm && password !== confirm) {
        document.getElementById("confirmInput").classList.add("is-invalid");
    } else {
        document.getElementById("confirmInput").classList.remove("is-invalid");
    }
}

function togglePasswordVisibility() {
    let fields = [document.getElementById("passwordInput"), document.getElementById("confirmInput")];
    let showing = fields[0].type === "text";
    fields.forEach(field => field.type = showing ? "password" : "text");
    document.getElementById("togglePassword").textContent = showing ? "visibility" : "visibility_off";
}

function createAccount(event) {
    event.preventDefault();

    let name = document.getElementById("nameInput").value.trim();
    let email = document.getElementById("emailInput").value.trim();
    let password = document.getElementById("passwordInput").value;
    let confirm = document.getElementById("confirmInput").value;

    if (password.length < 6) {
        showSignupMessage("Your password needs at least 6 characters.");
        return;
    }
    if (password !== confirm) {
        showSignupMessage("Those passwords do not match.");
        document.getElementById("confirmInput").focus();
        return;
    }

    let button = document.getElementById("createAccountButton");
    button.disabled = true;
    showSignupMessage("");
    signingUp = true;

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(credential => {
            let user = credential.user;
            return user.updateProfile({ displayName: name })
                .then(() => db.collection("users").doc(user.uid).set({
                    name: name,
                    email: email
                }))
                .catch(error => {
                    // The account exists either way, so carry on
                    console.log("Error saving profile: ", error);
                });
        })
        .then(() => {
            window.location.assign("./main?welcome=1");
        })
        .catch(error => {
            signingUp = false;
            button.disabled = false;
            showSignupMessage(signupErrorText(error));
            console.log("Error creating account: ", error);
        });
}

function signupErrorText(error) {
    switch (error.code) {
        case "auth/email-already-in-use":
            return "That email already has an account. Try logging in instead.";
        case "auth/invalid-email":
            return "That email address does not look right.";
        case "auth/weak-password":
            return "Please choose a stronger password, at least 6 characters.";
        case "auth/network-request-failed":
            return "No connection. Check your internet and try again.";
        default:
            return "Could not create your account. Please try again.";
    }
}
