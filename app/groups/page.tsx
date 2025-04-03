"use client";

import "./groups.css";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"

import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/ui/navigation-bar";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from '@/utils/firebaseConfig';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, DocumentReference, getDoc, query, collection, orderBy, startAfter, limit, getDocs, QueryDocumentSnapshot, DocumentData, onSnapshot, Timestamp } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";
import { setDocument, viewDocument } from "../../utils/firebaseHelper.js"


interface EventData {
  name: string;
  allDay: boolean;
  start: { seconds: number; };
  end: { seconds: number; };
  description: string;
  location: string;
  docID: string;
  ownerType: string;
  owner: string;
  RSVP: { [key: string]: string; };
  workouts: string;
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
}

interface GroupData {
  name: string;
  description: string;
  picture: string;
  privacy: boolean;
  members: { [key: string]: string; };
  events: Array<{ id: string; }>;
  chat: DocumentReference;
  announcements: DocumentReference;
}

type Message = {
  id: string
  text: string
  userId: string
  username?: string
  timestamp?: Timestamp
}

export default function Groups() {
  const auth = getAuth(firebaseApp);
  const uid = auth.currentUser?.uid;
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("docId");
  const calendarRef = useRef<FullCalendar>(null);
  const userCache = useRef<Record<string, string>>({})
  const batchSize = 10

  const chatRef = useRef<HTMLDivElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);

  const [eventList, setEventList] = useState<CalendarEvent[]>([]);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [groupMembers, setGroupMembers] = useState<Array<Array<string>>>([]);
  const [loadingMore, setLoadingMore] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")

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
        console.error("Invalid group ID");
        return;
      }
      if (typeof docId === "string") {
        setChatId("group" + docId)
      }
      const groupRef = doc(db, "Groups", docId);
      const groupDoc = await getDoc(groupRef);
      if (!groupDoc.exists()) {
        console.error("Group not found");
        return;
      }
      setGroupData(groupDoc.data() as GroupData);
    }
    fetchGroup();
  }, [docId, uid]);



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
            if (role === 'owner') return 0;
            if (role === 'leader') return 1;
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
      console.log("Group members:", sortedMembers);
    }
  }, [groupData?.members]);

  

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
      

  async function handleCalendarTabClick() {
    if (!docId) {
      console.error("Invalid group ID");
      return;
    }
    const groupRef = doc(db, "Groups", docId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) {
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
            workout: eventData.workouts
          };
        })
      );
      setEventList(events);
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
        } catch (error) {
          console.error("Error fetching user data:", error)
          msg.username = uid
        }
      }
    })
    await Promise.all(promises)
  }

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
      const olderMsgs: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, "id">),
      })).reverse()
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
    if (!newMessage.trim() || !uid || !chatId) return
    const newMsgId = `${Date.now()}_${uid}`
    const newMsgData = {
      text: newMessage,
      userId: uid,
      timestamp: new Date(),
    }
    try {
      await setDocument(`Chats/${chatId}/messages`, newMsgId, newMsgData)
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  return (
    <>
      <div className="group-header-background">
        <div className="group-header" onClick={() => { if (docId) router.push(`/group/view?groupId=${docId}`); }}>
          {
          groupData?.name || 'Loading...'
          }
          <div className="members-button" onClick={(e) => e.stopPropagation()}>
            <Sheet>
              <SheetTrigger>+</SheetTrigger>
              <SheetContent>
                <div className="member-sheet-content">
                  <SheetTitle style={{fontWeight: 'bold'}}>Members</SheetTitle>
                  <div className="member-list">
                    {Array.isArray(groupMembers) ? (
                      groupMembers.map((member: Array<string>, index: number) => (
                        <li key={index} className="member-name" onClick={() => router.push(`/profile/${member[2]}`)}>
                          <div className="member-username">{member[0]}</div>
                          <div className="member-permission">{member[1]}</div>
                          <hr className="member-divider" />
                        </li>
                      ))
                    ) : (
                      <li style={{fontSize: '0.9em', color: 'grey'}}>
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
        <Tabs defaultValue="chat" onValueChange={(value) => {
          if (value === "calendar") {
            handleCalendarTabClick();
          }
        }}>
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
          <TabsContent value="announcements" className="tabs-content">
            {/* add logic for button to display only if user is a team leader */
            }
            <Button onClick={() => router.push(`/announcement/create?groupId=${docId}`)}>Create Announcement</Button>
            Announcements...
          </TabsContent>
          <TabsContent value="chat" className="tabs-content">
            <div className="chat" ref={chatRef}>

              <div className="chat-messages space-y-2 mb-4 mt-4">
              <Button onClick={loadMoreMessages} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load Previous Messages"}
              </Button>
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
          </TabsContent>
          <TabsContent value="calendar" className="tabs-content">
            <NavBar/>
            <div style={{ height: 'calc(78vh)' }}>
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
                    text: 'create event',
                    click: () => router.push(`/event/create?group=true&groupId=${docId}`),
                  },
                  list: {
                    text: 'list',
                    click: () => {
                      const calendarApi = calendarRef.current?.getApi();
                      if (calendarApi?.view.type === 'timeGridDay') {
                        calendarApi.changeView('listDay');
                      } else if (calendarApi?.view.type === 'timeGridWeek') {
                        calendarApi.changeView('listWeek');
                      } else if (calendarApi?.view.type === 'dayGridMonth') {
                        calendarApi.changeView('listMonth');
                      } else if (calendarApi?.view.type === 'listDay') {
                        calendarApi.changeView('timeGridDay');
                      } else if (calendarApi?.view.type === 'listWeek') {
                        calendarApi.changeView('timeGridWeek');
                      } else if (calendarApi?.view.type === 'listMonth') {
                        calendarApi.changeView('dayGridMonth');
                      }
                    }
                  }
                }}
                headerToolbar={{
                  left: 'list timeGridDay,timeGridWeek,dayGridMonth',
                  center: 'title',
                  right: 'createEvent today prevYear,prev,next,nextYear'
                }}
                events={eventList}
                eventDidMount={(info) => {
                  if (info.event.extendedProps.description && info.view.type !== 'dayGridMonth') {
                    const descEl = document.createElement('div');

                    let desc;
                    if (info.event.extendedProps.description) {
                      desc = info.event.extendedProps.description;
                    } else {
                      desc = 'None';
                    }

                    descEl.innerHTML = `
                      <strong>Location:</strong> ${info.event.extendedProps.location || 'N/A'}<br/>
                      <strong>Description:</strong> ${desc}<br/>
                      <strong>RSVP Status:</strong> ${info.event.extendedProps.RSVPStatus}<br/>
                      <strong>Workout:</strong> ${info.event.extendedProps.workout}
                      ... <strong>and more</strong>
                      <br/>
                      <em>Click for more details</em>
                      <br/>
                    `;
                    descEl.style.fontSize = '0.9em';
                    descEl.style.color = 'black';
                    descEl.style.whiteSpace = 'normal';
                    descEl.style.overflowWrap = 'anywhere';
                    descEl.style.margin = '0';
                    descEl.style.backgroundColor = '#ffffff';
                    descEl.style.padding = '4px';
                    descEl.style.borderRadius = '3px';
                    info.el.querySelector('.fc-event-title')?.appendChild(descEl);
                  }
                }}
                eventMouseEnter={(info) => {
                  if (info.view.type === 'dayGridMonth') {
                    const rect = info.el.getBoundingClientRect();
                    const tooltipEl = document.createElement('div');
                    tooltipEl.classList.add('my-event-tooltip');

                    let desc;
                    if (info.event.extendedProps.description) {
                      desc = info.event.extendedProps.description;
                    } else {
                      desc = 'None';
                    }

                    tooltipEl.innerHTML = `
                      <strong>Location:</strong> ${info.event.extendedProps.location || 'N/A'}<br/>
                      <strong>Description:</strong> ${desc}<br/>
                      <strong>RSVP Status:</strong> ${info.event.extendedProps.RSVPStatus}<br/>
                      <strong>Workout:</strong> ${info.event.extendedProps.workout}
                      ... <strong>and more</strong>
                      <br/>
                      <em>Click for more details</em>
                      <br/>
                    `;
                    tooltipEl.style.position = 'fixed';
                    tooltipEl.style.color = 'black';
                    tooltipEl.style.fontSize = '0.8em';
                    tooltipEl.style.left = `${rect.left}px`;
                    tooltipEl.style.top = `${rect.bottom}px`;
                    tooltipEl.style.zIndex = '9999';
                    tooltipEl.style.backgroundColor = 'white';
                    tooltipEl.style.border = '1px solid #ccc';
                    tooltipEl.style.padding = '5px';
                    tooltipEl.style.whiteSpace = 'normal';
                    document.body.appendChild(tooltipEl);
                    info.event.setExtendedProp('tooltipEl', tooltipEl);
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
                  if (auth.currentUser?.uid === info.event.extendedProps.owner) {
                    router.push(`/event/modify?docId=${info.event.extendedProps.docID}`);
                  } else {
                    router.push(`/event/view?docId=${info.event.extendedProps.docID}`);
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
      <NavBar/>
    </>
  );
}