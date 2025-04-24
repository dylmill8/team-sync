"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { auth, onAuthStateChanged, db } from "../../../utils/firebaseConfig.js"
import { setDocument, viewDocument } from "../../../utils/firebaseHelper.js"
import { DocumentReference } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Cog } from "lucide-react"
import {  EyeOff } from "lucide-react"
import NextImage from "next/image"
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
  isImage?: boolean
  spoiler?: boolean
}

type Friend = {
  id: string
  username?: string
}

export default function ChatPage() {
  const router = useRouter()
  const { userid } = useParams() as { userid: string }
  
  const [markAsSpoiler, setMarkAsSpoiler] = useState(false)

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
 // const [imageDimsMap, setImageDimsMap] = useState<Record<string, { width: number; height: number }>>({})
  const batchSize = 10
  const userCache = useRef<Record<string, string>>({})
  const endOfMessagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof userid === "string") {
      setChatId(userid)
    }
  }, [userid])


  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])


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
            console.error(e)
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

  const sendMessage = async (
    content: string = newMessage,
    isImage = false,
    spoiler = false
  ) => {
    if (!content.trim() || !currentUserId || !chatId) return;
    const newMsgId = `${Date.now()}_${currentUserId}`;
    const newMsgData = {
      text: content,
      userId: currentUserId,
      timestamp: new Date(),
      isImage,
      spoiler,
    };
    try {
      await setDocument(`Chats/${chatId}/messages`, newMsgId, newMsgData);
      if (!isImage) setNewMessage("");
    } catch (error) {
      console.log("Failed to send message:", error);
    }
  };
  
  

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
          console.error(e)
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const res = await fetch("/api/blob/upload", {
        method: "POST",
        headers: {
          "content-type": file.type,
        },
        body: await file.arrayBuffer(),
      })

      const data = await res.json()
      const imageUrl = data.url

      await sendMessage(imageUrl, true, fileInputRef.current?.dataset.spoiler === "true");
    } catch (err) {
      console.error("Image upload failed:", err)
    }
  }


  return (
    <div className="flex flex-col h-screen">
      {/* ───────────── HEADER ───────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <Button variant="ghost" onClick={() => router.push("/messages")}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">{chatTitle}</h1>
        {/* …group settings trigger here… */}
        {isGroupChat && (
          <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Cog />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Group Settings</SheetTitle>
            </SheetHeader>
             {/* Rename Group */}
    <div className="flex space-x-2 mb-4">
      <Input
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group name…"
      />
      <Button size="sm" onClick={handleChangeGroupName}>
        Save
      </Button>
    </div>

    <hr className="my-4 border-t border-gray-200 dark:border-gray-700" />

    {/* Add Friends */}
    <h4 className="text-sm font-medium mb-2">Add Friends</h4>
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {friendsData.map((f) => (
        <Button
          key={f.id}
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => handleAddFriendToGroup(f.id)}
        >
          {f.username}
        </Button>
      ))}
    </div>
          </SheetContent>
        </Sheet>
        )}
      </header>

      
  
      {/* ───────────── MESSAGES ───────────── */}
      <main className="flex-1 flex flex-col overflow-y-auto px-4 py-2 space-y-4">
        <div className="text-center">
          <Button
            variant="link"
            size="sm"
            onClick={loadMoreMessages}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load earlier messages"}
          </Button>
        </div>
  
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-md w-full p-2 rounded-lg shadow-sm ${
              msg.userId === currentUserId
                ? "bg-blue-50 self-end"
                : "bg-white self-start"
            }`}
          >
            <div className="text-xs text-gray-400 mb-1">
              {msg.username} ·{" "}
              {msg.timestamp?.toDate().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
  
            {msg.isImage ? (
              msg.spoiler ? (
                <div
                  className="relative group w-full"
                  onClick={(e) => {
                    const img = e.currentTarget.querySelector("img")
                    img?.classList.remove("blur")
                    e.currentTarget.querySelector(".overlay")?.remove()
                  }}
                >
                  <NextImage
                    src={msg.text}
                    alt="Spoiler"
                    width={300}
                    height={200}
                    className="blur rounded-lg object-contain w-full max-h-80 transition"
                  />
                  <div className="overlay absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white text-sm rounded-lg">
                    Click to reveal
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <NextImage
                    src={msg.text}
                    alt="Image"
                    width={300}
                    height={200}
                    className="rounded-lg object-contain w-full max-h-80"
                  />
                </div>
              )
            ) : (
              <p>{msg.text}</p>
            )}
          </div>
        ))}

<div ref={endOfMessagesRef} />

      </main>
  
      {/* ───────────── FOOTER ───────────── */}
      <footer className="flex items-center gap-2 px-4 py-3 border-t">
        <Button
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Image
        </Button>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={markAsSpoiler}
            onChange={(e) => setMarkAsSpoiler(e.target.checked)}
          />
          <EyeOff size={14} />
        </label>
  
        <Input
          className="flex-1"
          placeholder="Type your message…"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
  
        <Button onClick={() => sendMessage()}>Send</Button>
  
        <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          data-spoiler={markAsSpoiler ? "true" : "false"}
          onChange={handleFileUpload}
        />
      </footer>
    </div>
  )
  
}
