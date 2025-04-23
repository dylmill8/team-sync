"use client";

import { firebaseApp, db } from "@/utils/firebaseConfig";
import { getAuth, User } from "firebase/auth";
import { useState, useEffect } from "react";
import { doc, DocumentReference, getDoc } from "firebase/firestore";

// WARNING THIS PAGE IS NOT FUNCTIONAL AT ALL LOL

interface GroupData {
  announcements: DocumentReference[];
  description: string;
  events: DocumentReference[];
  groupPic: string;
  isPrivate: boolean;
  members: { [key: string]: string[] };
  name: string;
  owner: string | string[];
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
  const [eventsList, setEventsList] = useState<EventData[] | []>([]);
  const [workoutList, setWorkoutList] = useState<WorkoutData[] | []>([]);

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
            let workoutDataList = [];
            if (userData.workouts) {
              const workoutListPromise = userData.workouts.map(async (workoutRef: DocumentReference) => {
                const workoutDoc = await getDoc(workoutRef);
                if (workoutDoc.exists()) {
                  return workoutDoc.data();
                }
              });

              workoutDataList = await Promise.all(workoutListPromise);
              setWorkoutList(workoutDataList);
            }

            // extract events from event and group lists
            let userEventList = [];
            if (userData.events) {
              const userEventPromise = userData.events.map(async (eventRef: DocumentReference) => {
                const eventDoc = await getDoc(eventRef);
                if (eventDoc.exists()) {
                  return eventDoc.data();
                }
              });

              userEventList = await Promise.all(userEventPromise);
            }

            let groupEventList = [];
            if (userData.groups) {
              const groupEventPromise = userData.groups.map(
                async (groupRef: DocumentReference) => {
                  const groupDoc = await getDoc(groupRef);
                  if (groupDoc.exists()) {
                    const groupData = groupDoc.data() as GroupData;
                    const groupEvents = groupData.events;

                    const eventListPromise = groupEvents.map(async (eventRef) => {
                      const eventDoc = await getDoc(eventRef);
                      if (eventDoc.exists()) {
                        return eventDoc.data();
                      }
                    })

                    const eventList = await Promise.all(eventListPromise);
                    return eventList;
                  }
                }
              );

              groupEventList = await Promise.all(groupEventPromise);
            }

            const allEvents = [...userEventList, ...groupEventList];
            setEventsList(allEvents);
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
          {workoutList.map((workoutData) => (
            <p key={workoutData.name}>{workoutData.name}</p>
          ))}

          <h2>list of events:</h2>
          {eventsList.map((eventData) => (
            <p key={eventData.name}>{eventData.name}</p>
          ))}
        </div>
      )}

      {!user && <p>Error: user not authenticated.</p>}
    </div>
  );
}
