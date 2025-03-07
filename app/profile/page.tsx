"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig.js";
import { viewDocument } from "../../utils/firebaseHelper.js";
import NavBar from "@/components/ui/navigation-bar";

export default function Profile() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userData, setUserData] = useState({ email: "", username: "" });
  const [preview, setPreview] = useState("/default.png");
  const [isToggleOn, setIsToggleOn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push("/registration");
        setUserId("testuser");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      const userDoc = await viewDocument("Users", userId);
      if (userDoc) {
        setUserData({
          email: userDoc.email || "",
          username: userDoc.username || "",
        });
        setIsToggleOn(userDoc.toggleSetting || false);
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

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
      }}
    >
      <h1>Profile Page</h1>
      <img
        src={preview}
        alt="Profile"
        width="200"
        style={{
          display: "block",
          margin: "0 auto",
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #ccc",
        }}
        onError={(e) => (e.currentTarget.src = "/default-profile.jpg")}
      />
      <h2>User ID: {userId}</h2>
      <p><strong>Email:</strong> {userData.email}</p>
      <p><strong>Username:</strong> {userData.username}</p>
      <button
        onClick={() => router.push("/settings")}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Go to Settings
      </button>
      <NavBar />

    </div>
  );
}
