"use client";

import { firebaseApp, db } from "@/utils/firebaseConfig";
import { getAuth, User } from "firebase/auth";
import { useState, useEffect } from "react";
import { doc, DocumentReference, getDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  start: Timestamp;
  end: Timestamp;
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

  const [loadingWorkouts, setLoadingWorkouts] = useState<boolean>(true);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // events stats
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [groupEvents, setGroupEvents] = useState<number>(0);
  const [rsvpStatuses, setRSVPStatuses] = useState<number[]>([0, 0, 0]);
  const [upcomingEvents, setUpcomingEvents] = useState<number>(0);
  const [pastEvents, setPastEvents] = useState<number>(0);

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

  // process and calculate event data
  useEffect(() => {
    let yesRSVP = 0;
    let maybeRSVP = 0;
    let noRSVP = 0;

    let upcoming = 0;
    let past = 0;

    const readEventData = async () => {
      const eventDataPromise = eventsList.map(async (eventData: EventData) => {
        // rsvp
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

        // upcoming and past events
        if (eventData.start.toDate() > new Date()) {
          upcoming += 1;
        }
        if (eventData.end.toDate() < new Date()) {
          past += 1;
        }
      });
      await Promise.all(eventDataPromise);
    };

    readEventData();

    setRSVPStatuses([yesRSVP, maybeRSVP, noRSVP]);
    setUpcomingEvents(upcoming);
    setPastEvents(past);
  }, [eventsList, user]);

  return (
    <div className="m-2">
      <p>
        Disclaimer this page is very much not complete I know it looks
        horrendous please don&apos;t judge it yet thanks
      </p>
      <Button onClick={() => router.push("/profile")}>back</Button>
      {user && (
        <div className="">
          <Label className="font-bold text-xl p-1 m-1">
            {username}&apos;s statistics.
          </Label>

          <div className="">
            <div className="p-1 m-1">
              <Card className="l">
                <CardHeader>
                  <CardTitle className="font-bold text-lg">
                    Event Statistics
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {loadingEvents && <p>Loading events...</p>}
                  {!loadingEvents && (
                    <div className="flex">
                      <Card className="mr-3">
                        <CardHeader>
                          <CardTitle>Overview</CardTitle>
                        </CardHeader>

                        <CardContent className="flex flex-col">
                          <Label className="mb-1">
                            Total events: {totalEvents}
                          </Label>
                          <Label className="mb-3">Group events: {groupEvents}</Label>
                          <Label className="mb-1">Upcoming events: {upcomingEvents}</Label>
                          <Label>Past events: {pastEvents}</Label>
                        </CardContent>
                      </Card>

                      <Card className="mr-2">
                        <CardHeader>
                          <CardTitle>RSVP Statistics</CardTitle>
                        </CardHeader>

                        <CardContent className="flex flex-col">
                          <Label className="mb-1">Events Attended/Attending: {rsvpStatuses[0]}</Label>
                          <Label className="mb-1">Events Missed/Missing: {rsvpStatuses[2]}</Label>
                          <Label>Events Possibly Attended/Attending: {rsvpStatuses[2]}</Label>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button>Route to events or something?</Button>
                </CardFooter>
              </Card>
            </div>

            <div className="p-1 m-1">
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-lg">
                    Workout Statistics
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {loadingWorkouts && <Label>Loading workouts...</Label>}

                  {!loadingWorkouts && (
                    <div>
                      <h2>list of workouts:</h2>
                      {workoutList.map((workoutData, i) => (
                        <p key={i}>{workoutData.name}</p>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button>Go to workouts button?</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      )}

      {!user && <p>Error: user not authenticated.</p>}
    </div>
  );
}
