"use client";

import { useState, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "../../../utils/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

interface Exercise {
  name: string;
  duration: string;
}

interface Workout {
  id?: string;
  name: string;
  exercises: Exercise[];
  workoutDuration: string;
}

const WorkoutSettingsPage = () => {
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([{ name: "", duration: "" }]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const workoutId = searchParams?.get("workoutId") ?? "";

  useEffect(() => {
    const fetchWorkoutDetails = async () => {
      if (workoutId) {
        const workoutDocRef = doc(db, "Workouts", workoutId);
        const workoutDocSnap = await getDoc(workoutDocRef);
        if (workoutDocSnap.exists()) {
          const workoutData = workoutDocSnap.data() as Workout;
          setWorkoutName(workoutData.name);
          setWorkoutDuration(workoutData.workoutDuration);
          setExercises(workoutData.exercises || [{ name: "", duration: "" }]);
        } else {
          console.error("Workout not found:", workoutId);
          // Optionally redirect or show an error message
        }
      }
    };

    fetchWorkoutDetails();
  }, [workoutId]);

  const handleWorkoutNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkoutName(e.target.value);
  };

  const handleWorkoutDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkoutDuration(e.target.value);
  };

  const handleExerciseNameChange = (index: number, value: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], name: value };
    setExercises(updatedExercises);
  };

  const handleExerciseDurationChange = (index: number, value: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], duration: value };
    setExercises(updatedExercises);
  };

  const addExercise = () => {
    setExercises([...exercises, { name: "", duration: "" }]);
  };



  const handleSaveChanges = async () => {
    if (!workoutId) {
      alert("Workout ID is missing.");
      return;
    }

    try {
      const workoutDocRef = doc(db, "Workouts", workoutId);
      await updateDoc(workoutDocRef, {
        name: workoutName,
        workoutDuration: workoutDuration,
        exercises: exercises,
      });
      alert("Workout settings updated successfully!");
      router.push(`/workout/modify?workoutId=${workoutId}`); // Or wherever you want to redirect
    } catch (error) {
      console.error("Error updating workout settings:", error);
      alert("Failed to update workout settings.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <h2 className="text-2xl font-semibold mb-4">Workout Settings</h2>

        <div className="mb-4">
          <label htmlFor="workoutName" className="block text-gray-700 text-sm font-bold mb-2">
            Workout Name:
          </label>
          <Input
            type="text"
            id="workoutName"
            value={workoutName}
            onChange={handleWorkoutNameChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="workoutDuration" className="block text-gray-700 text-sm font-bold mb-2">
            Workout Duration (minutes):
          </label>
          <Input
            type="number"
            id="workoutDuration"
            value={workoutDuration}
            min={0}
            onChange={handleWorkoutDurationChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Exercises:
          </label>
          {exercises.map((exercise, index) => (
            <div key={index} className="flex items-center mb-2">
              <Input
                type="text"
                placeholder="Exercise Name"
                value={exercise.name}
                onChange={(e) => handleExerciseNameChange(index, e.target.value)}
                className="shadow appearance-none border rounded w-1/2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
              />
              <Input
                type="number"
                placeholder="Duration (minutes)"
                min={0}
                value={exercise.duration}
                onChange={(e) => handleExerciseDurationChange(index, e.target.value)}
                className="shadow appearance-none border rounded w-1/4 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
              />
            </div>
          ))}
          <Button type="button" onClick={addExercise} className="bg-green-500 text-white py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2">
            Add Exercise
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveChanges} className="bg-blue-500 text-white py-2 px-4 rounded focus:outline-none focus:shadow-outline">
            Save Changes
          </Button>
          <Button onClick={() => router.back()} className="bg-gray-400 text-white py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-2">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function WorkoutSettings() {
  return (
    <Suspense fallback={<div>Loading Workout Settings...</div>}>
      <WorkoutSettingsPage />
    </Suspense>
  );
}