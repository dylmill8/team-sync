"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EventData {
  name: string;
  allDay: boolean;
  start: { seconds: number };
  end: { seconds: number };
  description: string;
  location: string;
  docID: string;
  ownerType: string;
  owner: string;
  RSVP: { [key: string]: string };
  workouts: string;
}

export default function EventSummary() {
  const searchParams = useSearchParams();
  const eventId = searchParams?.get("docId") ?? ""; // Get event ID from URL
  const router = useRouter();

  const [event, setEvent] = useState<EventData | null>(null);
  const [workoutNames, setWorkoutNames] = useState<string[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const eventRef = doc(db, "Event", eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          const eventData = eventSnap.data();
          setEvent(eventSnap.data() as EventData);
          if (eventData.workouts?.length > 0) {
            fetchWorkoutNames(eventData.workouts);
          }
        } else {
          console.error("Event not found");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };

    fetchEvent();
  }, [eventId]);

  const fetchWorkoutNames = async (workoutIds: string[]) => {
    try {
      const workoutPromises = workoutIds.map(async (workoutId) => {
        const workoutRef = doc(db, "Workouts", workoutId);
        const workoutSnap = await getDoc(workoutRef);
        return workoutSnap.exists()
          ? workoutSnap.data().name
          : "Unknown Workout";
      });

      const names = await Promise.all(workoutPromises);
      setWorkoutNames(names);
    } catch (error) {
      console.error("Error fetching workout names:", error);
    }
  };

  if (!event) {
    return <p>Loading event details...</p>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card className="max-w-xl w-full p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{event.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Description:</strong> {event.description}
            </li>
            <li>
              <strong>Location:</strong> {event.location}
            </li>
            <li>
              <strong>Start:</strong>{" "}
              {new Date(event.start.seconds * 1000).toLocaleString()}
            </li>
            <li>
              <strong>End:</strong>{" "}
              {new Date(event.end.seconds * 1000).toLocaleString()}
            </li>
            <li>
              <strong>All Day:</strong> {event.allDay ? "Yes" : "No"}
            </li>
            <li>
              <strong>RSVP Status:</strong>
              {/* <ul className="list-disc pl-5">
                                <li>✅ Yes: {event.RSVP_yes?.length || 0}</li>
                                <li>❓ Maybe: {event.RSVP_maybe?.length || 0}</li>
                                <li>❌ No: {event.RSVP_no?.length || 0}</li>
                            </ul> */}
              <strong>Workouts:</strong>
              <ul className="list-disc pl-5">
                {workoutNames.length > 0 ? (
                  workoutNames.map((name, index) => <li key={index}>{name}</li>)
                ) : (
                  <li>No workouts assigned</li>
                )}
              </ul>
            </li>
          </ul>
          <Button
            onClick={() => router.push("/profile")}
            className="mt-6 bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back to Profile
          </Button>
        </CardContent>
      </Card>
      {/* Back Button */}
    </div>
  );
}
