"use client";
import { useState, useEffect, Suspense } from "react";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocs, query, where, setDoc, doc } from "firebase/firestore";
import { collection } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { PutBlobResult } from "@vercel/blob";

import {
  auth,
  db,
  requestPermissionAndGetToken,
} from "../../utils/firebaseConfig";
import { updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

const RegisterPage = () => {
  const profilePicInputRef = useRef(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter(); // Initialize useRouter for navigation
  //const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams?.get("email") || "";
    console.log("hi");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  /*
   * Function that handles register button on click. Checks if email already exists and
   * creates new user with docID as email. Profile picture is saved with Marco's API calls
   */

  const handleRegister = async () => {
    if (!email.trim()) {
      alert("Email cannot be blank.");
      return;
    }
    if (!password.trim()) {
      alert("Password cannot be blank.");
      return;
    }
    if (!username.trim()) {
      alert("Username cannot be blank.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    try {
      /* Check if email already exists in the Firestore database */
      const userQuery = query(
        collection(db, "Users"),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        alert("Email is already registered. Please use a different email.");
        return;
      }

      /* firebase authentication */
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const fcmToken = await requestPermissionAndGetToken();
      if (fcmToken) {
        const userDocRef = doc(db, "Users", user.uid);
        await updateDoc(userDocRef, {
          fcmToken: fcmToken,
        });
        console.log("FCM token saved to Firestore for user:", user.uid);
      }

      // Stefan's code relating to account switching; do not comment out
      await setDoc(doc(db, "UserPasswords", user.uid), {
        password: password,
      });

      /* profile picture save with Marco API */
      if (profilePicture) {
        // const formData = new FormData();
        // formData.append("image", profilePicture);
        try {
          fetch("api/blob/upload", {
            method: "POST",
            headers: {
              "content-type": profilePicture?.type || "application/octet-stream",
            },
            body: profilePicture,
          }).then(async (result) => {
            const { url } = (await result.json()) as PutBlobResult;
            setUrl(url);
            await setDoc(doc(db, "Users", user.uid), {
              email: email,
              username: username,
              isLightTheme: true,
              profilePic: url,
            });
          });
        } catch (error) {
          console.error("uppload failed", error);
        }
      }
      
      /* reset form fields */
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setProfilePicture(null);

      /* redirect to profile page*/
      router.push("/profile"); // Redirect to profile page
    } catch (e) {
      if (e instanceof FirebaseError) {
        if (e.code === 'auth/invalid-email') {
          alert("Please enter a valid email");
        } else if (e.code === 'auth/weak-password') {
          alert("Password should be at least 6 characters");
        } else {
          alert("An unknown error occurred. Please try again.");
        }
      } else {
        // Handle the case where the error isn't a FirebaseError
        console.log("error fetching workout", e);

        alert("An unexpected error occurred.");
      }
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Register
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Username */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="text"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Display Name</Label>
            <Input
              type="text"
              placeholder="Enter username name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Password</Label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Confirm Password</Label>
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Profile Picture Upload */}

          <div className="mb-4 flex flex-col items-center">
            <Label className="text-sm font-medium">Profile Picture</Label>
            <Input
              type="file"
              accept="image/*"
              className="mt-2"
              ref={profilePicInputRef} // Attach ref to the file input
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setProfilePicture(e.target.files[0]); // Save the file in state
                }
              }}
            />
          </div>

          {/* Register Button */}
          <Button
            onClick={handleRegister}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
          >
            Register
          </Button>
          {/* Back Button */}
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all mt-4"
          >
            Back to login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Register() {
  return (
    <Suspense fallback={<div>Loading</div>}>
      <RegisterPage />
    </Suspense>
  );
}
