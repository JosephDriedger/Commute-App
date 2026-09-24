// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());

var uiConfig = {
    callbacks: {
      signInSuccessWithAuthResult: function(authResult, redirectUrl) {
        // User successfully signed in.
        // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle.
        var user = authResult.user; //get the user object info
        if (authResult.additionalUserInfo.isNewUser) {
          // create a collection with name "users"
          db.collection("users")
            //define a document for a user with UID as a document ID
            .doc(user.uid).set({
              name: user.displayName,
              email: user.email
            }).then(function () {
              console.log("New user added to firestore");
              window.location.assign("./main?welcome=1");
            })
            .catch(function (error) {
              console.log(error);
              window.location.assign("./main?welcome=1");
            })

        } else {
          return true;
        }
        return false;
      },
      uiShown: function() {
        // The widget is rendered.
        // Hide the loader.
        var loader = document.getElementById('loader');
        if (loader) {
          loader.style.display = 'none';
        }
      }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: 'popup',
    signInSuccessUrl: "./main",
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
    //   firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    //   firebase.auth.FacebookAuthProvider.PROVIDER_ID,
    //   firebase.auth.TwitterAuthProvider.PROVIDER_ID,
    //   firebase.auth.GithubAuthProvider.PROVIDER_ID,
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
    //   firebase.auth.PhoneAuthProvider.PROVIDER_ID
    ]
  };

ui.start('#firebaseui-auth-container', uiConfig);
