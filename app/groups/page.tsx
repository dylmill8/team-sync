"use client";

import "./groups.css";

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/ui/navigation-bar";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from '@/utils/firebaseConfig';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";

interface EventData {
  name: string;
  allDay: boolean;
  start: { seconds: number; };
  end: { seconds: number; };
  description: string;
  location: string;
  docID: string;
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
  owner: string;
  RSVPStatus: string;
  workout: string;
}

export default function Groups() {
  const auth = getAuth(firebaseApp);
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("docId");
  const calendarRef = useRef<FullCalendar>(null);

  const [eventList, setEventList] = useState<CalendarEvent[]>([]);
  const [groupData, setGroupData] = useState<any>(null);

  useEffect(() => {
    console.log("Fetching events...");
    async function fetchGroup() {
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
      setGroupData(groupDoc.data());
    }
    fetchGroup();
  }, [docId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;

        if (uid) {
          const userDocRef = doc(db, "Users", uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
          }
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [auth]);

  //! TODO: Fetch, parse, and display group events on calendar

  return (
    <>
      <div className="group-header-background">
        <div className="group-header">
          {
          //! TODO: Wrap this in a link to the group info page
          groupData?.name || 'Loading...'
          }
          <div className="members-button">
            {/*<button className="group-join-button">+</button>*/}
            <Sheet>
              <SheetTrigger>+</SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Members</SheetTitle>
                  <SheetDescription>View members of this group</SheetDescription>
                  {
                  //! TODO: fetch, parse, sort, and display group members
                  }
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <div className="tabs-container">
        <Tabs defaultValue="chat">
          <TabsList className="tabs-list">
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
            {/* add logic for button to display only if user is a team leader */}
            <Button onClick={() => router.push(`/announcement/create?groupId=${docId}`)}>Create Announcement</Button>
            Announcements...
          </TabsContent>
          <TabsContent value="chat" className="tabs-content">
            Chat...
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
                    click: () => router.push('/event/create'),
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
                  if (auth.currentUser?.uid === info.event.extendedProps.owner) {
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
      <NavBar/>
    </>
  );
}