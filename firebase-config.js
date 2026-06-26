// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBwCSKHNhzCIorttBaI0b-0q-Nh4CEeIgQ",
  authDomain: "okdprofile.firebaseapp.com",
  projectId: "okdprofile",
  storageBucket: "okdprofile.firebasestorage.app",
  messagingSenderId: "992017787893",
  appId: "1:992017787893:web:304fb481d0bb36ac4acebc",
  measurementId: "G-1FM3GJLXJM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
