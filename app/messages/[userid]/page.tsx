// messagetest1@test.com ; testtest - gFt8q2HV77MxPxS2N8p1vMnjDRI2
// messagetest@test.com ; testtest  - rLjfeAiRYxTKLvYut1V4rU8Kvkg1

"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { auth, onAuthStateChanged, db } from "../../../utils/firebaseConfig.js"
import { setDocument, viewDocument } from "../../../utils/firebaseHelper.js"
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
} from "firebase/firestore"

export default function ChatPage() {
  const router = useRouter()
  const { userid } = useParams()

  const [chatId, setChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUserId, setCurrentUserId] = useState(null)
  const [lastVisible, setLastVisible] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const batchSize = 10
  const userCache = useRef({}) // Caches userId -> username

  useEffect(() => {
    if (userid) setChatId(userid)
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
  }, [])

  useEffect(() => {
    if (!chatId) return
    const initialQuery = query(
      collection(db, "Chats", chatId, "messages"),
      orderBy("timestamp", "desc"),
      limit(batchSize)
    )
    getDocs(initialQuery)
      .then(async (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse()
        await populateUsernames(msgs)
        setMessages(msgs)
        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1])
        }
      })
      .catch((err) => console.error("Error loading messages: ", err))
  }, [chatId])

  useEffect(() => {
    if (!chatId || messages.length === 0) return
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage) return

    const newMsgQuery = query(
      collection(db, "Chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
      startAfter(latestMessage.timestamp)
    )
    const unsubscribe = onSnapshot(newMsgQuery, async (snapshot) => {
      const newMsgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      if (newMsgs.length > 0) {
        await populateUsernames(newMsgs)
        setMessages((prev) => [...prev, ...newMsgs])
      }
    })
    return () => unsubscribe()
  }, [chatId, messages])

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
      const olderMsgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse()
      await populateUsernames(olderMsgs)
      setMessages((prev) => [...olderMsgs, ...prev])
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

    const newMsgId = `${Date.now()}`
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

  const populateUsernames = async (msgs) => {
    const promises = msgs.map(async (msg) => {
      const uid = msg.userId
      if (userCache.current[uid]) {
        msg.username = userCache.current[uid]
      } else {
        try {
          const userData = await viewDocument("Users", uid)
          const username = userData?.username || uid
          userCache.current[uid] = username
          msg.username = username
        } catch (err) {
          console.warn(`Failed to fetch user for ID ${uid}`, err)
          msg.username = uid
        }
      }
    })
    await Promise.all(promises)
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Chat: {chatId}</h1>
      <Button onClick={loadMoreMessages} disabled={loadingMore}>
        {loadingMore ? "Loading..." : "Load Previous Messages"}
      </Button>
      <div className="space-y-2 mb-4 mt-4">
        {messages.map((msg) => (
          <div key={msg.id} className="border rounded p-2 shadow-sm bg-white">
            <div className="text-sm text-gray-500">
              {msg.username} • {msg.timestamp?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
