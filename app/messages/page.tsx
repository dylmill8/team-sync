"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { auth, db } from "@/utils/firebaseConfig"
import { createChat } from "@/utils/chatHelper"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function FriendsChatsPage() {
  const [user, setUser] = useState(null)
  const [friendsData, setFriendsData] = useState([])
  const [userChats, setUserChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFriends, setSelectedFriends] = useState([])
  const [groupName, setGroupName] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)
      await loadUserData(currentUser.uid)
      listenToUserChats(currentUser.uid)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadUserData = async (userId) => {
    const userDocRef = doc(db, "Users", userId)
    const userSnap = await getDoc(userDocRef)

    if (!userSnap.exists()) {
      await setDoc(userDocRef, { friends: [], chats: [] })
      setFriendsData([])
      return
    }

    const userData = userSnap.data()
    if (!userData.friends || userData.friends.length === 0) {
      setFriendsData([])
      return
    }

    const friendPromises = userData.friends.map(async (ref) => {
      const friendId = ref.id || ref
      const friendDocRef = doc(db, "Users", friendId)
      const friendSnap = await getDoc(friendDocRef)
      if (friendSnap.exists()) {
        return { id: friendId, ...friendSnap.data() }
      }
      return { id: friendId, username: "Unknown" }
    })

    const resolvedFriends = await Promise.all(friendPromises)
    setFriendsData(resolvedFriends)
  }

  const listenToUserChats = (userId) => {
    const userDocRef = doc(db, "Users", userId)
    return onSnapshot(userDocRef, async (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      const chatIds = data.chats || []

      const chatPromises = chatIds.map(async (chatId) => {
        const chatSnap = await getDoc(doc(db, "Chats", chatId))
        return chatSnap.exists() ? { id: chatId, ...chatSnap.data() } : null
      })

      const resolvedChats = (await Promise.all(chatPromises)).filter(Boolean)
      setUserChats(resolvedChats)
    })
  }

  const handleFriendChat = async (friendId) => {
    if (!user) return

    const sortedIds = [user.uid, friendId].sort()
    const chatId = sortedIds.join("_")
    const chatRef = doc(db, "Chats", chatId)

    const chatSnap = await getDoc(chatRef)
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        participants: sortedIds,
        createdAt: new Date(),
        type: "private",
      })

      await Promise.all(
        sortedIds.map(async (uid) => {
          const userDocRef = doc(db, "Users", uid)
          const userSnap = await getDoc(userDocRef)
          if (userSnap.exists()) {
            await updateDoc(userDocRef, {
              chats: arrayUnion(chatId),
            })
          } else {
            await setDoc(userDocRef, { chats: [chatId] })
          }
        })
      )
    }

    router.push(`/messages/${chatId}`)
  }

  const handleCreateGroupChat = async () => {
    if (!user || selectedFriends.length === 0) return
    const participants = [user.uid, ...selectedFriends]
    const chatId = await createChat(participants, {
      type: "group",
      name: groupName || "New Group Chat",
    })
    setSelectedFriends([])
    setGroupName("")
    router.push(`/messages/${chatId}`)
  }

  const handleRemoveGroupChat = async (chatId) => {
    if (!user) return
    const userDocRef = doc(db, "Users", user.uid)
    await updateDoc(userDocRef, {
      chats: arrayRemove(chatId),
    })
  }

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    )
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">My Chats</h1>

      {userChats.length === 0 ? (
        <p>No chats yet.</p>
      ) : (
        <ul className="space-y-4 mb-6">
          {userChats.map((chat) => (
            <li key={chat.id} className="flex items-center justify-between">
              <button
                onClick={() => router.push(`/messages/${chat.id}`)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {chat.type === "private"
                  ? "Private Chat"
                  : chat.name || `Group Chat (${chat.participants.length})`}
              </button>
              {chat.type === "group" && (
                <button
                  onClick={() => handleRemoveGroupChat(chat.id)}
                  className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Leave
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-lg font-semibold mb-2">Start New Private Chat</h2>
      {friendsData.length === 0 ? (
        <p>You have no friends yet.</p>
      ) : (
        <ul className="space-y-3 mb-6">
          {friendsData.map((friend) => (
            <li key={friend.id} className="flex items-center space-x-2">
              <span>{friend.username || friend.id}</span>
              <Button
                onClick={() => handleFriendChat(friend.id)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Private Chat
              </Button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-lg font-semibold mb-2">Create Group Chat</h2>
      <Input
        className="mb-2"
        placeholder="Group Name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />
      <ul className="space-y-2 mb-3">
        {friendsData.map((friend) => (
          <li key={friend.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedFriends.includes(friend.id)}
              onChange={() => toggleFriendSelection(friend.id)}
              className="w-4 h-4"
            />

            <span>{friend.username || friend.id}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={handleCreateGroupChat}
        disabled={selectedFriends.length === 0}
        className="bg-purple-600 text-white hover:bg-purple-700"
      >
        Create Group Chat
      </Button>
    </div>
  )
}
