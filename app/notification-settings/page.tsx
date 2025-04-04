"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig";
import { doc, getDoc, setDoc } from "@firebase/firestore";
import { db } from "../../utils/firebaseConfig";
import { Switch } from "@/components/ui/switch";
import NavBar from "@/components/ui/navigation-bar";

export default function NotificationSettings() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [settings, setSettings] = useState({
    emailNotifications: false,
    popupNotifications: true,
    friendRequest: true,
    announcement: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [ router ]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (userId) {
        const docRef = doc(db, "Users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.notificationSettings) {
            setSettings({
              emailNotifications: data.notificationSettings.emailNotifications ?? false,
              popupNotifications: data.notificationSettings.popupNotifications ?? true,
              friendRequest: data.notificationSettings.friendRequest ?? true,
              announcement: data.notificationSettings.announcement ?? true,
            });
            setNotificationEmail(data.notificationSettings.notificationEmail || "");
          }
        }
      }
    };

    fetchSettings();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "Users", userId),
        {
          notificationSettings: {
            ...settings,
            notificationEmail,
          },
        },
        { merge: true }
      );
      alert("Notification settings saved!");
    } catch {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "40px auto",
        padding: "25px",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "25px" }}>Notification Settings</h1>

      <div style={{ textAlign: "left", marginBottom: "25px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
          Notification Methods
        </h2>

        <div className="flex items-center justify-between mb-4">
          <label>Email Notifications</label>
          <Switch
            checked={settings.emailNotifications}
            onCheckedChange={() =>
              setSettings((prev) => ({
                ...prev,
                emailNotifications: !prev.emailNotifications,
              }))
            }
          />
        </div>

        <input
          type="email"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          placeholder="Enter email for notifications"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            color: "black",
            marginBottom: "20px",
          }}
        />

        <div className="flex items-center justify-between mb-4">
          <label>Pop-up Notifications</label>
          <Switch
            checked={settings.popupNotifications}
            onCheckedChange={() =>
              setSettings((prev) => ({
                ...prev,
                popupNotifications: !prev.popupNotifications,
              }))
            }
          />
        </div>
      </div>

      <div style={{ textAlign: "left", marginBottom: "25px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
          Notification Items
        </h2>

        <div className="flex items-center justify-between mb-4">
          <label>Friend Requests</label>
          <Switch
            checked={settings.friendRequest}
            onCheckedChange={() =>
              setSettings((prev) => ({
                ...prev,
                friendRequest: !prev.friendRequest,
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <label>Announcements</label>
          <Switch
            checked={settings.announcement}
            onCheckedChange={() =>
              setSettings((prev) => ({
                ...prev,
                announcement: !prev.announcement,
              }))
            }
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 15px",
          backgroundColor: saving ? "#ccc" : "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: saving ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        {saving ? "Saving..." : "Save Notification Settings"}
      </button>

      <button
        onClick={() => router.push("/profile")}
        style={{
          marginTop: "15px",
          padding: "10px",
          backgroundColor: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Back to Profile
      </button>

      <NavBar />
    </div>
  );
}
