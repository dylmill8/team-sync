"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../utils/firebaseConfig.js";

// This page redirects to the user's profile page if no ID is given in the profile page URL.

export default function ProfileIndex() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push(`/profile/${user.uid}`);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1>Loading...</h1>
    </div>
  );
}
