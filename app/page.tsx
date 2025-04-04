"use client"
import Image from "next/image";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from "firebase/auth";
import React, { useState } from 'react';
import { db } from "../utils/firebaseConfig"; 
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation"; //TJ added


export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter(); //TJ added
  const searchParams = useSearchParams();
  const addAccount = searchParams.get("addAccount") === "true";

  const auth = getAuth();

  const changeEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };
  
  const changePasswordInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };
  

  const handleLogin = async () => {
    console.log("trying login with EMAIL:" + email + " | PASSWORD:" + password + "\n");
    //console.log(addAccount + "\n");
    setError("");

    if (!email) {
      setError("Email cannot be blank.");
      return;
    }
    if (!password) {
      setError("Password cannot be blank.");
      return;
    }

    try {
      // Fetch user data from Firestore
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Account with this email not found.");
        return;
      }

      const primaryUser = auth.currentUser;
      await setPersistence(auth, browserSessionPersistence);

      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Successfully logged in!");
      setDoc(doc(db, "UserPasswords", user.uid), {
        password: password,
      });  
      //console.log("User ID (UID):", user.uid);
      //console.log("User Email:", user.email);

      if (addAccount) {
        if (!primaryUser) {
          setError("Primary user session lost. Please log in again.");
          return;
        }

        //console.log("Primary User UID:", primaryUser.uid);

        const primaryUserDocRef = doc(db, "Users", primaryUser.uid);
        const primaryUserDocSnap = await getDoc(primaryUserDocRef);
        const secondaryUserDocRef = doc(db, "Users", user.uid);
        const secondaryUserDocSnap = await getDoc(secondaryUserDocRef);

        if (primaryUserDocSnap.exists()) {
          const newUserRef = doc(db, "Users", user.uid);
          const primaryUserRef = doc(db, "Users", primaryUser.uid);
          const primaryUserData = primaryUserDocSnap.data();
          //console.log("Primary User UID:", primaryUser.uid);
          //console.log("New User UID:", user.uid);

          const updatedAccounts = primaryUserData.otherAccounts || [];
          updatedAccounts.push(newUserRef);
          await updateDoc(primaryUserDocRef, { otherAccounts: updatedAccounts });

          if (secondaryUserDocSnap.exists()) {
            const secondaryUserData = secondaryUserDocSnap.data();
            const updatedSecondaryAccounts = secondaryUserData.otherAccounts || [];

            if (!updatedSecondaryAccounts.some((ref: { id: string; }) => ref.id === primaryUser.uid)) {
              updatedSecondaryAccounts.push(primaryUserRef);
              await updateDoc(secondaryUserDocRef, { otherAccounts: updatedSecondaryAccounts });
            }
          } else {
            console.log("No secondary user document found in Firestore.");
          }

          //console.log("Added new user reference to otherAccounts:", newUserRef);
        } else {
          setError("No user document found in Firestore.");
          return;
        }

        // ✅ Redirect back to settings instead of calendar
        router.push("/settings");
        return;
      }

      // If addAccount is not true, just navigate to the calendar
      router.push("/calendar");
    } catch (error) {
      if (error instanceof Error) {
        console.log(`Error! ${error.message || "Unknown error"}`);
      } else {
        console.log("Error updating password!");
      }
      setError("Invalid email or password.");

    }
};


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
            {addAccount ? "Add an Account" : "Log in"}
          </a>
          <button //TJ replaced link with button
            onClick={() => router.push(`/registration?email=${encodeURIComponent(email)}`)}
            className="rounded-full border border-solid border-black/[.08] dark:border-black/[.70] text-black transition-colors flex items-center justify-center hover:bg-[#222222] hover:text-[#ffffff] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
          >
            Sign up
          </button>
        </div>

        <div className="flex text-[rgb(200,0,0)] gap-4 items-center flex-col sm:flex-row">
          {error}
        </div>
      </main>
      
    </div>
  );
}
