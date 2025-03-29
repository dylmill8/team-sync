"use client";

import "./calendar.css";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { useRouter } from "next/navigation";
import NavBar from "@/components/ui/navigation-bar";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from "@/utils/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";

interface EventData {
  name: string;
  allDay: boolean;
  start: { seconds: number };
  end: { seconds: number };
  description: string;
  location: string;
  docID: string;
  // add the following:
  // ownerType: string; // is "user" when owner is user, is "group" when owner is group
  owner: string; // is either the group or user docId - depending on the ownerType
  RSVP: { [key: string]: string };
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

export default function Calendar() {
  const router = useRouter();
  const auth = getAuth(firebaseApp);

  const [eventList, setEventList] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;

        if (uid) {
          const userDocRef = doc(db, "Users", uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (Array.isArray(userData.events)) {
              const newEventList = [];

              // Get the events for the user
              for (let i = 0; i < userData.events.length; i++) {
                const event = userData.events[i];

                let eventDoc;
                try {
                  eventDoc = await getDoc(event);
                } catch (error) {
                  console.error("Error getting document:", error);
                }
                if (!eventDoc || !eventDoc.exists()) {
                  continue;
                }

                const eventData = eventDoc.data() as EventData;

                // get user RSVP status
                let userRSVPStatus = "None";
                for (const key in eventData.RSVP) {
                  if (key === uid) {
                    userRSVPStatus = eventData.RSVP[key];
                    break;
                  }
                }

                let workoutData = "None";
                if (eventData.workouts && eventData.workouts.length > 0) {
                  const workoutDocRef = doc(
                    db,
                    "Workouts",
                    eventData.workouts[0]
                  );
                  const workoutDoc = await getDoc(workoutDocRef);
                  if (workoutDoc.exists()) {
                    workoutData = workoutDoc.data().exercises[0];
                  }
                }

                newEventList.push({
                  title: eventData.name,
                  allDay: eventData.allDay,
                  start:
                    eventData.end == undefined
                      ? undefined
                      : eventData.start.seconds * 1000,
                  end:
                    eventData.end == undefined
                      ? undefined
                      : eventData.end.seconds * 1000,
                  description: eventData.description,
                  location: eventData.location,
                  docID: eventDoc.id,
                  owner: eventData.owner,
                  RSVPStatus: userRSVPStatus,
                  workout: workoutData,
                });
              }
              setEventList(newEventList);
            }
          } else {
            console.log("No such document!");
          }
        } else {
          console.error("Invalid UID.");
        }
      } else {
        console.error("User is not signed in.");
      }
    });
    return () => {
      unsubscribe();
      const allTooltips = document.querySelectorAll(".my-event-tooltip");
      allTooltips.forEach((tooltipEl) => tooltipEl.remove());
    };
  }, [auth]);

  return (
    <div className="calendar">
      <NavBar />
      <div
        style={{
          height: "calc(80vh)",
        }}
      >
        <FullCalendar
          ref={calendarRef}
          themeSystem="standard"
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          navLinks={true}
          selectable={true}
          eventInteractive={true}
          height="100%"
          contentHeight="100%"
          /* Alternate Event Colors
          eventBackgroundColor="#f2f2f2"
          eventBorderColor="#3182ce"
          eventTextColor="black"
          */

          customButtons={{
            createEvent: {
              text: "create event",
              click: () => {
                router.push("/event/create?group=false");
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
                <strong>Workout:</strong> ${info.event.extendedProps.workout}
                ... <strong>and more</strong>
                <br/>
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
              info.el.querySelector(".fc-event-title")?.appendChild(descEl);
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

              tooltipEl.innerHTML = `
                <strong>Location:</strong> ${
                  info.event.extendedProps.location || "N/A"
                }<br/>
                <strong>Description:</strong> ${desc}<br/>
                <strong>RSVP Status:</strong> ${
                  info.event.extendedProps.RSVPStatus
                }<br/>
                <strong>Workout:</strong> ${info.event.extendedProps.workout}
                ... <strong>and more</strong>
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
    </div>
  );
}
