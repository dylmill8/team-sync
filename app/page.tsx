"use client"
import Image from "next/image";
import Link from 'next/link';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { setDocument, viewDocument } from "../utils/firebaseHelper.js"
import { db } from "../utils/firebaseConfig"; 
import { collection, query, where, getDocs } from "firebase/firestore";


export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const auth = getAuth();

  const changeEmailInput = (e) => {
    setEmail(e.target.value);
  }

  const changePasswordInput = (e) => {
    setPassword(e.target.value);
  }

  const handleLogin = async () => {
    console.log("trying login with EMAIL:" + email + " | PASSWORD:" + password + "\n");
    setError("");

    if (!email) {
      setError("Email cannot be blank.");
      return;
    }
    if (!password) {
      setError("Password cannot be blank.");
      return;
    }

    // Fetch user data from Firestore
    const usersRef = collection(db, "Users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot || querySnapshot.empty) {
      setError("Account with this email not found.");
      return;
    }

    // Sign in
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;
        console.log("Successfully logged in!");
        console.log("User ID (UID):", user.uid);
        console.log("User Email:", user.email);
        window.location.href = "/calendar"; // Redirect on success
      })
      .catch((err) => {
        console.log(err.code);
        console.log(err.message);
        setError("Invalid email or password.");
      });
}

  return (
    <div className="bg-[rgb(230,230,230)] grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
          <h1 className="text-black text-center text-5xl underline text-bold">Team Sync</h1>

        <ul className="list-inside text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="text-black mb-2 flex justify-between items-center gap-2" >
            <span>Email:</span>
            <input
            type="text"
            style={{ backgroundColor: "rgb(180, 180, 180)" , borderColor: "rgb(100, 100, 100)"}}
            className="border rounded px-2 py-1 text-black placeholder-[rgb(70,70,70)]"
            placeholder="Enter email"
            value={email}
            onChange={changeEmailInput}
            />
          </li>

          <li className="text-black mb-2 flex justify-between items-center gap-2" >
            <span>Password:</span>
            <input
            type="password"
            style={{ backgroundColor: "rgb(180, 180, 180)" , borderColor: "rgb(100, 100, 100)"}}
            className="border rounded px-2 py-1 text-black placeholder-[rgb(70,70,70)]"
            placeholder="Enter password"
            value={password}
            onChange={changePasswordInput}
            />
          </li>
        </ul>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-black/[.70] text-black transition-colors flex items-center justify-center hover:bg-[#222222] hover:text-[#ffffff] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-28"
            //href="/Calendar"
            //target="_blank"
            rel="noopener noreferrer"
            onClick={handleLogin}
          >
            <Image
              className="dark:invert mr-2"
              src="/globe.svg"
              alt="globe"
              width={20}
              height={20}
            />
            Log in
          </a>
          <Link
            className="rounded-full border border-solid border-black/[.08] dark:border-black/[.70] text-black transition-colors flex items-center justify-center hover:bg-[#222222] hover:text-[#ffffff] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            href="/RegisterSample"
            //target="_blank"
            rel="noopener noreferrer"
          >
            Sign up
          </Link>
        </div>

        <div className="flex text-[rgb(200,0,0)] gap-4 items-center flex-col sm:flex-row">
          {error}
        </div>
      </main>
      
    </div>
  );
}
