"use client";

import { firebaseApp, db } from "@/utils/firebaseConfig";
import { getAuth, User } from "firebase/auth";
import { useState, useEffect } from "react";
import { doc, DocumentReference, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();

  // auth data
  const auth = getAuth(firebaseApp);
  const [user, setUser] = useState<User | null>(null);

  // user data
  const [username, setUsername] = useState<string | null>(null);
  const [eventsList, setEventsList] = useState<EventData[]>([]);
  const [workoutList, setWorkoutList] = useState<WorkoutData[]>([]);

  const [loadingWorkouts, setLoadingWorkouts] = useState<boolean>(false);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);

  // events stats
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [groupEvents, setGroupEvents] = useState<number>(0);
  const [rsvpStatuses, setRSVPStatuses] = useState<number[]>([0, 0, 0]);

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
            setLoadingWorkouts(true);
            let workouts: WorkoutData[] = [];
            if (Array.isArray(userData.workouts)) {
              const workoutPromise = userData.workouts.map(
                async (workoutId: string) => {
                  const workoutRef = doc(db, "Workouts", workoutId);
                  const workoutDoc = await getDoc(workoutRef);
                  return workoutDoc.data() as WorkoutData;
                }
              );

              workouts = await Promise.all(workoutPromise);
              const filteredWorkouts = workouts.filter(
                (e) => e != null
              ) as WorkoutData[];
              workouts = filteredWorkouts;
            }
            setWorkoutList(workouts);
            setLoadingWorkouts(false);

            // extract user events
            setLoadingEvents(true);
            let events: EventData[] = [];
            if (Array.isArray(userData.events)) {
              const eventPromise = userData.events.map(
                async (eventRef: DocumentReference) => {
                  const eventDoc = await getDoc(eventRef);
                  return eventDoc.data() as EventData;
                }
              );

              const userEvents = await Promise.all(eventPromise);
              const filteredUserEvents = userEvents.filter(
                (e) => e != null
              ) as EventData[];
              events = filteredUserEvents;
            }

            // extract group events
            if (Array.isArray(userData.groups)) {
              const groupPromise = userData.groups.map(
                async (groupRef: DocumentReference) => {
                  const groupDoc = await getDoc(groupRef);
                  const groupData = groupDoc.data();

                  if (groupData?.events && Array.isArray(groupData.events)) {
                    const events: EventData[] = [];

                    for (const eventRef of groupData.events) {
                      const eventDoc = await getDoc(eventRef);
                      events.push(eventDoc.data() as EventData);
                    }

                    return events;
                  }
                }
              );

              const groupEventList = await Promise.all(groupPromise);
              const filteredGroupList = groupEventList
                .flat()
                .filter((e) => e != null);
              setGroupEvents(filteredGroupList.length);
              events = [...events, ...filteredGroupList];
            }
            setEventsList(events);
            setTotalEvents(events.length);
            setLoadingEvents(false);
          }
        } catch (e) {
          console.log("error getting user data", e);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // process event data
  useEffect(() => {
    let yesRSVP = 0;
    let maybeRSVP = 0;
    let noRSVP = 0;

    const readEventData = async () => {
      const eventDataPromise = eventsList.map(async (eventData: EventData) => {
        const eventRSVP = eventData.RSVP;
        if (user && eventRSVP) {
          const status = eventRSVP[user.uid];

          if (status == "yes") {
            yesRSVP += 1;
          } else if (status == "maybe") {
            maybeRSVP += 1;
          } else if (status == "no") {
            noRSVP += 1;
          }
        }
      });
      await Promise.all(eventDataPromise);
    };

    readEventData();

    setRSVPStatuses([yesRSVP, maybeRSVP, noRSVP]);
  }, [eventsList, user]);

  return (
    <div className="m-2">
      <p>Disclaimer this page is very much not complete I know it looks horrendous please don&apos;t judge it yet thanks</p>
      <Button onClick={() => router.push("/profile")}>back</Button>
      {user && (
        <div>
          <Label className="font-bold text-xl">Hello, {username}!</Label>

          <div className="flex w-full">
            <div className="p-2 m-2">
              <Label className="font-bold text-lg">Workout Stats</Label>
              {loadingWorkouts && <p>Loading workouts...</p>}
              {!loadingWorkouts && (
                <div>
                  <h2>list of workouts:</h2>
                  {workoutList.map((workoutData, i) => (
                    <p key={i}>{workoutData.name}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 m-2">
              <Label className="font-bold text-lg">Event Stats</Label>
              {loadingEvents && <p>Loading events...</p>}
              {!loadingEvents && (
                <div>
                  <h2>total events: {totalEvents}</h2>
                  <h2>group events: {groupEvents}</h2>

                  <h2>events attended: {rsvpStatuses[0]}</h2>
                  <h2>events missed: {rsvpStatuses[2]}</h2>
                  <h2>events possibly attended (maybe): {rsvpStatuses[1]}</h2>

                  <h2>list of events:</h2>
                  {eventsList.map((eventData, i) => (
                    <p key={i}>{eventData.name}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!user && <p>Error: user not authenticated.</p>}
    </div>
  );
}
