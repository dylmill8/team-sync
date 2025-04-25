"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, User } from "firebase/auth"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  DocumentReference,
} from "firebase/firestore"
import { auth, db } from "@/utils/firebaseConfig"
import { createChat } from "@/utils/chatHelper"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Friend = {
  id: string
  username?: string
}

type Chat = {
  id: string
  participants: string[]
  createdAt: Date | { seconds: number; nanoseconds: number }
  type: "private" | "group"
  name?: string
}

export default function FriendsChatsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [friendsData, setFriendsData] = useState<Friend[]>([])
  const [userChats, setUserChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return router.push("/login")
      setUser(u)
      await loadUserData(u.uid)
      listenToUserChats(u.uid)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  async function loadUserData(userId: string) {
    const userRef = doc(db, "Users", userId)
    const snap = await getDoc(userRef)
    if (!snap.exists()) {
      await setDoc(userRef, { friends: [], chats: [] })
      return setFriendsData([])
    }
    const data = snap.data()
    if (!data.friends?.length) return setFriendsData([])

    const friends = await Promise.all(
      data.friends.map(async (ref: DocumentReference | string) => {
        const fid = typeof ref === "string" ? ref : ref.id
        const fSnap = await getDoc(doc(db, "Users", fid))
        return fSnap.exists()
          ? { id: fid, ...(fSnap.data() as Omit<Friend, "id">) }
          : { id: fid, username: "Unknown" }
      })
    )
    setFriendsData(friends)
  }

  function listenToUserChats(userId: string) {
    const ref = doc(db, "Users", userId)
    return onSnapshot(ref, async (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      const chats: Chat[] = await Promise.all(
        (data.chats || []).map(async (chatId: string) => {
          const cSnap = await getDoc(doc(db, "Chats", chatId))
          return cSnap.exists()
            ? ({ id: chatId, ...(cSnap.data() as Omit<Chat, "id">) })
            : null
        })
      ).then(arr => arr.filter(Boolean) as Chat[])
      setUserChats(chats)
    })
  }

  async function handleFriendChat(friendId: string) {
    if (!user) return
    const ids = [user.uid, friendId].sort()
    const chatId = ids.join("_")
    const chatRef = doc(db, "Chats", chatId)
    const chatSnap = await getDoc(chatRef)

    if (!chatSnap.exists()) {
      await setDoc(chatRef, { participants: ids, createdAt: new Date(), type: "private" })
      await Promise.all(
        ids.map(async (uid) => {
          const uRef = doc(db, "Users", uid)
          const uSnap = await getDoc(uRef)
          if (uSnap.exists()) {
            await updateDoc(uRef, { chats: arrayUnion(chatId) })
          } else {
            await setDoc(uRef, { chats: [chatId] })
          }
        })
      )
    }
    router.push(`/messages/${chatId}`)
  }

  async function handleCreateGroupChat() {
    if (!user || !selectedFriends.length) return
    const participants = [user.uid, ...selectedFriends]
    const chatId = await createChat(participants, {
      type: "group",
      name: groupName || "New Group Chat",
    })
    setGroupName("")
    setSelectedFriends([])
    router.push(`/messages/${chatId}`)
  }

  async function handleLeaveGroup(chatId: string) {
    if (!user) return
    await updateDoc(doc(db, "Users", user.uid), { chats: arrayRemove(chatId) })
  }

  //const privateChats = userChats.filter((c) => c.type === "private")
  const groupChats   = userChats.filter((c) => c.type === "group")

  if (loading) return <div className="p-4">Loading…</div>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-10">
      <Button variant="outline" onClick={() => router.push("/profile")}>
        ← Back to Profile
      </Button>

      {/* ── EXISTING CHATS ── */}
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">My Chats</h1>

        {userChats.length === 0 && <p>You haven’t joined any chats yet.</p>}

        {/*privateChats.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Private Chats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {privateChats.map((chat) => (
                <Card key={chat.id} className="hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Chat: {chat.participants.find((id) => id !== user?.uid)}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-end">
                    <Button size="sm" onClick={() => router.push(`/messages/${chat.id}`)}>
                      Open
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )*/}

        {groupChats.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Group Chats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groupChats.map((chat) => (
                <Card key={chat.id} className="hover:shadow-md">
                  <CardHeader>
                    <CardTitle>{chat.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-between">
                    <Button size="sm" onClick={() => router.push(`/messages/${chat.id}`)}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleLeaveGroup(chat.id)}
                    >
                      Leave
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── START PRIVATE CHAT ── */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Start New Private Chat</h2>
        {friendsData.length === 0 ? (
          <p className="text-gray-500">You have no friends yet.</p>
        ) : (
          <ul className="space-y-2">
            {friendsData.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <span>{f.username}</span>
                <Button size="sm" onClick={() => handleFriendChat(f.id)}>
                  Chat
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── CREATE GROUP CHAT ── */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Create Group Chat</h2>
        <Input
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {friendsData.length === 0 ? (
          <p className="text-gray-500">Add friends before creating a group.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {friendsData.map((f) => (
              <li key={f.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedFriends.includes(f.id)}
                  onChange={() =>
                    setSelectedFriends((prev) =>
                      prev.includes(f.id)
                        ? prev.filter((id) => id !== f.id)
                        : [...prev, f.id]
                    )
                  }
                  className="h-4 w-4"
                />
                <label>{f.username}</label>
              </li>
            ))}
          </ul>
        )}

        <Button
          onClick={handleCreateGroupChat}
          disabled={selectedFriends.length === 0}
        >
          Create Group Chat
        </Button>
      </section>
    </div>
  )
}
