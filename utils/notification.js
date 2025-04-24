import { doc, getDoc } from "@firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * notifyUsers - Helper function to send notifications.
 *
 * @param {string[]} members - Object with user IDs to notify.
 * @param {string} category - Notification category ("Announcement" or "FriendRequest").
 * @param {string} message - The message to send.
 */
export async function notifyUsers(members, category, message) {
  let notificationKey = "";
  if (category === "Announcement") {
    notificationKey = "announcement";
  } else if (category === "FriendRequest") {
    notificationKey = "friendRequest";
  } else {
    throw new Error("Unsupported notification category");
  }

  const userIds = Array.isArray(members) ? members : Object.keys(members);

  for (const userId of userIds) {
    try {
      const userDoc = await getDoc(doc(db, "Users", userId));
      if (!userDoc.exists()) {
        alert(`User document for ${userId} does not exist.`);
        continue;
      }

      const userData = userDoc.data();
      const notifSettings = userData.notificationSettings;

      if (!notifSettings) {
        alert(`No notification settings found for user ${userId}. Skipping.`);
        continue;
      }

      if (!notifSettings[notificationKey]) {
        alert(`User ${userId} has disabled ${category} notifications.`);
        continue;
      }

      if (
        notifSettings[notificationKey] &&
        notifSettings.emailNotifications &&
        notifSettings.notificationEmail
      ) {

        const response = await fetch("/api/sendNormalEmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: notifSettings.notificationEmail,
            subject: `${category}`,
            content: `${message}`,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          alert(`Failed to send email to ${userId}:`, result.error);
        }
      }

      if (notifSettings.popupNotifications) {
        // Logic for push notification
        console.log(message);
      }
    } catch (error) {
      alert(`Error notifying user ${userId}:`, error);
    }
  }
}
