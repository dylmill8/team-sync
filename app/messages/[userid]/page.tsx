"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { auth, onAuthStateChanged, db } from "../../../utils/firebaseConfig.js"
import { setDocument, viewDocument } from "../../../utils/firebaseHelper.js"
import { DocumentReference } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
  startAfter,
  limit,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore"

type Message = {
  id: string
  text: string
  userId: string
  username?: string
  timestamp?: Timestamp
}

type Friend = {
  id: string
  username?: string
}

export default function ChatPage() {
  const router = useRouter()
  const { userid } = useParams() as { userid: string }

  const [chatId, setChatId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [chatTitle, setChatTitle] = useState<string>("Loading chat...")
  const [groupName, setGroupName] = useState<string>("")
  const [friendsData, setFriendsData] = useState<Friend[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingMore, setLoadingMore] = useState(false)
  const [isGroupChat, setIsGroupChat] = useState(false)
  const batchSize = 10
  const userCache = useRef<Record<string, string>>({})

  useEffect(() => {
    if (typeof userid === "string") {
      setChatId(userid)
    }
  }, [userid])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid)
      } else {
        router.push("/")
        setCurrentUserId(null)
      }
    })
    return () => unsubscribe()
  }, )

  useEffect(() => {
    const loadChatInfo = async () => {
      if (!chatId || !currentUserId) return
      const chatRef = doc(db, "Chats", chatId)
      const chatSnap = await getDoc(chatRef)
      if (chatSnap.exists()) {
        const chatData = chatSnap.data()
        if (chatData.type === "private") {
          const friendId = chatData.participants.find((id: string) => id !== currentUserId)
          try {
            const friendData = await viewDocument("Users", friendId)
            const friendName = friendData?.username || friendId
            setChatTitle(friendName)
          } catch (e) {
            console.log(e)
            setChatTitle("Private Chat")
          }
        } else {
          setIsGroupChat(true)
          setGroupName(chatData.name || "Group Chat")
          setChatTitle(chatData.name || `Group Chat (${chatData.participants?.length || 0})`)
        }
      } else {
        setChatTitle("Chat Not Found")
      }
    }

    const loadFriends = async () => {
      if (!currentUserId) return
      try {
        const userDoc = await getDoc(doc(db, "Users", currentUserId))
        const userData = userDoc.data()
        if (!userData?.friends) return
        const friendPromises = userData.friends.map(
          async (ref: DocumentReference | string) => {
            const fid = typeof ref === "string" ? ref : ref.id
            const snap = await getDoc(doc(db, "Users", fid))
            return snap.exists() ? { id: fid, ...snap.data() } : { id: fid, username: "Unknown" }
          }
        )
        const resolved = await Promise.all(friendPromises)
        setFriendsData(resolved)
      } catch (err) {
        console.error("Error loading friends:", err)
      }
    }

    loadChatInfo()
    loadFriends()
  }, [chatId, currentUserId])

  useEffect(() => {
    if (!chatId) return

    const initMessages = async () => {
      const messagesRef = collection(db, "Chats", chatId, "messages")
      const initialQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(batchSize))
      const snapshot = await getDocs(initialQuery)

      if (snapshot.empty) {
        await setDocument(`Chats/${chatId}/messages`, "_placeholder", {
          text: "",
          userId: "system",
          timestamp: new Date(0),
        })
        setMessages([])
        return
      }

      const msgs: Message[] = snapshot.docs
        .filter((doc) => doc.id !== "_placeholder")
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, "id">),
        }))
        .reverse()

      await populateUsernames(msgs)
      setMessages(msgs)

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1])
      }
    }

    initMessages().catch((err) => console.error("Error loading messages:", err))
  }, [chatId])

  useEffect(() => {
    if (!chatId) return

    const messagesRef = collection(db, "Chats", chatId, "messages")
    const unsubscribe = onSnapshot(
      query(messagesRef, orderBy("timestamp", "asc")),
      async (snapshot) => {
        const newMsgs: Message[] = snapshot.docs
          .filter((doc) => doc.id !== "_placeholder")
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Message, "id">),
          }))
        if (newMsgs.length > 0) {
          await populateUsernames(newMsgs)
          setMessages(newMsgs)
        }
      }
    )

    return () => unsubscribe()
  }, [chatId])

  const loadMoreMessages = async () => {
    if (!chatId || !lastVisible) return
    setLoadingMore(true)
    const olderQuery = query(
      collection(db, "Chats", chatId, "messages"),
      orderBy("timestamp", "desc"),
      startAfter(lastVisible),
      limit(batchSize)
    )
    try {
      const snapshot = await getDocs(olderQuery)
      const olderMsgs: Message[] = snapshot.docs
        .filter((doc) => doc.id !== "_placeholder")
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, "id">),
        }))
        .reverse()
      await populateUsernames(olderMsgs)
      setMessages((prev) => {
        // Combine old + new
        const combined = [...olderMsgs, ...prev]
        
        // Filter out duplicates by id
        const unique = combined.filter(
          (message, index, self) =>
            index === self.findIndex((m) => m.id === message.id)
        )
      
        return unique
      })
      
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1])
      }
    } catch (error) {
      console.error("Error loading older messages:", error)
    }
    setLoadingMore(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !chatId) return
    const newMsgId = `${Date.now()}_${userid}`
    const newMsgData = {
      text: newMessage,
      userId: currentUserId,
      timestamp: new Date(),
    }
    try {
      await setDocument(`Chats/${chatId}/messages`, newMsgId, newMsgData)
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  const populateUsernames = async (msgs: Message[]) => {
    const promises = msgs.map(async (msg: Message) => {
      const uid = msg.userId
      if (userCache.current[uid]) {
        msg.username = userCache.current[uid]
      } else {
        try {
          const userData = await viewDocument("Users", uid)
          const username = userData?.username || uid
          userCache.current[uid] = username
          msg.username = username
        } catch (e) {
          console.log(e)
          msg.username = uid
        }
      }
    })
    await Promise.all(promises)
  }

  const handleChangeGroupName = async () => {
    if (!chatId || !groupName) return
    try {
      await updateDoc(doc(db, "Chats", chatId), { name: groupName })
      setChatTitle(groupName)
    } catch (err) {
      console.error("Failed to update group name:", err)
    }
  }

  const handleAddFriendToGroup = async (friendId: string) => {
    if (!chatId || !friendId) return
    try {
      const chatRef = doc(db, "Chats", chatId)
      await updateDoc(chatRef, { participants: arrayUnion(friendId) })
      await updateDoc(doc(db, "Users", friendId), { chats: arrayUnion(chatId) })
      alert("Friend added to group!")
    } catch (err) {
      console.error("Error adding friend:", err)
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <Button
        className="mb-4"
        variant="outline"
        onClick={() => router.push("/messages")}
      >
        ← Back to Messages
      </Button>

      <h1 className="text-xl font-bold mb-4">{chatTitle}</h1>

      {isGroupChat && (
        <div className="mb-4 space-y-4">
          <div className="flex space-x-2">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group Name"
            />
            <Button onClick={handleChangeGroupName}>Update Name</Button>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Add Friends</h2>
            {friendsData
              .filter((f) => !messages.some((m: Message) => m.userId === f.id))
              .map((friend: Friend) => (
                <div key={friend.id} className="flex justify-between mb-1">
                  <span>{friend.username || friend.id}</span>
                  <Button size="sm" onClick={() => handleAddFriendToGroup(friend.id)}>
                    Add to Group
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      <Button onClick={loadMoreMessages} disabled={loadingMore}>
        {loadingMore ? "Loading..." : "Load Previous Messages"}
      </Button>

      <div className="space-y-2 mb-4 mt-4">
        {messages.map((msg: Message) => (
          <div key={msg.id} className="border rounded p-2 shadow-sm bg-white">
            <div className="text-sm text-gray-500">
              {msg.username} •{" "}
              {msg.timestamp?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>{msg.text}</div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  )
}
