
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "../../../utils/firebaseConfig";
import { doc, getDoc, updateDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

export default function ModifyWorkout() {
  const [exercises, setExercises] = useState<string[]>([]);
  const [personalLogs, setPersonalLogs] = useState<string[]>([]);
  const [workout, setWorkout] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const workoutId = searchParams.get('workoutId');  // Get workoutId from query params
  const userId = searchParams.get('userId');  // Get userId from query params

  // Fetch the workout document
  useEffect(() => {
    const fetchWorkout = async () => {
      if (workoutId) {
        const workoutDocRef = doc(db, "Workouts", workoutId);
        const workoutDocSnap = await getDoc(workoutDocRef);
        if (workoutDocSnap.exists()) {
          const workoutData = workoutDocSnap.data();
          const exerciseList = workoutData.exercises || [];
          setWorkout(workoutDocSnap.data());
          setExercises(workoutDocSnap.data().exercises || []);
          setPersonalLogs(new Array(exerciseList.length).fill("")); // Initialize personalLogs with empty strings
        }
      }
    };

    fetchWorkout();
  }, [workoutId]);

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
      let workouts = userSnap.exists() ? userSnap.data().workouts || [] : [];
      
      // Add the workoutId if it isn't already in the array
      if (!workouts.includes(workoutId)) {
        workouts.push(workoutId);
      }

      // Update the user document with the new workouts array
      await updateDoc(userRef, {
        workouts: workouts,
      });
      const eventId = workout.eventId;

      // Route to the event view page with the event's docId
      router.push(`/event/view?docId=${eventId}`);

    } catch (error) {
      alert("Error saving logs.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg p-6 shadow-lg bg-white rounded-xl">
        <h2 className="text-2xl font-semibold mb-4">Modify Workout</h2>

        {exercises.map((exercise, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={exercise}
                readOnly
                className="flex-grow bg-gray-100 p-2 rounded-md"
              />
            </div>
            <textarea
              placeholder={`Describe what you did for ${exercise}`}
              value={personalLogs[index] || ""}
              onChange={(e) => handlePersonalDescriptionChange(index, e.target.value)}
              className="w-full mt-2 p-2 bg-gray-100 rounded-md"
            />
          </div>
        ))}

        <div className="flex justify-end">
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
}