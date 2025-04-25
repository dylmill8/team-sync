"use client";

import "./calendar.css";
import { DocumentReference, DocumentData } from "firebase/firestore";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import NavBar from "@/components/ui/navigation-bar";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from "@/utils/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";
//import { Button } from "@/components/ui/button";

interface TaggedEventRef {
  ref: DocumentReference<DocumentData>;
  type: "personal" | "group";
}

interface EventData {
  name: string;
  allDay: boolean;
  start: { seconds: number };
  end: { seconds: number };
  description: string;
  location: string;
  docID: string;
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
  owner: string;
  RSVPStatus: string;
  RSVPMap: { [key: string]: string }; // Include full RSVP object
  workout: string;
  tags: string[];
}

export default function Calendar() {
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [minRSVP, setMinRSVP] = useState<number>(0);


  const [eventList, setEventList] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]); // State for filtered events
  const [availableTags, setAvailableTags] = useState<string[]>([]); // State for available tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // State for selected tags
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return console.error("User not signed in.");
  
      const uid = user.uid;
      const userDocRef = doc(db, "Users", uid);
      const userDocSnap = await getDoc(userDocRef);
  
      if (!userDocSnap.exists()) return console.error("User document not found.");
  
      const userData = userDocSnap.data();

      const eventRefs: TaggedEventRef[] = [];
  
      // Include personal events
      if (Array.isArray(userData.events)) {
        for (const ref of userData.events) {
          eventRefs.push({ ref, type: "personal" });
        }
      }
      
      if (Array.isArray(userData.groups)) {
        for (const groupRef of userData.groups) {
          if (typeof groupRef === "object" && groupRef !== null && "id" in groupRef) {
            const groupDocSnap = await getDoc(groupRef as DocumentReference);
            if (groupDocSnap.exists()) {
              const groupData = groupDocSnap.data();
              if (Array.isArray(groupData.events)) {
                for (const ref of groupData.events) {
                  eventRefs.push({ ref, type: "group" });
                }
              }
            }
          }
        }
      }
      
      
  
      const eventPromises = eventRefs.map(async ({ ref, type }) => {
        try {
          const eventDoc = await getDoc(ref);
          if (!eventDoc.exists()) return null;
          const eventData = eventDoc.data() as EventData;
      
          let userRSVPStatus = "None";
          if (eventData.RSVP && eventData.RSVP[uid]) {
            userRSVPStatus = eventData.RSVP[uid];
          }
      
          let workoutData = "None";
          if (eventData.workouts?.length > 0) {
            const workoutDocRef = doc(db, "Workouts", eventData.workouts[0]);
            const workoutDoc = await getDoc(workoutDocRef);
            if (workoutDoc.exists()) {
              workoutData = workoutDoc.data().exercises[0];
            }
          }
      
          return {
            title: eventData.name,
            allDay: eventData.allDay,
            start: eventData.start?.seconds ? eventData.start.seconds * 1000 : undefined,
            end: eventData.end?.seconds ? eventData.end.seconds * 1000 : undefined,
            description: eventData.description,
            location: eventData.location,
            docID: eventDoc.id,
            owner: eventData.owner,
            RSVPStatus: userRSVPStatus,
            RSVPMap: eventData.RSVP,
            workout: workoutData,
            tags: eventData.tags || [],
            color: type === "group" ? "#056ceb" : "#7b04db", // 
          };
        } catch (err) {
          console.error("Error fetching event:", err);
          return null;
        }
      });
      
      
  
      const events = await Promise.all(eventPromises);
      const validEvents = events.filter(Boolean) as CalendarEvent[];
      setEventList(validEvents);
      setFilteredEvents(validEvents);
  
      // Extract and sort unique tags
      const tags = Array.from(
        new Set(validEvents.flatMap((e) => e.tags))
      ).sort();
      setAvailableTags(tags);
    });
  
    return () => {
      unsubscribe();
      document.querySelectorAll(".my-event-tooltip").forEach((t) => t.remove());
    };
  }, [auth]);
  

  const toggleTag = (tag: string) => {
    setSelectedTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag) // Remove tag if already selected
        : [...prevTags, tag] // Add tag if not selected
    );
  };

  useEffect(() => {
    const [startDate, endDate] = dateRange;
  
    // detect if any filter is applied
    const filtersApplied =
      selectedTags.length > 0 ||
      !!startDate ||
      !!endDate ||
      minRSVP > 0;
  
    const newFiltered = eventList.filter((event) => {
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) =>
          event.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        );
  
      const eventStart = event.start ? new Date(event.start) : null;
      const eventEnd = event.end ? new Date(event.end) : null;

      const matchesDate =
        (!startDate || (eventStart && eventStart >= startDate)) &&
        (!endDate   || (eventEnd && eventEnd <= endDate));
  
      const yesCount = Object.values(event.RSVPMap || {}).filter(
        (val) => val.toLowerCase() === "yes"
      ).length;
      const matchesRSVP = yesCount >= minRSVP;
  
      return matchesTags && matchesDate && matchesRSVP;
    });
  
    // only pop the alert if filters are on AND there are no matches
    if (filtersApplied && newFiltered.length === 0) {
      alert("No events match your filters.");
    }
  
    setFilteredEvents(newFiltered);
  }, [selectedTags, dateRange, minRSVP, eventList]);
  
  

  return (
    <div className="calendar">
      <NavBar />
      <div className="relative">
        {/* FullCalendar */}
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
            customButtons={{
              filterTags: {
                text: "filters",
                click: () => setShowTagDropdown((prev) => !prev),
              },
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
              left: "list filterTags timeGridDay,timeGridWeek,dayGridMonth",
              center: "title",
              right: "createEvent today prevYear,prev,next,nextYear",
            }}
            events={filteredEvents} // Use filtered events
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
                const tags = info.event.extendedProps.tags || [];
                const tagsDisplay = (tags.length > 3)
                  ? `${tags.slice(0, 3).join(", ")}, etc.` // Show up to 3 tags and add "etc." if there are more
                  : tags.join(", ") || "None";

                descEl.innerHTML = `
                  <strong>Location:</strong> ${
                    info.event.extendedProps.location || "N/A"
                  }<br/>
                  <strong>Description:</strong> ${desc}<br/>
                  <strong>RSVP Status:</strong> ${
                    info.event.extendedProps.RSVPStatus
                  }<br/>
                  <strong>Workout:</strong> ${info.event.extendedProps.workout}<br/>
                  <strong>Tags:</strong> ${tagsDisplay}<br/>
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

                const desc = info.event.extendedProps.description || "None";
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
                  <strong>Workout:</strong> ${info.event.extendedProps.workout}<br/>
                  <strong>Tags:</strong> ${tagsDisplay}<br/>
                  <em>Click for more details</em>
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
        {showTagDropdown && (
          <div
            className="absolute top-[58px] left-4 z-50 bg-white dark:bg-gray-800 p-4 rounded shadow border w-64"
            style={{
              maxHeight: "400px",
              overflowY: "auto", 
            }}
          >
            <div className="mt-2 space-y-4">
              {/* Date Range */}
              <div className="p-2">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 ">Start Date</label>
                <Input
          type="date"
          onChange={(e) =>
            setDateRange(([, end]) => {
              const val = e.target.value
              const start = val
                ? new Date(
                    parseInt(val.slice(0, 4)),         // year
                    parseInt(val.slice(5, 7)) - 1,     // month (0-based)
                    parseInt(val.slice(8, 10)),        // day
                    0, 0, 0                            // 00:00:00 local time
                  )
                : null
              return [start, end]
            })
          }
        />

      </div>
      <div className="p-1">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Date</label>
        <Input
  type="date"
  onChange={(e) =>
    setDateRange(([start, ]) => {
      const val = e.target.value
      const end = val
        ? new Date(
            parseInt(val.slice(0, 4)),
            parseInt(val.slice(5, 7)) - 1,
            parseInt(val.slice(8, 10)) + 1,
            0, 0, 0
          )
        : null
      return [start, end]
    })
  }
/>
      </div>

      {/* Min RSVP Count */}
      <div className="p-1">
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Minimum RSVPs</label>
        <Input
          type="number"
          min={0}
          className="w-full"
          placeholder="0"
          onChange={(e) => setMinRSVP(Number(e.target.value))}
        />
      </div>
      <div className="p-1 space-y-1">
        {availableTags.map((tag) => (
          <div
            key={tag}
            className={`cursor-pointer px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
              selectedTags.includes(tag) ? "bg-blue-100 dark:bg-blue-800" : ""
            }`}
            onClick={() => toggleTag(tag)}
          >
            {selectedTags.includes(tag) ? `✓ ${tag}` : tag}
          </div>
        ))}
      </div>
      {/*<div className="p-1 space-y-2">
        <Input
          name="newTag"
          placeholder="Add new tag"
          className="w-full"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const val = e.currentTarget.value.trim();
              if (val && !availableTags.includes(val)) {
                setAvailableTags((prev) => [...prev, val]);
                toggleTag(val);
                e.currentTarget.value = "";
              }
            }
          }}
        />
        <Button
          className="w-full"
          onClick={() => {
            const input = document.querySelector('input[name="newTag"]') as HTMLInputElement;
            const val = input?.value?.trim();
            if (val && !availableTags.includes(val)) {
              setAvailableTags((prev) => [...prev, val]);
              toggleTag(val);
              input.value = "";
            }
          }}
        >
          Add Tag
        </Button>
      </div>*/}
    </div>
  </div>
)}


      </div>
      <style jsx global>{`
        .fc .fc-toolbar-title {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
