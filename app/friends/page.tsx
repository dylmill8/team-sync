"use client";

import { useState, useEffect } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../utils/firebaseConfig.js";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { viewDocument } from "../../utils/firebaseHelper.js";
import NavBar from "@/components/ui/navigation-bar";

export default function Friends() {
    const [userId, setUserId] = useState("");
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [friendData, setFriendData] = useState({ email: "", username: "" });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("User is logged in:", user.uid);
                setUserId(user.uid);

            if (!user.uid) { // debugging
                console.error("User UID is undefined!");
                return;
            }

                try {
                    console.log("auth.currentUser:", auth.currentUser);
                    const userData = await viewDocument("Users", user.uid);
                    setFriendIds(userData?.friends || []);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                console.error("No user logged in2");
            }
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, []);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const user = auth.currentUser; // ✅ Get logged-in user
                if (!user) {
                    console.error("No user logged in2");
                    setLoading(false);
                    return;
                }

                const uid = user.uid;
                setUserId(uid);
                const userData = viewDocument("Users", userId);
                if (!userData) {
                    console.error("No user logged in3");
                    return;
                }

                const db = getFirestore();
                const userDocRef = doc(db, "Users", userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setFriendIds(userData.friends || []);
                } else {
                    console.error("User document not found");
                }
            } catch (error) {
                console.error("Error fetching friends:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();
    }, []);

    return(
        <div style={{
            maxWidth: "600px",
            margin: "40px auto",
            padding: "40px",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
          }}>
            <h1 style={{ fontSize: "24px", marginBottom: "15px" }}>Friends</h1>  

            {loading ? (
                <p>Loading...</p>
            ) : friendIds.length > 0 ? (
                <ul>
                    {friendIds.map((id) => (
                        <li key={id}>{id}</li>
                    ))}
                </ul>
            ) : (
                <p>You don't have any friends yet - try adding other users from their profile pages!</p>
            )}

            <NavBar />
        </div>
    );
}