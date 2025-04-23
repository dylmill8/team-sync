"use client";

import "./groups.css";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserAnnouncementCard from "@/components/ui/user-announcement-card";

import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/ui/navigation-bar";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from "@/utils/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  DocumentReference,
  getDoc,
  query,
  collection,
  orderBy,
  startAfter,
  limit,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  onSnapshot,
  Timestamp,
  deleteDoc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { useState, useEffect, useRef, Suspense, Fragment } from "react";
import { setDocument, viewDocument } from "../../utils/firebaseHelper.js";
import NextImage from "next/image";

interface EventData {
  name: string;
  allDay: boolean;
  start: { seconds: number };
  end: { seconds: number };
  description: string;
  location: string;
  docID: string;
  ownerType: string;
  owner: string;
  RSVP: { [key: string]: string };
  workouts: string;
  tags: string[];
}

interface CalendarEvent {
  title: string;
  start: number | undefined;
  end: number | undefined;
  allDay: boolean;
  description: string;
  location: string;
  docID: string;
  ownerType: string;
  owner: string;
  RSVPStatus: string;
  workout: string;
  tags: string[];
}

interface GroupData {
  name: string;
  description: string;
  picture: string;
  privacy: boolean;
  members: { [key: string]: string };
  events: Array<{ id: string }>;
  chat: DocumentReference;
  announcements: DocumentReference[]; // changed from DocumentReference to an array
}

interface AnnouncementData {
  title: string;
  groupRef: DocumentReference;
  body: string;
  createdAt: Timestamp;
  imageUrl: string;
  imageDims: [];
  fileUrls: string[];
  filenames: string[];
}

type Message = {
  id: string;
  text: string;
  userId: string;
  username?: string;
  timestamp?: Timestamp;
  isImage?: boolean;
};

const GroupsPage = () => {
  const auth = getAuth(firebaseApp);
  const uid = auth.currentUser?.uid;
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams?.get("docId") ?? "";
  const calendarRef = useRef<FullCalendar>(null);
  const userCache = useRef<Record<string, string>>({});
  const batchSize = 10;

  const chatRef = useRef<HTMLDivElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef<boolean>(false);

  const [eventList, setEventList] = useState<CalendarEvent[]>([]);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [groupMembers, setGroupMembers] = useState<Array<Array<string>>>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sortedAnnouncements, setSortedAnnouncements] = useState<
    (AnnouncementData & { id: string })[]
  >([]);
  const [createAnnouncement, setCreateAnnouncement] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<Record<string, { width: number; height: number }>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>("");
  const [suppressEditAfterDelete, setSuppressEditAfterDelete] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"announcements"|"chat"|"calendar">("chat");
  const [memberPics, setMemberPics] = useState<Record<string, string>>({});

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!docId) return;
    const annRef = doc(db, "Announcements", announcementId);
    await deleteDoc(annRef);
    const grpRef = doc(db, "Groups", docId);
    await updateDoc(grpRef, { announcements: arrayRemove(annRef) });
    // remove from UI list
    setSortedAnnouncements((prev) =>
      prev.filter((a) => a.id !== announcementId)
    );
  };

  const startEditingMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.text);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  const saveEditedMessage = async () => {
    if (!chatId || !editingMessageId) return;
    const msgRef = doc(db, "Chats", chatId, "messages", editingMessageId);
    await updateDoc(msgRef, { text: editingMessageText });
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingMessageId ? { ...m, text: editingMessageText } : m
      )
    );
    cancelEditing();
  };

  useEffect(() => {
    const updateChatPosition = () => {
      if (!chatRef.current || !tabsListRef.current) return;
      const chatEl = chatRef.current;
      const tabsRect = tabsListRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const chatHeight = chatEl.offsetHeight;
      const baseBottom = 0.12 * viewportHeight;
      const chatTop = viewportHeight - baseBottom - chatHeight;
      if (chatTop < tabsRect.bottom) {
        const newBottom = viewportHeight - chatHeight - tabsRect.bottom;
        chatEl.style.bottom = newBottom + "px";
      } else {
        chatEl.style.bottom = baseBottom + "px";
      }
    };
    window.addEventListener("resize", updateChatPosition);
    window.addEventListener("scroll", updateChatPosition);
    updateChatPosition();
    return () => {
      window.removeEventListener("resize", updateChatPosition);
      window.removeEventListener("scroll", updateChatPosition);
    };
  }, []);

  useEffect(() => {
    async function fetchGroup() {
      if (!docId) {
        router.push("/groupslist"); // Redirect to groups list page
        return;
      }
      if (typeof docId === "string") {
        setChatId("group" + docId);
      }
      const groupRef = doc(db, "Groups", docId);
      const groupDoc = await getDoc(groupRef);
      if (!groupDoc.exists()) {
        router.push("/groupslist"); // Redirect to groups list page
        return;
      }
      const raw = groupDoc.data() as { groupPic?: string } & Omit<GroupData, "picture">;
      const { groupPic, ...rest } = raw;
      setGroupData({ picture: groupPic || "", ...rest } as GroupData);
    }
    fetchGroup();
  }, [docId, uid, router]);

  //! TODO: maybe remove
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (uid) {
          const userDocRef = doc(db, "Users", uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            //const userData = userDoc.data();
          }
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [auth, groupData, uid]);

  useEffect(() => {
    if (groupData?.members) {
      const entries = Object.entries(groupData.members);
      const sortedMembers = entries
        .sort(([, a], [, b]) => {
          const roleOrder = (role: string) => {
            if (role === "owner") return 0;
            if (role === "leader") return 1;
            return 2;
          };
          return roleOrder(a[1]) - roleOrder(b[1]);
        })
        .map(([key, value]) => {
          const name = value[0];
          const role = value[1];
          return [name, role, key];
        });
      setGroupMembers(sortedMembers);
    }
  }, [groupData?.members]);

  useEffect(() => {
    if (!chatId) return;

    const initMessages = async () => {
      const messagesRef = collection(db, "Chats", chatId, "messages");
      const initialQuery = query(
        messagesRef,
        orderBy("timestamp", "desc"),
        limit(batchSize)
      );
      const snapshot = await getDocs(initialQuery);

      if (snapshot.empty) {
        await setDocument(`Chats/${chatId}/messages`, "_placeholder", {
          text: "",
          userId: "system",
          timestamp: new Date(0),
        });
        setMessages([]);
        return;
      }

      const msgs: Message[] = snapshot.docs
        .filter((doc) => doc.id !== "_placeholder")
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, "id">),
        }))
        .reverse();

      await populateUsernames(msgs);
      setMessages(msgs);

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
    };

    initMessages().catch((err) =>
      console.error("Error loading messages:", err)
    );
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const messagesRef = collection(db, "Chats", chatId, "messages");
    const unsubscribe = onSnapshot(
      query(messagesRef, orderBy("timestamp", "asc")),
      async (snapshot) => {
        const newMsgs: Message[] = snapshot.docs
          .filter((doc) => doc.id !== "_placeholder")
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Message, "id">),
          }));
        if (newMsgs.length > 0) {
          await populateUsernames(newMsgs);
          setMessages(newMsgs);
        }
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (groupData?.announcements) {
      const fetchAndSortAnnouncements = async () => {
        const docs = await Promise.all(
          groupData.announcements.map(async (annRef) => {
            const annSnap = await getDoc(annRef);
            return annSnap.exists()
              ? ({ id: annSnap.id, ...annSnap.data() } as AnnouncementData & {
                  id: string;
                })
              : null;
          })
        );
        const validDocs = docs.filter(
          (doc) => doc !== null
        ) as (AnnouncementData & { id: string })[];
        validDocs.sort(
          (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
        );
        setSortedAnnouncements(validDocs);
      };
      fetchAndSortAnnouncements();
    }
  }, [groupData?.announcements]);

  useEffect(() => {
    if (groupMembers.length) {
      groupMembers.forEach(([, , userId]) => {
        if (!memberPics[userId]) {
          getDoc(doc(db, "Users", userId)).then((snap) => {
            interface UserData { profilePic?: string; }
      
            if (snap.exists()) {
                    const userData = snap.data() as UserData;
                    const pic = userData.profilePic;
                    if (pic) {
                      setMemberPics((prev) => ({ ...prev, [userId]: pic }));
                    }
                  }
          });
        }
      });
    }
  }, [groupMembers, memberPics]);

  async function handleCalendarTabClick() {
    if (!docId) {
      router.push("/groupslist");
      console.error("Invalid group ID");
      return;
    }
    const groupRef = doc(db, "Groups", docId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
      router.push("/groupslist");
      console.error("Group not found");
      return;
    }
    const data = groupDoc.data(); // store the fetched data
    if (Array.isArray(data.events)) {
      const events = await Promise.all(
        data.events.map(async (eventRef) => {
          const eventDoc = await getDoc(eventRef);
          const eventData = eventDoc.data() as EventData;
          let userRSVPStatus = "None";
          for (const key in eventData.RSVP) {
            if (key === uid) {
              userRSVPStatus = eventData.RSVP[key];
              break;
            }
          }
          return {
            title: eventData.name,
            start: eventData.start ? eventData.start.seconds * 1000 : undefined,
            end: eventData.end ? eventData.end.seconds * 1000 : undefined,
            allDay: eventData.allDay,
            description: eventData.description,
            location: eventData.location,
            docID: eventDoc.id,
            ownerType: eventData.ownerType,
            owner: eventData.owner,
            RSVPStatus: userRSVPStatus,
            workout: eventData.workouts,
            tags: eventData.tags || [],
          };
        })
      );
      setEventList(events);
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId || !messageId) return;
    // if deleting user's last message, suppress edit on the new last one
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.id === messageId && lastMsg.userId === uid) {
      setSuppressEditAfterDelete(true);
    }
    try {
      await deleteDoc(doc(db, "Chats", chatId, "messages", messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const populateUsernames = async (msgs: Message[]) => {
    const promises = msgs.map(async (msg: Message) => {
      const uid = msg.userId;
      if (userCache.current[uid]) {
        msg.username = userCache.current[uid];
      } else {
        try {
          const userData = await viewDocument("Users", uid);
          const username = userData?.username || uid;
          userCache.current[uid] = username;
          msg.username = username;
        } catch (error) {
          console.error("Error fetching user data:", error);
          msg.username = uid;
        }
      }
    });
    await Promise.all(promises);
  };

  const loadMoreMessages = async () => {
    if (!chatId || !lastVisible) return;
    setLoadingMore(true);
    const olderQuery = query(
      collection(db, "Chats", chatId, "messages"),
      orderBy("timestamp", "desc"),
      startAfter(lastVisible),
      limit(batchSize)
    );
    try {
      const snapshot = await getDocs(olderQuery);
      const olderMsgs: Message[] = snapshot.docs
        .filter((doc) => doc.id !== "_placeholder")
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, "id">),
        }))
        .reverse();
      await populateUsernames(olderMsgs);
      skipScrollRef.current = true;
      setMessages((prev) => {
        // Combine old + new
        const combined = [...olderMsgs, ...prev];

        // Filter out duplicates by id
        const unique = combined.filter(
          (message, index, self) =>
            index === self.findIndex((m) => m.id === message.id)
        );

        return unique;
      });
      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
    }
    setLoadingMore(false);
    // scroll chat window to the top after loading previous messages
    if (chatRef.current) {
      chatRef.current.scrollTop = 0;
    }
  };

  const sendMessage = async (content: string = newMessage, isImage = false) => {
    if (!content.trim() || !uid || !chatId) return;
    const newMsgId = `${Date.now()}_${uid}`;
    const newMsgData = {
      text: content,
      userId: uid,
      timestamp: new Date(),
      isImage,
    };
    try {
      await setDocument(`Chats/${chatId}/messages`, newMsgId, newMsgData);
      if (!isImage) setNewMessage("");
      setSuppressEditAfterDelete(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await fetch("/api/blob/upload", {
        method: "POST",
        headers: {
          "content-type": file.type,
        },
        body: await file.arrayBuffer(),
      });

      const data = await res.json();
      const imageUrl = data.url;

      await sendMessage(imageUrl, true);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };  
  
  useEffect(() => {
    const chatEl = chatRef.current;
    if (!chatEl) return;
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    chatEl.scrollTop = chatEl.scrollHeight;
  }, [messages]);

  // use effect for announcement permissions
  useEffect(() => {
    if (uid && groupData) {
      const members = groupData.members;
      setUserRole(members[uid][1]);
      if (members[uid][1] == "leader" || members[uid][1] == "owner") {
        setCreateAnnouncement(true);
      } else {
        setCreateAnnouncement(false);
      }
    }
  }, [uid, groupData]);

  // scroll-to-bottom when returning to chat tab
  useEffect(() => {
    if (activeTab === "chat" && chatRef.current) {
      // defer to next tick so content is mounted
      setTimeout(() => {
        chatRef.current!.scrollTop = chatRef.current!.scrollHeight;
      }, 0);
    }
  }, [activeTab]);

  return (
    <>
      <div className="group-header-background">
        <div
          className="group-header"
          onClick={() => {
            if (docId) router.push(`/group/view?groupId=${docId}`);
          }}
        >
          {groupData?.picture && (
            <div className="w-10 h-10 relative mr-3 flex-shrink-0">
              <NextImage
                src={groupData.picture}
                alt={`${groupData.name} thumbnail`}
                fill
                className="object-cover rounded-full"
              />
            </div>
          )}
          {groupData?.name || "Loading..."}
          <div className="members-button" onClick={(e) => e.stopPropagation()}>
            <Sheet>
              <SheetTrigger>+</SheetTrigger>
              <SheetContent>
                <div className="member-sheet-content">
                  <SheetTitle style={{ fontWeight: "bold" }}>
                    Members
                  </SheetTitle>
                  <SheetDescription></SheetDescription>
                  <div className="member-list">
                    {Array.isArray(groupMembers) ? (
                      groupMembers.map(
                        (member: Array<string>, index: number) => (
                          <Fragment key={member[2]}>
                            <li
                              className="member-name flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => router.push(`/profile/${member[2]}`)}
                            >
                              {memberPics[member[2]] && (
                                <div className="w-8 h-8 relative flex-shrink-0 rounded-full overflow-hidden">
                                  <NextImage
                                    src={memberPics[member[2]]}
                                    alt={`${member[0]} profile`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <div className="member-username">{member[0]}</div>
                                <div className="member-permission">{member[1]}</div>
                              </div>
                            </li>
                            {index < groupMembers.length - 1 && (
                              <hr className="member-divider" />
                            )}
                          </Fragment>
                        )
                      )
                    ) : (
                      <li style={{ fontSize: "0.9em", color: "grey" }}>
                        No members found
                      </li>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <div className="tabs-container">
        <Tabs
          defaultValue="chat"
          onValueChange={(value) => {
            setActiveTab(value as "announcements" | "chat" | "calendar");
            if (value === "calendar") {
              handleCalendarTabClick();
            }
          }}
        >
          <TabsList className="tabs-list" ref={tabsListRef}>
            <TabsTrigger value="announcements" className="tabs-trigger">
              announcements
            </TabsTrigger>
            <TabsTrigger value="chat" className="tabs-trigger">
              chat
            </TabsTrigger>
            <TabsTrigger value="calendar" className="tabs-trigger">
              calendar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="announcements">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              {createAnnouncement && (
                <Button
                  onClick={() =>
                    router.push(`/announcement/create?groupId=${docId}`)
                  }
                >
                  Create Announcement
                </Button>
              )}
            </div>
            <div
              className={`announcements space-y-4 ${!createAnnouncement ? "no-create" : ""}`}
            >
              {sortedAnnouncements.length > 0 ? (
                sortedAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="relative">
                    <UserAnnouncementCard announcementData={announcement} />
                    {(userRole === "leader" || userRole === "owner") && (
                      <>
                        <Button
                          size="sm"
                          className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-400"
                          onClick={() =>
                            router.push(
                              `/announcement/edit/${announcement.id}?groupId=${docId}`
                            )
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-12 right-2"
                          onClick={() =>
                            handleDeleteAnnouncement(announcement.id)
                          }
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p>No announcements found</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="chat">
            <div>
              <div className="chat space-y-2 mb-4 mt-4" ref={chatRef}>
                <Button onClick={loadMoreMessages} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load Previous Messages"}
                </Button>
                {messages.map((msg: Message, idx: number) => {
                  const isLastOwn = msg.userId === uid && idx === messages.length - 1;
                  return (
                    <div key={msg.id} className="border rounded p-2 shadow-sm bg-white">
                      <div className="text-sm text-gray-500 flex justify-between">
                        <div>
                          {msg.username} •{" "}
                          {msg.timestamp?.toDate?.().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex space-x-2">
                          {(userRole === "leader" || userRole === "owner" || isLastOwn) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-red-500 hover:underline text-xs"
                            >
                              Delete
                            </button>
                          )}
                          {isLastOwn && !editingMessageId && !msg.isImage && !suppressEditAfterDelete && (
                            <button
                              onClick={() => startEditingMessage(msg)}
                              className="text-blue-500 hover:underline text-xs"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                      {editingMessageId === msg.id ? (
                        <div className="flex space-x-2 mt-2">
                          <Input
                            value={editingMessageText}
                            onChange={(e) => setEditingMessageText(e.target.value)}
                          />
                          <Button onClick={saveEditedMessage}>Save</Button>
                          <Button variant="secondary" onClick={cancelEditing}>
                            Cancel
                          </Button>
                        </div>
                      ) : msg.isImage ? (
                        <NextImage
                          src={msg.text}
                          alt="Uploaded"
                          width={imageDims[msg.id]?.width || 400}
                          height={imageDims[msg.id]?.height || 200}
                          className="max-w-full max-h-full mt-1 rounded"
                          onLoadingComplete={({ naturalWidth, naturalHeight }) =>
                            setImageDims((prev) => ({
                              ...prev,
                              [msg.id]: { width: naturalWidth, height: naturalHeight },
                            }))
                          }
                        />
                      ) : (
                        <div className="mt-1">{msg.text}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex space-x-2">
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()}>Upload Image</Button>

                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message"
                />
              <Button onClick={() => sendMessage()}>Send</Button>
            </div>
          </TabsContent>
          <TabsContent value="calendar" className="tabs-content">
            <div style={{ height: "calc(78vh)" }}>
              <FullCalendar
                ref={calendarRef}
                themeSystem="standard"
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                initialView="dayGridMonth"
                navLinks
                selectable
                eventInteractive
                height="100%"
                contentHeight="100%"
                customButtons={{
                  createEvent: {
                    text: "create event",
                    click: () => {
                      if (userRole === "leader" || userRole === "owner") {
                        router.push(
                          `/event/create?group=true&groupId=${docId}`
                        );
                      } else {
                        alert("You do not have permission to create events.");
                      }
                    },
                  },
                  list: {
                    text: "list",
                    click: () => {
                      const calendarApi = calendarRef.current?.getApi();
                      if (calendarApi?.view.type === "timeGridDay") {
                        calendarApi.changeView("listDay");
                      } else if (calendarApi?.view.type === "timeGridWeek") {
                        calendarApi.changeView("listWeek");
                      } else if (calendarApi?.view.type === "dayGridMonth") {
                        calendarApi.changeView("listMonth");
                      } else if (calendarApi?.view.type === "listDay") {
                        calendarApi.changeView("timeGridDay");
                      } else if (calendarApi?.view.type === "listWeek") {
                        calendarApi.changeView("timeGridWeek");
                      } else if (calendarApi?.view.type === "listMonth") {
                        calendarApi.changeView("dayGridMonth");
                      }
                    },
                  },
                }}
                headerToolbar={{
                  left: "list timeGridDay,timeGridWeek,dayGridMonth",
                  center: "title",
                  right: "createEvent today prevYear,prev,next,nextYear",
                }}
                events={eventList}
                eventDidMount={(info) => {
                  if (
                    info.event.extendedProps.description &&
                    info.view.type !== "dayGridMonth"
                  ) {
                    const descEl = document.createElement("div");

                    let desc;
                    if (info.event.extendedProps.description) {
                      desc = info.event.extendedProps.description;
                    } else {
                      desc = "None";
                    }

                    descEl.innerHTML = `
                      <strong>Location:</strong> ${
                        info.event.extendedProps.location || "N/A"
                      }<br/>
                      <strong>Description:</strong> ${desc}<br/>
                      <strong>RSVP Status:</strong> ${
                        info.event.extendedProps.RSVPStatus
                      }<br/>
                      <strong>Workout:</strong> ${
                        info.event.extendedProps.workout
                      }
                      <em>Click for more details</em>
                      <br/>
                    `;
                    descEl.style.fontSize = "0.9em";
                    descEl.style.color = "black";
                    descEl.style.whiteSpace = "normal";
                    descEl.style.overflowWrap = "anywhere";
                    descEl.style.margin = "0";
                    descEl.style.backgroundColor = "#ffffff";
                    descEl.style.padding = "4px";
                    descEl.style.borderRadius = "3px";
                    info.el
                      .querySelector(".fc-event-title")
                      ?.appendChild(descEl);
                  }
                }}
                eventMouseEnter={(info) => {
                  if (info.view.type === "dayGridMonth") {
                    const rect = info.el.getBoundingClientRect();
                    const tooltipEl = document.createElement("div");
                    tooltipEl.classList.add("my-event-tooltip");

                    let desc;
                    if (info.event.extendedProps.description) {
                      desc = info.event.extendedProps.description;
                    } else {
                      desc = "None";
                    }

                    const tags = info.event.extendedProps.tags || [];
                    const tagsDisplay = (tags.length > 3)
                      ? `${tags.slice(0, 3).join(", ")}, etc.` // Show up to 3 tags and add "etc." if there are more
                      : tags.join(", ") || "None";

                    tooltipEl.innerHTML = `
                      <strong>Location:</strong> ${
                        info.event.extendedProps.location || "N/A"
                      }<br/>
                      <strong>Description:</strong> ${desc}<br/>
                      <strong>RSVP Status:</strong> ${
                        info.event.extendedProps.RSVPStatus
                      }<br/>
                      <strong>Workout:</strong> ${
                        info.event.extendedProps.workout
                      }
                      ... <strong>and more</strong>
                      <br/>
                      <strong>Tags:</strong> ${tagsDisplay}<br/>
                      <br/>
                      <em>Click for more details</em>
                      <br/>
                    `;
                    tooltipEl.style.position = "fixed";
                    tooltipEl.style.color = "black";
                    tooltipEl.style.fontSize = "0.8em";
                    tooltipEl.style.left = `${rect.left}px`;
                    tooltipEl.style.top = `${rect.bottom}px`;
                    tooltipEl.style.zIndex = "9999";
                    tooltipEl.style.backgroundColor = "white";
                    tooltipEl.style.border = "1px solid #ccc";
                    tooltipEl.style.padding = "5px";
                    tooltipEl.style.whiteSpace = "normal";
                    document.body.appendChild(tooltipEl);
                    info.event.setExtendedProp("tooltipEl", tooltipEl);
                  }
                }}
                eventMouseLeave={(info) => {
                  const tooltipEl = info.event.extendedProps.tooltipEl;
                  if (tooltipEl) {
                    tooltipEl.remove();
                  }
                }}
                eventClick={(info) => {
                  // Remove tooltip if it exists before routing
                  if (info.event.extendedProps.tooltipEl) {
                    info.event.extendedProps.tooltipEl.remove();
                  }
                  if (
                    auth.currentUser?.uid === info.event.extendedProps.owner
                  ) {
                    router.push(
                      `/event/modify?docId=${info.event.extendedProps.docID}`
                    );
                  } else {
                    router.push(
                      `/event/view?docId=${info.event.extendedProps.docID}`
                    );
                  }
                }}
              />
            </div>
            <style jsx global>{`
              .fc .fc-toolbar-title {
                font-weight: bold;
              }
            `}</style>
          </TabsContent>
        </Tabs>
      </div>
      <NavBar />
    </>
  );
};

export default function Groups() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GroupsPage />
    </Suspense>
  );
}
