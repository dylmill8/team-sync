import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Ask for permission and get FCM token
export async function requestPermissionAndGetToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: "your-public-vapid-key", // Get this from Firebase Console
    });
    console.log("FCM Token:", token);
    return token;
  } catch (err) {
    console.error("Failed to get FCM token:", err);
  }
}

// Handle messages when app is in foreground
onMessage(messaging, (payload) => {
  console.log("Foreground push message received:", payload);
  alert(payload.notification.title + ": " + payload.notification.body);
});
