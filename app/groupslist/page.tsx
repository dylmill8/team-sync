"use client";

import "./groupslist.css";

import NavBar from "@/components/ui/navigation-bar";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from '@/utils/firebaseConfig';
import { doc, getDoc } from "firebase/firestore";
import { useEffect } from "react";

export default function Groups() {
    const auth = getAuth(firebaseApp);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            const uid = user.uid;
    
            if (uid) {
              const userDocRef = doc(db, "Users", uid);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                
                //! TODO: Get user's groups & display in a clickable list

              }
            }
          }
        });
        return () => {
          unsubscribe();
        };
      }, [auth]);

    return (
        <>
            <div>
                <h1>LIST OF GROUPS (COMING SOON...)</h1>
                <button
                    onClick={() => {
                        router.push(
                      `/groups?docId=EXAMPLE GROUP (DO NOT DELETE)` //${info.event.extendedProps.docID}`
                    )}}
                >
                    EXAMPLE GROUP
                </button>
            </div>
            <NavBar/>
        </>
    );
}