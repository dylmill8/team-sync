"use client";

import { useState, useEffect, Suspense } from "react";
import { db, firebaseApp } from "@/utils/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";



interface Workout {
  id?: string;
  name: string;
  exercises?: Exercise[]; // Include exercises in the Workout interface
  workoutDuration: string;
  eventId?: string; // Add eventId to the Workout interface
  eventStart?: string;
}
interface Exercise {
  name?: string;
  duration?: string;
}

const PastWorkoutsPage = () => {
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const [uid, setUid] = useState<string | null>(null);
  const [pastWorkouts, setPastWorkouts] = useState<Workout[]>([]);
  const [sortOption, setSortOption] = useState<"duration" | "date">("date");
  const sortedWorkouts = [...pastWorkouts].sort((a, b) => {
    if (sortOption === "duration") {
      const durA = parseInt(a.workoutDuration || "0", 10);
      const durB = parseInt(b.workoutDuration || "0", 10);
      return durB - durA; // Longest first
    } else if (sortOption === "date") {
      const timeA = a.eventStart ? new Date(a.eventStart).getTime() : NaN;
      const timeB = b.eventStart ? new Date(b.eventStart).getTime() : NaN;

      const isValidA = !isNaN(timeA);
      const isValidB = !isNaN(timeB);

      if (!isValidA && !isValidB) return 0;
      if (!isValidA) return 1; // A is invalid, push down
      if (!isValidB) return -1; // B is invalid, push down

      return timeB - timeA;
    }
    return 0;
  });


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid);
      } else {
        setUid(null);
        // Optionally redirect to login
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [auth]);

  useEffect(() => {
    const fetchPastWorkouts = async () => {
      //console.log(uid);
      if (uid) {
        const userDocRef = doc(db, "Users", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const workoutRefs = userData?.workouts || [];

          // Parallel fetching for workouts
          const workoutPromises = workoutRefs.map(async (workoutRef: string) => {
            try {
              const workoutDocSnap = await getDoc(doc(db, "Workouts", workoutRef));
              if (workoutDocSnap.exists()) {
                const workoutData = workoutDocSnap.data() as Workout;
                if (workoutData.name && workoutData.eventId) {
                  const eventDocSnap = await getDoc(doc(db, "Event", workoutData.eventId));
                  let eventStart: string | undefined;
                  if (eventDocSnap.exists()) {
                    const eventData = eventDocSnap.data();
                    // Check if 'start' is a Firebase Timestamp object
                    if (eventData?.start?.toDate) {
                      eventStart = eventData.start.toDate().toISOString(); // Convert to ISO string for easier handling
                    }
                  }
                  return {
                    id: workoutDocSnap.id,
                    name: workoutData.name,
                    workoutDuration:
                      workoutData.workoutDuration === "" || workoutData.workoutDuration === undefined
                        ? "0"
                        : workoutData.workoutDuration,
                    exercises: workoutData.exercises || [],
                    eventId: workoutData.eventId,
                    eventStart: eventStart, // Include the event start timestamp
                  }
                };
              } else {
                console.warn("Workout document not found:", workoutRef);
              }
            } catch (error) {
              console.error("Error fetching workout:", workoutRef, error);
            }
            return null; // Return null for failed fetches
          });

          const settledWorkouts = await Promise.all(workoutPromises);
          const validWorkouts = settledWorkouts.filter((workout) => workout !== null) as Workout[];
          setPastWorkouts(validWorkouts);
        } else {
          console.error("User document not found:", uid);
        }
      }
    };

    fetchPastWorkouts();
  }, [uid]); // Fetch workouts when uid changes

  const handleWorkoutClick = (workoutId: string) => {

    // Add conditional search pram
    router.push(`/workout/modify?workoutId=${workoutId}&fromPastWorkoutsPage=true`);
  };

  const formatDate = (timestamp: string | undefined): string => {
    if (!timestamp) {
      return "Date not available";
    }
    try {
      const date = new Date(timestamp);
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 py-6">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">

        {/* Top Row: Title and Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Past Workouts</h2>
          <Button 
            onClick={() => router.push("/profile")} 
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded ml-4"
          >
            Back to Profile
          </Button>
        </div>
        <div className="mb-4">
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">Sort by:</label>
          <select
            id="sort"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "duration" | "date")}
            className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm p-2 text-sm"
          >
            <option value="date">Date (Most recent)</option>
            <option value="duration">Duration (Longest)</option>
          </select>
          
        </div>
        
        {pastWorkouts.length > 0 ? (
          <ul>
              {sortedWorkouts.map((workout) => (
              <li
                key={workout.id}
                className="mb-4 p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  if (workout.id) {
                    handleWorkoutClick(workout.id);
                  } else {
                    console.warn("Workout ID is undefined for:", workout);
                    // Optionally handle this case (e.g., don't navigate)
                  }
                }}
              >
                <strong className="block font-medium text-gray-700">{workout.name}</strong>
                <span className="block text-gray-600 text-sm mb-1">
                  Date: {formatDate(workout.eventStart)}
                </span>
                <span className="text-gray-600 text-sm">Duration: {workout.workoutDuration} minutes</span>
                {workout.exercises && workout.exercises.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 text-sm mb-1">Exercises:</h3>
                    <ul className="list-disc pl-4">
                      {workout.exercises.map((exercise, index) => (
                        <li key={index} className="text-gray-600 text-sm">
                          {exercise.name && exercise.name !== "" ? (
                            `${exercise.name} ${exercise.duration ? `(${exercise.duration} mins)` : ""}`
                          ) : (
                            `Exercise ${index + 1} ${exercise.duration ? `(${exercise.duration} mins)` : ""}`
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">{uid ? "No past workouts found." : "Loading user data..."}</p>
        )}
      </div>
    </div>
  );
};

export default function PastWorkouts() {
  return (
    <Suspense fallback={<div>Loading Past Workouts...</div>}>
      <PastWorkoutsPage />
    </Suspense>
  );
}