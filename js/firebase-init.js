import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyyadc2LCDB0BwMMoUbYvYaF6oRAKkhZQ",
  authDomain: "rob-roys-boys.firebaseapp.com",
  projectId: "rob-roys-boys",
  storageBucket: "rob-roys-boys.firebasestorage.app",
  messagingSenderId: "6262725962",
  appId: "1:6262725962:web:8c085907d9425d669a35b3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);

// No visible login for players -- everyone just picks their name from a dropdown.
// Signing in anonymously in the background still lets Firestore rules require
// `request.auth != null` for writes, so the site isn't wide open to random bots.
export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) resolve(user);
  });
  signInAnonymously(auth).catch((err) => {
    console.error("Anonymous sign-in failed:", err);
  });
});

export {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
};