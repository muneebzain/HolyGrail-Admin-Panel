// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // ✅ This import was missing

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB1OhN-e408UiLto5QxPQgKaQTzwktSrVE",
    authDomain: "holugrail-sneaker-app.firebaseapp.com",
    projectId: "holugrail-sneaker-app",
    storageBucket: "holugrail-sneaker-app.appspot.com",
    messagingSenderId: "208658217568",
    appId: "1:208658217568:web:1b84f1d99868096130a105",
    measurementId: "G-6BZ7YNJE93"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// ✅ Export Firestore instance
export const db = getFirestore(app);
