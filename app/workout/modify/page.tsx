"use client";

import { useState, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "../../../utils/firebaseConfig";
import { doc, getDoc, updateDoc, collection, addDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { firebaseApp } from "@/utils/firebaseConfig";
import { getAuth } from "firebase/auth";

interface Workout {
  id: string;
  name: string;
  exercises: Exercise[]; 
  Map: { [userId: string]: string };
  eventId: string;
  workoutDuration: string;
}

interface Exercise {
  name: string;
  duration: string;
} 

const ModifyWorkoutPage = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [personalLogs, setPersonalLogs] = useState<string[]>([]);
  const [workout, setWorkout] = useState<Workout | null>(null); // Specify the type for workout
  const router = useRouter();
  const searchParams = useSearchParams();
  const workoutId = searchParams?.get("workoutId") ?? ""; // Get workoutId from query params
  const auth = getAuth(firebaseApp);
  const userId = auth.currentUser?.uid; // Get userId from query params

  const [eventOwner, setEventOwner] = useState<string | null>(null); // State to store the event owner

  // Fetch the workout document
  useEffect(() => {
    const fetchWorkout = async () => {
      if (workoutId) {
        const workoutDocRef = doc(db, "Workouts", workoutId);
        const workoutDocSnap = await getDoc(workoutDocRef);
        if (workoutDocSnap.exists()) {
          const workoutData = workoutDocSnap.data();
          const exerciseList = workoutData.exercises && Array.isArray(workoutData.exercises) ? workoutData.exercises : [];

          // Manually set the fields of the workout object
          const workoutObject: Workout = {
            id: workoutDocSnap.id, // Using doc id as the workout ID
            name: workoutData.name || "",
            exercises: exerciseList.map((exercise) => ({
              name: exercise.name || "", // Ensure there's always a name, fallback to an empty string
              duration: exercise.duration || "0" // Ensure there's always a duration, fallback to "0"
          })),
            Map: workoutData.Map || {},
            eventId: workoutData.eventId || "",
            workoutDuration: workoutData.workoutDuration
          };
          setWorkout(workoutObject); // Manually set the workout object

          setExercises(workoutDocSnap.data().exercises || []);
          setPersonalLogs(new Array(exerciseList.length).fill("")); // Initialize personalLogs with empty strings
        }
      }
    };

    fetchWorkout();
  }, [workoutId]);

  // Fetch the event owner
  useEffect(() => {
    const fetchEventOwner = async () => {
      if (workout?.eventId) {
        const eventDocRef = doc(db, "Event", workout.eventId);
        const eventDocSnap = await getDoc(eventDocRef);
        if (eventDocSnap.exists()) {
          setEventOwner(eventDocSnap.data()?.owner);
        } else {
          console.log("Event not found for eventId:", workout.eventId);
          setEventOwner(null);
        }
      }
    };

    if (workout) {
      fetchEventOwner();
    }
  }, [workout?.eventId, workout]);

  // Fetch log if user is already mapped
  useEffect(() => {
    const fetchUserLog = async () => {
      if (workout && userId) {
        const userLogRef = workout.Map?.[userId];
        if (userLogRef) {
          const logDocRef = doc(db, "Logs", userLogRef);
          const logDocSnap = await getDoc(logDocRef);
          if (logDocSnap.exists()) {
            setPersonalLogs(logDocSnap.data().descriptions || []);
          }
        }
      }
    };

    if (workout) {
      fetchUserLog();
    }
  }, [workout, userId]);

  // Handle personal description change
  const handlePersonalDescriptionChange = (index: number, value: string) => {
    const updatedLogs = [...personalLogs];
    updatedLogs[index] = value;
    setPersonalLogs(updatedLogs);
  };

  // Save personal logs and update workout with map
  const handleSaveLogs = async () => {
    if (!userId) {
      alert("Error: Missing user ID.");
      return;
    }
    if (!workoutId) {
      alert("Error: Missing workout ID.");
      return;
    }
    if (!workout) return;

    try {
      // Create log document
      const logsRef = await addDoc(collection(db, "Logs"), {
        descriptions: personalLogs,
      });

      // Update workout with the new Map field if it doesn't exist
      const workoutRef = doc(db, "Workouts", workoutId);
      const workoutSnap = await getDoc(workoutRef);
      const map = workoutSnap.exists() ? workoutSnap.data().Map || {} : {};

      // Add user log reference to the map
      map[userId] = logsRef.id;

      // Update the workout document
      await updateDoc(workoutRef, {
        Map: map,
      });

      const userRef = doc(db, "Users", userId);
      const userSnap = await getDoc(userRef);
      const workouts = userSnap.exists() ? userSnap.data().workouts || [] : [];

      // Add the workoutId if it isn't already in the array
      if (!workouts.includes(workoutId)) {
        workouts.push(workoutId);
      }

      // Update the user document with the new workouts array
      await updateDoc(userRef, {
        workouts: workouts,
      });
      const eventId = workout.eventId;

      // Route to the event view page with the event's docId or past workouts
      if (eventOwner) {
        router.push(`/event/view?docId=${eventId}`);
      } else {
        router.push("/profile/pastworkouts");
      }
    } catch (error) {
      console.error("Error saving logs", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg p-6 shadow-lg bg-white rounded-xl">
        <h2 className="text-2xl font-semibold mb-4">My Workout Log</h2>
        {workout ? (
          <>
            <h2 className="text-2xl font-semibold mb-4">{workout.name || ""}</h2>

            {/* Display the workout duration */}
            <div className="text-lg mb-4">
              <strong>Workout Duration: </strong>
              {workout.workoutDuration === "" ? "0" : workout.workoutDuration || "0"} minutes
            </div>
          </>
        ) : (
          <div className="text-red-500">Workout data is not available.</div>
        )}

        {exercises.map((exercise, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={`${exercise.name}${exercise.duration ? ` (${exercise.duration} mins)` : ""}`}
                readOnly
                className="flex-grow bg-gray-100 p-2 rounded-md"
              />
            </div>
            <textarea
              placeholder={`Describe what you did for "${exercise.name}"`}
              value={personalLogs[index] || ""}
              onChange={(e) =>
                handlePersonalDescriptionChange(index, e.target.value)
              }
              className="w-full mt-2 p-2 bg-gray-100 rounded-md"
            />
          </div>
        ))}

        {/* Conditional button based on event owner */}
        <div className="flex justify-end mb-4">
          {eventOwner ? (
            Array.isArray(eventOwner) ? (
              eventOwner.includes(userId) ? (
                <Button
                  onClick={() => router.push(`/workout/settings?workoutId=${workoutId}`)}
                  className="bg-green-500 text-white px-4 py-2 rounded mr-2" // Added mr-2 for spacing
                >
                  Workout Settings
                </Button>
              ) : null
            ) : (
              eventOwner === userId ? (
                <Button
                  onClick={() => router.push(`/workout/settings?workoutId=${workoutId}`)}
                  className="bg-green-500 text-white px-4 py-2 rounded mr-2" // Added mr-2 for spacing
                >
                  Workout Settings
                </Button>
              ) : null
            )
          ) : null}
          <Button
            onClick={handleSaveLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save Logs
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function ModifyWorkout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ModifyWorkoutPage />
    </Suspense>
  );
}
