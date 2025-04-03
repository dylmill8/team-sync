"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import { getDoc, doc, DocumentData } from "@firebase/firestore";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";
import UserLog from "@/components/ui/user-log";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function GroupLogs() {
  const auth = getAuth();
  const router = useRouter();

  const workoutId = useSearchParams().get("workoutId") || "";

  const [workoutData, setWorkoutData] = useState<DocumentData | null>(null);
  const [userMap, setUserMap] = useState<{ [key: string]: string } | null>(
    null
  );
  const [exerciseList, setExerciseList] = useState<string[] | null>(null);
  const [eventData, setEventData] = useState<DocumentData | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const fetchWorkoutData = async () => {
      try {
        const workoutRef = doc(db, "Workouts", workoutId);
        const workoutDoc = await getDoc(workoutRef);
        if (workoutDoc.exists()) {
          setWorkoutData(workoutDoc.data());

          setUserMap(workoutDoc.data().Map);
          setExerciseList(workoutDoc.data().exercises);

          const eventId = workoutDoc.data().eventId;
          if (eventId) {
            const eventRef = doc(db, "Event", eventId);
            const eventDoc = await getDoc(eventRef);
            if (eventDoc.exists()) {
              setEventData(eventDoc.data());
            }
          }
        }
      } catch (e) {
        console.log("error fetching workout", e);
      }
    };

    fetchWorkoutData();
  }, []);

  if (!workoutId) {
    return <h1>Loading workout logs...</h1>;
  }

  return (
    <div className="mt-2 mx-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-center">
            {workoutData?.name || "Fetching workout..."}
          </CardTitle>
          <CardDescription className="text-center">
            Event: {eventData?.name || "Fetching event..."}
          </CardDescription>
        </CardHeader>

        <div className="flex flex-row items-center justify-center w-full">
          <Button
            className="w-1/4 mb-5 mx-1 bg-blue-600 hover:bg-blue-700"
            onClick={() =>
              router.push(`/event/view?docId=${workoutData?.eventId}`)
            }
          >
            Back to Event
          </Button>
          <Button
            className="w-1/4 mb-5 mx-1 bg-blue-600 hover:bg-blue-700"
            onClick={() =>
              router.push(
                `/workout/modify?workoutId=${workoutId}&userId=${userId}`
              )
            }
          >
            Back to My Log
          </Button>
        </div>

        <CardContent>
          {!userMap && (
            <Label>No members have recorded logs for this workout.</Label>
          )}
          {userMap &&
            Object.keys(userMap).map((userId) => (
              <UserLog
                key={userId}
                userId={userId}
                logId={userMap[userId]}
                exerciseList={exerciseList ? exerciseList : []}
              ></UserLog>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
