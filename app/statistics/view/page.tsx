"use client";

import { firebaseApp, db } from "@/utils/firebaseConfig";
import { getAuth, User } from "firebase/auth";
import { useState, useEffect } from "react";
import { doc, DocumentReference, getDoc } from "firebase/firestore";

// interface GroupData {
//   announcements: DocumentReference[];
//   description: string;
//   events: DocumentReference[];
//   groupPic: string;
//   isPrivate: boolean;
//   members: { [key: string]: string[] };
//   name: string;
//   owner: string | string[];
// }

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

interface WorkoutData {
  Map: { [key: string]: string };
  eventId: string;
  exercises: string[];
  name: string;
}

export default function StatisticsPage() {
  // auth data
  const auth = getAuth(firebaseApp);
  const [user, setUser] = useState<User | null>(null);

  // user data
  const [username, setUsername] = useState<string | null>(null);
  const [eventsList, setEventsList] = useState<EventData[]>([]);
  const [workoutList, setWorkoutList] = useState<WorkoutData[]>([]);

  // events data

  // workouts data

  // listen for auth state change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // get user data
  useEffect(() => {
    const fetchUserData = async () => {
      const uid = user?.uid;
      if (uid) {
        try {
          const userRef = doc(db, "Users", uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();

            // set user data variables
            setUsername(userData.username || null);
            
            // extract workouts
            let workouts: WorkoutData[] = [];
            if (Array.isArray(userData.workouts)) {
              const workoutPromise = userData.workouts.map(async (workoutId: string) => {
                const workoutRef = doc(db, "Workouts", workoutId);
                const workoutDoc = await getDoc(workoutRef);
                return workoutDoc.data() as WorkoutData;
              });

              workouts = await Promise.all(workoutPromise);
              const filteredWorkouts = workouts.filter((e) => e != null) as WorkoutData[];
              workouts = filteredWorkouts;
            }
            setWorkoutList(workouts);

            // extract user events
            let events: EventData[] = [];
            if (Array.isArray(userData.events)) {
              const eventPromise = userData.events.map(async (eventRef: DocumentReference) => {
                const eventDoc = await getDoc(eventRef);
                return eventDoc.data() as EventData;
              });

              const userEvents = await Promise.all(eventPromise);
              const filteredUserEvents = userEvents.filter((e) => e != null) as EventData[];
              events = filteredUserEvents;
            }

            // extract group events
            if (Array.isArray(userData.groups)) {
              const groupPromise = userData.groups.map(async (groupRef: DocumentReference) => {
                const groupDoc = await getDoc(groupRef);
                const groupData = groupDoc.data();

                if (groupData?.events && Array.isArray(groupData.events)) {
                  const events : EventData[] = [];

                  for (const eventRef of groupData.events) {
                    const eventDoc = await getDoc(eventRef);
                    events.push(eventDoc.data() as EventData);
                  }
                  
                  return events;
                }
              });

              const groupEventList = await Promise.all(groupPromise);
              const filteredGroupList = groupEventList.flat().filter((e) => e != null);
              console.log("filteredGroupList:", filteredGroupList);
              console.log("events:", events);
              events = [...events, ...filteredGroupList];
            }
            setEventsList(events);

          }
        } catch (e) {
          console.log("error getting user data", e);
        }
      }
    };

    fetchUserData();
  }, [user]);

  return (
    <div>
      {user && (
        <div>
          <h1>Hello, {username}!</h1>

          <h2>list of workouts:</h2>
          {workoutList.map((workoutData, i) => (
            <p key={i}>{workoutData.name}</p>
          ))}

          <h2>list of events:</h2>
          {eventsList.map((eventData, i) => (
            <p key={i}>{eventData.name}</p>
          ))}
        </div>
      )}

      {!user && <p>Error: user not authenticated.</p>}
    </div>
  );
}
