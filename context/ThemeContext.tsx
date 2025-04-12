"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "@firebase/firestore";
import { auth, db } from "@/utils/firebaseConfig";

type ThemeContextType = {
  isLightMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLightMode, setIsLightMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const applyTheme = (isLightTheme: boolean) => {
      document.body.classList.remove("light-mode", "dark-mode");
      document.body.classList.add(isLightTheme ? "light-mode" : "dark-mode");
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        // Fetch the user's theme preference from Firestore
        const userDocRef = doc(db, "Users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const isLightTheme = userData.isLightTheme ?? false;
          setIsLightMode(isLightTheme);
          applyTheme(isLightTheme);
        }
      } else {
        setUserId(null);
        // Default to light mode if no user is logged in
        setIsLightMode(true);
        applyTheme(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = async () => {
    const newIsLightMode = !isLightMode; // Calculate the new state
    setIsLightMode(newIsLightMode);

    // Update the theme on the document body
    document.body.classList.remove(isLightMode ? "light-mode" : "dark-mode");
    document.body.classList.add(newIsLightMode ? "light-mode" : "dark-mode");

    // Save the updated theme preference to Firestore
    if (userId) {
      const userDocRef = doc(db, "Users", userId);
      await setDoc(userDocRef, { isLightTheme: newIsLightMode }, { merge: true }); // Save the correct value
    }
  };

  return (
    <ThemeContext.Provider value={{ isLightMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
