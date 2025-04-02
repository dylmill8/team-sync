"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/utils/firebaseConfig";
import { createChat } from "@/utils/chatHelper";
import { useRouter } from "next/navigation";

export default function FriendsChatsPage() {
  const [user, setUser] = useState(null);
  const [friendsData, setFriendsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
      await loadUserData(currentUser.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const loadUserData = async (userId) => {
    const userDocRef = doc(db, "Users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      // If the user doc doesn't exist, create it with an empty friends array
      await setDoc(userDocRef, { friends: [] });
      setFriendsData([]);
      return;
    }

    const userData = userSnap.data();

    if (!userData.friends || userData.friends.length === 0) {
      // No friends
      setFriendsData([]);
      return;
    }

    // For each friend reference string, fetch the friend’s doc
    const friendPromises = userData.friends.map(async (ref) => {
      // e.g. "/Users/someFriendId"
      const friendId = ref.id;

      const friendDocRef = doc(db, "Users", friendId);
      const friendSnap = await getDoc(friendDocRef);
      if (friendSnap.exists()) {
        return { id: friendId, ...friendSnap.data() };
      }
      // If the friend doc doesn't exist or something went wrong, return a fallback
      return { id: friendId, username: "Unknown" };
    });

    const resolvedFriends = await Promise.all(friendPromises);
    setFriendsData(resolvedFriends);
  };

  const handleFriendChat = async (friendId) => {
    if (!user) return;
    try {
      // Create a new chat with just the current user and the friend
      const chatId = await createChat([user.uid, friendId]);
      router.push(`/messages/${chatId}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">My Friends</h1>
      {friendsData.length === 0 ? (
        <p>You have no friends yet.</p>
      ) : (
        <ul className="space-y-2">
          {friendsData.map((friend) => (
            <li key={friend.id}>
              <button
                onClick={() => handleFriendChat(friend.id)}
                className="text-blue-600 underline"
              >
                Chat with {friend.username || friend.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
