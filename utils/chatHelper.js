import { db } from "./firebaseConfig";
import {
  doc,
  collection,
  setDoc,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";

export async function createChat(participants = [], additionalData = {}) {
  try {
    const chatRef = doc(collection(db, "Chats"));
    const chatData = {
      participants,
      createdAt: serverTimestamp(),
      ...additionalData,
    };
    await setDoc(chatRef, chatData);
    await Promise.all(
      participants.map(async (userId) => {
        const userDocRef = doc(db, "Users", userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          await updateDoc(userDocRef, {
            chats: arrayUnion(chatRef.id),
          });
        } else {
          await setDoc(userDocRef, { chats: [chatRef.id] });
        }
      })
    );
    return chatRef.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
}

export async function addUserToChat(chatId, userId) {
  try {
    const chatRef = doc(db, "Chats", chatId);
    await updateDoc(chatRef, {
      participants: arrayUnion(userId),
    });
    const userDocRef = doc(db, "Users", userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      await updateDoc(userDocRef, {
        chats: arrayUnion(chatId),
      });
    } else {
      await setDoc(userDocRef, { chats: [chatId] });
    }
  } catch (error) {
    console.error("Error adding user to chat:", error);
    throw error;
  }
}

export async function removeUserFromChat(chatId, userId) {
  try {
    const chatRef = doc(db, "Chats", chatId);
    await updateDoc(chatRef, {
      participants: arrayRemove(userId),
    });
    const userDocRef = doc(db, "Users", userId);
    await updateDoc(userDocRef, {
      chats: arrayRemove(chatId),
    });
  } catch (error) {
    console.error("Error removing user from chat:", error);
    throw error;
  }
}
