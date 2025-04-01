"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import { getDoc, doc, DocumentData } from "@firebase/firestore";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";
import UserLog from "@/components/ui/user-log";

export default function GroupLogs() {
  const router = useRouter();

  const workoutId = useSearchParams().get("workoutId") || "";

  const [workoutData, setWorkoutData] = useState<DocumentData | null>(null);
  const [userMap, setUserMap] = useState<{ [key: string]: string } | null>(
    null
  );
  const [exerciseList, setExerciseList] = useState<string[] | null>(null);
  const [eventData, setEventData] = useState<DocumentData | null>(null);

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
    <div className="flex flex-col items-center mt-4 mx-5">
      <Label className="text-2xl font-bold mb-1">
        {workoutData?.name || "Fetching workout..."}
      </Label>
      <Label className="text-m mb-3">
        Event: {eventData?.name || "Fetching event..."}
      </Label>
      <Button
        className="w-1/4 mb-5 bg-blue-600 hover:bg-blue-700"
        onClick={() => router.push(`/event/view?docId=${workoutData?.eventId}`)}
      >
        Back to Event
      </Button>

      <Tabs defaultValue="exercise" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger className="w-full" value="exercise">
            View By Exercise
          </TabsTrigger>
          <TabsTrigger className="w-full" value="member">
            View By Member
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exercise">
          {!exerciseList && <Label>Loading exercises...</Label>}
          {exerciseList && <Label>Exercise list is not null.</Label>}
        </TabsContent>

        <TabsContent value="member">
          {!userMap && <Label>Loading members...</Label>}
          {userMap &&
            Object.keys(userMap).map((userId) => (
              <UserLog
                key={userId}
                userId={userId}
                logId={userMap[userId]}
                exerciseList={exerciseList ? exerciseList : []}
              ></UserLog>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
