import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const messaging =
  typeof window !== "undefined" ? getMessaging(firebaseApp) : null;

function initAuthPersistence() {
  // Set persistence
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("Auth persistence set to local storage"))
    .catch((error) => console.error("Error setting auth persistence:", error));

  // Monitor auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User is signed in:", user.uid);
    } else {
      console.log("No user is signed in.");
    }
  });
}
// Request permission and get FCM token
async function requestPermissionAndGetToken() {
  if (!messaging) return null;

  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    console.log("FCM Token:", token);
    return token;
  } catch (err) {
    console.error("Failed to get FCM token:", err);
    return null;
  }
}

// Listen for foreground messages
function onForegroundMessage(callback) {
  if (!messaging) return;
  onMessage(messaging, callback);
}

export {
  firebaseApp,
  db,
  auth,
  messaging,
  onAuthStateChanged,
  requestPermissionAndGetToken,
  onForegroundMessage,
  initAuthPersistence,
};
