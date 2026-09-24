var currentUser;

function populateInfo() {
    firebase.auth().onAuthStateChanged(user => {
        // Check if user is signed in:
        if (user) {

            //go to the correct user document by referencing to the user uid
            currentUser = db.collection("users").doc(user.uid)
            //get the document for current user.
            currentUser.get()
                .then(userDoc => {
                    if (!userDoc.exists) {
                        return;
                    }
                    //get the data fields of the user
                    var userName = userDoc.data().name;
                    var userPhoneNum = userDoc.data().phoneNum;
                    var userCity = userDoc.data().city;
                    var userProvince = userDoc.data().province;
                    var userCountry = userDoc.data().country;
                    var userTransport = userDoc.data().transport;

                    //if the data fields are not empty, then write them in to the form.
                    if (userName != null) {
                        document.getElementById("nameInput").value = userName;
                    }
                    if (userPhoneNum != null) {
                        document.getElementById("phoneNumInput").value = userPhoneNum;
                    }
                    if (userCity != null) {
                        document.getElementById("cityInput").value = userCity;
                    }
                    if (userProvince != null) {
                        document.getElementById("provinceInput").value = userProvince;
                    }
                    if (userCountry != null) {
                        document.getElementById("countryInput").value = userCountry
                    }
                    if (userTransport != null) {
                        document.getElementById("transportInput").value = userTransport;
                    }
                })
        } else {
            // No user is signed in.
            window.location.href = "./login";
        }
    });
}

function editUserInfo() {
    //Enable the form fields
    document.getElementById('personalInfoFields').disabled = false;
}

// Save User Information
function saveUserInfo() {
    let userName = document.getElementById('nameInput').value;
    let userPhoneNum = document.getElementById('phoneNumInput').value;
    let userCity = document.getElementById('cityInput').value;
    let userProvince = document.getElementById('provinceInput').value;
    let userCountry = document.getElementById('countryInput').value;
    let userTransport = document.getElementById('transportInput').value;

    currentUser.set({
        name: userName,
        phoneNum: userPhoneNum,
        city: userCity,
        province: userProvince,
        country: userCountry,
        transport: userTransport
    }, { merge: true })
    .then(() => {
        document.getElementById('personalInfoFields').disabled = true;
        showToast("Profile saved.");
    })
    .catch(error => {
        console.log("Error updating profile: ", error);
        showToast("Could not save your profile. Please try again.", "error");
    })
}

//call the function to run it 
populateInfo();