"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, updatePassword, deleteUser, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig.js";
import { Switch } from "@/components/ui/switch";
import { doc, setDoc, getDoc, updateDoc, DocumentReference } from "@firebase/firestore";
import { db } from "@/utils/firebaseConfig.js";
import NavBar from "@/components/ui/navigation-bar";
import { setDocument, viewDocument, logout } from "../../utils/firebaseHelper.js";
import NextImage from "next/image";
import { PutBlobResult } from "@vercel/blob";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LooseAccount = {
  id?: string;
  username?: string;
  email?: string;
  [key: string]: unknown;
};

type FormData = {
  email: string;
  username: string;
  isLightTheme: boolean;
  profilePic: string | null;
  statVisibility: string;
};

export default function Settings() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [formData, setFormData] = useState<FormData>({ email: "", username: "", isLightTheme: false, profilePic: null, statVisibility: "only me" });
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [otherAccounts, setOtherAccounts] = useState<LooseAccount[]>([]);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [settings, setSettings] = useState({
    emailNotifications: false,
    friendRequest: true,
    announcement: true,
  });
  const [isLightMode, setIsLightMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [statVisibility, setStatVisibility] = useState<string>("only me");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push("/");
        setUserId("testuser");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        const data = await viewDocument("Users", userId);
        if (data) {
          setFormData({
            email: data.email || "",
            username: data.username || "",
            isLightTheme: data.isLightTheme || false,
            profilePic: data.profilePic || null,
            statVisibility: data.statVisibility || "only me",
          });
          setIsLightMode(!data.isLightTheme || false);
          setStatVisibility(data.statVisibility || "only me");
        }
      }
    };

    const fetchSettings = async () => {
      if (userId) {
        const docRef = doc(db, "Users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.notificationSettings) {
            setSettings({
              emailNotifications: data.notificationSettings.emailNotifications ?? false,
              friendRequest: data.notificationSettings.friendRequest ?? true,
              announcement: data.notificationSettings.announcement ?? true,
            });
            setNotificationEmail(data.notificationSettings.notificationEmail || "");
          }
        }
      }
    };

    if (userId) {
      fetchUserData();
      fetchSettings();
    }
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setImage(file);
      const previewUrl = URL.createObjectURL(file);
      setFormData({
        email: formData.email || "",
        username: formData.username || "",
        isLightTheme: formData.isLightTheme || false,
        profilePic: previewUrl || null,
        statVisibility: formData.statVisibility || "only me",
      });
    }
  };

  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!image) {
      alert("Please select an image!");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("image", image);
    try {
      fetch("../api/blob/upload", {
        method: "POST",
        headers: {
          "content-type": image?.type || "application/octet-stream",
        },
        body: image,
      })
        .then(async (result) => {
          if (!result.ok) {
            throw new Error("Failed to upload the picture");
          }
          const { url } = await result.json() as PutBlobResult;

          await setDoc(doc(db, "Users", userId), {
            profilePic: url,
          }, { merge: true });
        })
        .catch((error) => {
          console.error("Upload failed", error);
        });
      alert("Successfully uploaded profile picture.");
    } catch (error) {
      console.error("upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);
    try {
      formData.isLightTheme = !isLightMode;
      formData.statVisibility = statVisibility;
      // 1) update own user document
      await setDocument("Users", userId, formData);

      // 2) propagate new username to all groups
      const userSnap = await getDoc(doc(db, "Users", userId));
      const groups = (userSnap.data()?.groups as DocumentReference[] | undefined) || [];
      for (const groupRef of groups) {
        const grpSnap = await getDoc(groupRef);
        if (!grpSnap.exists()) continue;
        const members = grpSnap.data().members as Record<string, [string, string]>;
        const role = members[userId][1];
        await updateDoc(groupRef, {
          [`members.${userId}`]: [formData.username, role],
        });
      }

      alert("Profile and all group member records updated!");
    } catch {
      alert("Error updating profile.");
    } finally {
      setUpdating(false);
    }
  };

  const switchAccount = async (newUserId: string) => {
    try {
      const userDocRef = doc(db, "Users", newUserId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error("No user document found for this account.");
      }

      const { email } = userDocSnap.data();

      const passwordRef = doc(db, "UserPasswords", newUserId);
      const passwordSnap = await getDoc(passwordRef);

      if (!passwordSnap.exists()) {
        throw new Error("No password found for this account.");
      }

      const { password } = passwordSnap.data();

      await signOut(auth);

      await signInWithEmailAndPassword(auth, email, password);

      router.push(`/settings/`);

    } catch (error) {
      if (error instanceof Error) {
        alert(`Error Switching Accounts! ${error.message || "Unknown error"}`);
      } else {
        alert("Error Switching Accounts! Unknown error");
      }
    }
  };

  const unlinkAccount = async (newUserId: string) => {
    try {
      const userDocRef = doc(db, "Users", userId);
      const otherUserDocRef = doc(db, "Users", newUserId);

      const userDocSnap = await getDoc(userDocRef);
      const otherUserDocSnap = await getDoc(otherUserDocRef);

      if (!userDocSnap.exists() || !otherUserDocSnap.exists()) {
        throw new Error("One or both user documents do not exist.");
      }

      const userData = userDocSnap.data();
      const otherUserData = otherUserDocSnap.data();

      if (userData.otherAccounts && Array.isArray(userData.otherAccounts)) {
        const updatedOtherAccounts = userData.otherAccounts.filter(
          (accountRef: { id: string }) => accountRef.id !== newUserId
        );
        await setDoc(userDocRef, { otherAccounts: updatedOtherAccounts }, { merge: true });
      }

      if (otherUserData.otherAccounts && Array.isArray(otherUserData.otherAccounts)) {
        const updatedOtherAccounts = otherUserData.otherAccounts.filter(
          (accountRef: { id: string }) => accountRef.id !== userId
        );
        await setDoc(otherUserDocRef, { otherAccounts: updatedOtherAccounts }, { merge: true });
      }

      alert("Account unlinked successfully!");

      const updatedUserDocSnap = await getDoc(userDocRef);
      if (updatedUserDocSnap.exists()) {
        const updatedUserData = updatedUserDocSnap.data();
        if (updatedUserData.otherAccounts && Array.isArray(updatedUserData.otherAccounts)) {
          const accountPromises = updatedUserData.otherAccounts.map(async (accountRef) => {
            const accountDoc = await getDoc(accountRef);
            return accountDoc.exists()
              ? { id: accountDoc.id, ...(accountDoc.data() as object) }
              : null;
          });
          const updatedAccounts = (await Promise.all(accountPromises)).filter(
            (account): account is Omit<LooseAccount, "id"> & { id: string } =>
              account !== null && typeof account.id === "string"
          );
          setOtherAccounts(updatedAccounts);
        } else {
          setOtherAccounts([]);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(`Error unlinking account! ${error.message || "Unknown error"}`);
      } else {
        alert("Error unlinking account! Unknown error");
      }
    }
  };

  useEffect(() => {
    const fetchOtherAccounts = async () => {
      if (!userId) return;

      try {
        const userDocRef = doc(db, "Users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          if (userData.otherAccounts && Array.isArray(userData.otherAccounts)) {
            const accountPromises = userData.otherAccounts.map(async (accountRef) => {
              const accountDoc = await getDoc(accountRef);
              return accountDoc.exists()
                ? { id: accountDoc.id, ...(accountDoc.data() as object) }
                : null;
            });

            const accountData = (await Promise.all(accountPromises)).filter((account): account is Omit<LooseAccount, "id"> & { id: string } => account !== null && typeof account.id === "string");
            setOtherAccounts(accountData);
          } else {
            setOtherAccounts([]);
          }
        }
      } catch (error) {
        console.error("Error fetching other accounts:", error);
      }
    };

    fetchOtherAccounts();
  }, [userId]);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    const user = auth.currentUser;

    if (user) {
      const userDocRef = doc(db, "Users", user.uid);
      setDoc(userDocRef, { isLightTheme: isLightMode }, { merge: true });
      if (isLightMode) {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
      } else {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
      }
    }

    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleLogout = async () => {
    try {
      logout();
      router.push("/");
    } catch {
      alert("Error logging out.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await deleteUser(user);
        alert("Account deleted successfully!");
        router.push("/");
      }
    } catch {
      alert("Error deleting account.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPassword) {
      alert("New password is required.");
      return;
    }
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        await setDoc(doc(db, "UserPasswords", user.uid), {
          password: newPassword,
        });
        alert("Password updated successfully!");
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(`Error updating password! ${error.message || "Unknown error"}`);
      } else {
        alert("Error updating password!");
      }
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    if (settings.emailNotifications && !validateEmail(notificationEmail)) {
      alert("Please enter a valid email for notifications.");
      return;
    }
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
        maxWidth: "600px",
        margin: "40px auto",
        padding: "25px",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "15px" }}>Settings</h1>

      <div className="mb-5 flex justify-center">
        <NextImage
          src={formData?.profilePic || "https://ns6ela3qh5m1napj.public.blob.vercel-storage.com/88BqvzD.-sYOdx4LwT08Vjf9C4TxU17uTscYPjn.bin"}
          alt="Profile"
          width={150}
          height={150}
          className="rounded-full object-cover w-[150px] h-[150px]"
          style={{ border: "3px solid #0070f3" }}
          onError={(e) =>
            (e.currentTarget.src =
              "https://ns6ela3qh5m1napj.public.blob.vercel-storage.com/88BqvzD.-sYOdx4LwT08Vjf9C4TxU17uTscYPjn.bin")
          }
        />
      </div>
      <form onSubmit={handleUpload} style={{ marginBottom: "20px" }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          required
          style={{ display: "block", margin: "10px auto" }}
        />
        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: "10px 15px",
            backgroundColor: uploading ? "#ccc" : "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: uploading ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {uploading ? "Uploading..." : "Upload New Image"}
        </button>
      </form>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px", textAlign: "left" }}>
          <label style={{ fontWeight: "bold", display: "block" }}>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              color: "black"
            }}
            required
          />
        </div>
        <div style={{ marginBottom: "15px", textAlign: "left" }}>
          <label style={{ fontWeight: "bold", display: "block" }}>Username:</label>
          <input
            type="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              color: "black"
            }}
            required
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-left space-x-6 mb-4">
            <label style={{ fontWeight: "bold", display: "block" }}>Theme:</label>
            <Switch
              checked={isLightMode}
              onCheckedChange={toggleTheme}
            />
            <span className="text-m">{isLightMode ? "Dark Mode" : "Light Mode"}</span>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-left space-x-6 mb-4">
            <label style={{ fontWeight: "bold", display: "block" }}>Overview Visibility:</label>
            <Select value={statVisibility} onValueChange={setStatVisibility}>
              <SelectTrigger id="visibility">
                <SelectValue placeholder="Select Visibility"></SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="only me">Only Me</SelectItem>
                <SelectItem value="my friends">My Friends</SelectItem>
                <SelectItem value="everyone">Everyone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <button
          type="submit"
          disabled={updating}
          style={{
            padding: "10px 15px",
            backgroundColor: updating ? "#ccc" : "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: updating ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {updating ? "Updating..." : "Save Profile Settings"}
        </button>
      </form>

      <div style={{ marginTop: "10px" }}></div>
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

      <div style={{ marginTop: "10px" }}></div>
      <h1 style={{ fontSize: "24px", marginBottom: "25px" }}>Account Settings</h1>

      <form onSubmit={handleChangePassword}>
        <div style={{ marginBottom: "15px", textAlign: "left" }}>
          <label style={{ fontWeight: "bold", display: "block" }}>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              color: "black"
            }}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "10px 15px",
            backgroundColor: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Change Password
        </button>
      </form>

      <div className="mt-[15px] justify-center flex flex-col p-4 border border-gray-300 rounded-lg shadow-md flex flex-col items-center">
        <button
          type="submit"
          onClick={() => setShowAccounts(!showAccounts)}
          style={{
            padding: "10px",
            backgroundColor: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {showAccounts ? "Hide Other Accounts ▲" : "Show Other Accounts ▼"}
        </button>

        <div className="flex flex-col items-center justify-center">
          {showAccounts ? (
            <div className="flex flex-col w-full">
              <div className="w-full">
                <p className="text-center mb-4 mt-4">
                  You can view, switch to, and add other accounts here.
                </p>
                {otherAccounts.length > 0 ? (
                  <ul className="flex flex-col gap-y-4 mt-4">
                    {(otherAccounts as LooseAccount[]).map((account, i) => (
                      <div
                        className="flex flex-row items-center justify-center gap-x-4 w-full"
                        key={account.id ?? i}
                      >
                        <button
                          className="text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 mb-2 text-left whitespace-nowrap overflow-hidden text-ellipsis rounded-full border border-solid transition-colors max-w-[40vw] min-w-[10vw]"
                          style={{
                            display: "block",
                          }}
                          onClick={() =>
                            account.id ? router.push(`/profile/${account.id}`) : null
                          }
                        >
                          {account.username ?? "Unnamed"} ({account.email ?? "No email"})
                        </button>
                        <button
                          className="flex flex-col rounded-full border border-solid transition-colors items-center justify-center text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 mb-2"
                          onClick={() =>
                            account.id ? switchAccount(account.id) : null
                          }
                        >
                          Switch
                        </button>
                        <button
                          className="rounded-full border border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 mb-2"
                          onClick={() =>
                            unlinkAccount(account.id ?? "")
                          }
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </ul>
                ) : (
                  <p>No other accounts found.</p>
                )}
              </div>
              <div className="border-t border-gray-300 justify-center mt-4"></div>
              <div className="w-full flex justify-center mt-4">
                <button
                  className="rounded-full border border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 sm:min-w-30"
                  onClick={() => router.push(`/?addAccount=true`)}
                >
                  Add Account
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

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

      <button
        onClick={handleLogout}
        style={{
          marginTop: "15px",
          padding: "10px",
          backgroundColor: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Logout
      </button>

      <button
        onClick={handleDeleteAccount}
        style={{
          marginTop: "15px",
          padding: "10px",
          backgroundColor: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Delete Account
      </button>

      <NavBar />
    </div>
  );
}