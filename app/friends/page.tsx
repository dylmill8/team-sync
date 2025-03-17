"use client";

import { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, DocumentReference } from "firebase/firestore";
import { auth, db } from "../../utils/firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { viewDocument } from "../../utils/firebaseHelper.js";
import NavBar from "@/components/ui/navigation-bar";

export default function Friends() {
    const [userId, setUserId] = useState("");
    const [friendRefs, setFriendRefs] = useState<DocumentReference[]>([]);
    const [friendData, setFriendData] = useState<{ id: "", email: ""; username: "" }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);

                try {
                    const userData = await viewDocument("Users", user.uid);
                    if (userData?.friends) {
                        const friendRefsFixed = userData.friends.map((friendPath: string) => {
                            if (typeof friendPath === "string") {
                                const friendId = friendPath.split("/").pop(); // Extracts just the UID
                                return doc(db, "Users", friendId); // Converts to Firestore reference
                            }
                            return friendPath;
                        });

                        setFriendRefs(friendRefsFixed);
                    } else {
                        setFriendRefs([]);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                console.error("No user logged in");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (friendRefs.length === 0) {
            console.log("No friend references to fetch.");
            return;
        }

        const fetchFriends = async () => {
            try {
                const db = getFirestore();
                console.log("Fetching friend details for:", friendRefs);

                const friendDetails = await Promise.all(
                    friendRefs.map(async (friendRef) => {
                        if (!friendRef || typeof friendRef === "string") {
                            console.error("friendRef is invalid:", friendRef);
                            return null;
                        }

                        const friendSnap = await getDoc(friendRef);
                        if (friendSnap.exists()) {
                            return { id: friendRef.id, ...friendSnap.data() };
                        } else {
                            console.warn("Friend document not found:", friendRef.id);
                            return null;
                        }
                    })
                );

                setFriendData(friendDetails.filter(Boolean)); // Remove null values
            } catch (error) {
                console.error("Error fetching friend details:", error);
            }
        };

        fetchFriends();
    }, [friendRefs]);

    return (
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
            ) : friendData.length > 0 ? (
                <ul className="justify-center flex flex-col gap-y-2">
                    {friendData.map(friend => (
                        <button className="rounded-full border border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
                        key={friend.id}>
                            {friend.username} ({friend.email})
                        </button>
                    ))}
                </ul>
            ) : (
                <p>You don't have any friends yet - try adding other users from their profile pages!</p>
            )}

            <NavBar />
        </div>
    );
}
