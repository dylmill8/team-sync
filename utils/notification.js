import { doc, getDoc } from "@firebase/firestore";
import { db } from "./firebaseConfig"; 


async function sendEmailNotification(email, subject, message) {
    alert("SENDING EMAIL NOTIF")
  console.log(`Sending email to ${email} with subject: "${subject}" and message: "${message}"`);
} 


/**
 * notifyUsers - Helper function to send notifications.
 *
 * @param {string[]} userIds - List of user IDs to notify.
 * @param {string} category - Notification category ("Announcement" or "FriendRequest").
 * @param {string} message - The message to send.
 */
export async function notifyUsers(members, category, message) {
  // Map the human-readable category to the notification setting key in Firestore.
  let notificationKey = "";
  if (category === "Announcement") {
    notificationKey = "announcement";
  } else if (category === "FriendRequest") {
    notificationKey = "friendRequest";
  } else {
    throw new Error("Unsupported notification category");
  }

  // Iterate over each user.
  const userIds = Object.keys(members);

  for (const userId of userIds) {
    try {
      // Retrieve the user's document.
      const userDoc = await getDoc(doc(db, "Users", userId));
      if (!userDoc.exists()) {
        console.warn(`User document for ${userId} does not exist.`);
        continue;
      }
      const userData = userDoc.data();
      const notifSettings = userData.notificationSettings;
      // If no notification settings are found, assume notifications are off.
      if (!notifSettings) {
        console.log(`No notification settings found for user ${userId}. Skipping.`);
        continue;
      }

      // Check if the specific notification category is enabled.
      if (!notifSettings[notificationKey]) {
        console.log(`User ${userId} has disabled ${category} notifications.`);
        continue;
      }

      // If email notifications are enabled and an email is provided, send an email.
      if (notifSettings.emailNotifications && notifSettings.notificationEmail) {
        await sendEmailNotification(
          notifSettings.notificationEmail,
          `New ${category}`,
          message
        );
      }

      // If popup (push) notifications are enabled, send a push notification.
      if (notifSettings.popupNotifications) {
        //logic here
        /*if (sent) {
            alert(`Notification sent to ${userId}`);
        } else {
            alert(`User ${userId} is not connected. Cannot send notification.`);
        }*/
       console.log(message)
      }
    } catch (error) {
      console.error(`Error notifying user ${userId}:`, error);
    }
  }
}
