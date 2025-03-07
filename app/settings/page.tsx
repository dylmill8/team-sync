"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, updatePassword, deleteUser } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig.js";
import { Switch } from "@/components/ui/switch";
import { doc, setDoc } from "@firebase/firestore";
import { db } from "@/utils/firebaseConfig.js";
import NavBar from "@/components/ui/navigation-bar";
import { setDocument, viewDocument, logout } from "../../utils/firebaseHelper.js";

export default function Settings() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [formData, setFormData] = useState({ email: "", username: "", isLightTheme: false});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("/default.png");

    const [isLightMode, setIsLightMode] = localStorage.getItem("theme") === "light" ? useState(false) : useState(true);
  const [newPassword, setNewPassword] = useState("");

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
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        const data = await viewDocument("Users", userId);
        if (data) {
          setFormData({
            email: data.email || "",
            username: data.username || "",
            isLightTheme: data.isLightTheme || false,
          });
          setIsLightMode(data.isLightTheme || false);
        }
        setLoading(false);
      }
    };

    const fetchProfileImage = async () => {
      try {
        const res = await fetch(`/api/getProfileImage?userId=${userId}`);
        const data = await res.json();
        if (res.ok && data.file) {
          setPreview(`/uploads/${data.file}?timestamp=${Date.now()}`);
        }
      } catch {
        setPreview("/uploads/testuser.png");
      }
    };

    if (userId) {
      fetchUserData();
      fetchProfileImage();
    }
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
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
      const res = await fetch(`/api/upload?userId=${userId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }
      alert("Upload successful!");
    } catch (error: any) {
      alert(`Upload failed! ${error.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);
    try {
      formData.isLightTheme = isLightMode;
      await setDocument("Users", userId, formData);
      alert("Profile updated successfully!");
    } catch {
      alert("Error updating profile.");
    } finally {
      setUpdating(false);
    }
  };

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    const user = auth.currentUser;

    if (user) {
      const userDocRef = doc(db, "Users", user.uid);
      setDoc(userDocRef, { isLightTheme: isLightMode }, { merge: true });
      if (isLightMode) {
        localStorage.setItem("theme", "light");
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
      } else {
        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
      }
      console.log("Theme updated!" + localStorage.getItem("theme"));
    }
  };

  const handleLogout = async () => {
    try {
      logout();
      router.push("/");
    } catch (error) {
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
    } catch (error) {
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
        // Update password without old password
        await updatePassword(user, newPassword);
        alert("Password updated successfully!");
      }
    } catch (error: any) {
      alert(`Error updating password: ${error.message}`);
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
      <h1 style={{ fontSize: "24px", marginBottom: "15px" }}>Settings</h1>

      <div style={{ marginBottom: "20px" }}>
        <img
          src={preview}
          alt="Profile"
          width="150"
          style={{
            display: "block",
            margin: "0 auto",
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #0070f3",
          }}
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
          {updating ? "Updating..." : "Save Changes"}
        </button>
      </form>

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
