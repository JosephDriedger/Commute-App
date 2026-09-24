var emailAddress;

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        emailAddress = user.email;
    } else {
        window.location.href = "./login";
    }
});

function showMessage(text, className) {
    let message = document.getElementById("emailMessage");
    message.className = "small mt-2 mb-0 " + className;
    message.textContent = text;
}

// Check if email entered matches the current user's email.
function matchInputWithValues() {
    let input = document.getElementById("emailInput").value.trim().toLowerCase();
    let matches = !!emailAddress && input === emailAddress.toLowerCase();

    // Only allow the user to send a request once the email matches.
    document.getElementById("sendRequest").disabled = !matches;
    if (matches) {
        showMessage("Email Verified.", "text-success");
    } else if (input) {
        showMessage("Your email input does not match your account.", "text-danger");
    } else {
        showMessage("", "");
    }
}

document.getElementById("sendRequest").addEventListener("click", sendRequest);

function sendRequest() {
    firebase.auth().sendPasswordResetEmail(emailAddress).then(function () {
        showMessage("Email Sent. Please check your Inbox.", "text-success");
        document.getElementById("sendRequest").disabled = true;
    }).catch(function (error) {
        showMessage("Something went wrong. Please try again later.", "text-danger");
        console.log(error);
    });
}
