"use client";

import { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, DocumentReference, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../utils/firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { viewDocument } from "../../utils/firebaseHelper.js";
import NavBar from "@/components/ui/navigation-bar";

export default function Friends() {
    const [userId, setUserId] = useState("");
    const [friendRefs, setFriendRefs] = useState<DocumentReference[]>([]);
    const [friendData, setFriendData] = useState<{ id: "", email: ""; username: "" }[]>([]);
    const [incomingFriendRequests, setIncomingFriendRequests] = useState<DocumentReference[]>([]);
    const [incomingFriendRequestsData, setIncomingFriendRequestsData] = useState<{ id: ""; email: ""; username: "" }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFriendRequests, setShowFriendRequests] = useState(false);

    const handleFriendRequest = async (friendRef: DocumentReference, isAccepted: boolean) => {
        if (!userId) return;
    
        try {
            const userDocRef = doc(db, "Users", userId);
    
            setIncomingFriendRequestsData((prev) => prev.filter(friend => friend.id !== friendRef.id));
    
            await updateDoc(userDocRef, {
                incomingFriendRequests: arrayRemove(friendRef)
            });

            if (isAccepted) {
                await updateDoc(userDocRef, {
                    friends: arrayUnion(friendRef)
                });
    
                setFriendRefs(prev => [...prev, friendRef]);
            }
    
            console.log(`Friend request ${isAccepted ? "accepted" : "denied"} for`, friendRef.id);
        } catch (error) {
            console.error("Error updating friend request:", error);
        }
    };

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

                    if (userData?.incomingFriendRequests) {
                        const requestRefsFixed = userData.incomingFriendRequests.map((requestPath: string) =>
                            typeof requestPath === "string" ? doc(db, "Users", requestPath.split("/").pop()) : requestPath
                        );
                        setIncomingFriendRequests(requestRefsFixed);
                    } else {
                        setIncomingFriendRequests([]);
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

    useEffect(() => {
        if (incomingFriendRequests.length === 0) {
            console.log("No incoming friend requests.");
            return;
        }
    
        const fetchIncomingRequests = async () => {
            try {
                console.log("Fetching incoming friend request details for:", incomingFriendRequests);
    
                const requestDetails = await Promise.all(
                    incomingFriendRequests.map(async (requestRef) => {
                        if (!requestRef || typeof requestRef === "string") {
                            console.error("requestRef is invalid:", requestRef);
                            return null;
                        }
    
                        const requestSnap = await getDoc(requestRef);
                        if (requestSnap.exists()) {
                            return { id: requestRef.id, ...requestSnap.data() };
                        } else {
                            console.warn("Friend request document not found:", requestRef.id);
                            return null;
                        }
                    })
                );
    
                setIncomingFriendRequestsData(requestDetails.filter(Boolean)); // Remove null values
            } catch (error) {
                console.error("Error fetching incoming friend requests:", error);
            }
        };
    
        fetchIncomingRequests();
    }, [incomingFriendRequests]);

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

            <div className="justify-center flex flex-col gap-y-2">
                <div className="justify-center flex flex-col p-4 border border-gray-300 rounded-lg shadow-md flex flex-col items-center">
                    <button
                        type="submit"
                        onClick={() => setShowFriendRequests(!showFriendRequests)}
                        className="border rounded-full border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 bg-blue-300"
                    >
                        {showFriendRequests ? "Hide Incoming Friend Requests ▲" : "Show Incoming Friend Requests ▼"}
                    </button>
                    <div>
                        {showFriendRequests ? (
                            <>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : incomingFriendRequestsData.length > 0 ? (
                                    <ul className="flex flex-col gap-y-4 mt-4">
                                        {incomingFriendRequestsData.map(friend => (
                                            <div key={friend.id} className="flex flex-row items-center justify-between gap-x-6 w-full">
                                                <button className="rounded-full border border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 sm:min-w-30"
                                                key={friend.id}>
                                                    {friend.username} ({friend.email})
                                                </button>
                                                <div className="flex gap-x-2">
                                                    {/* Button: Accept friend req */}
                                                    <button className="rounded-full border border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-8 w-8"
                                                    onClick={() => handleFriendRequest(doc(db, "Users", friend.id), true)}
                                                    >
                                                        ✅
                                                    </button>
                                                    {/* Button: Deny friend req */}
                                                    <button className="rounded-full border border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-8 w-8"
                                                    onClick={() => handleFriendRequest(doc(db, "Users", friend.id), false)}
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </ul>

                                ) : (
                                    <p>You don't have any incoming friend requests.</p>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="justify-center flex flex-col p-4 border border-gray-300 rounded-lg shadow-md flex flex-col items-center gap-y-5">
                    <ul className="underline">My Friends</ul>
                    {loading ? (
                        <p>Loading...</p>
                    ) : friendData.length > 0 ? (
                        <ul className="justify-center flex flex-col gap-y-2">
                            {friendData.map(friend => (
                                <button className="rounded-full border border-solid transition-colors flex items-center justify-center text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 sm:min-w-44"
                                key={friend.id}>
                                    {friend.username} ({friend.email})
                                </button>
                            ))}
                        </ul>
                    ) : (
                        <p>You don't have any friends yet - try adding other users from their profile pages!</p>
                    )}
                </div>
            </div>

            <NavBar />
        </div>
    );
}
