"use client";
import { Suspense, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardTitle, Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { db } from "../../../utils/firebaseConfig";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
  collection,
} from "firebase/firestore";

const WorkoutPage = () => {
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [exercises, setExercises] = useState<
    { name: string; duration: string }[]
  >([{ name: "", duration: "" }]);

  const router = useRouter();
  const docId = useSearchParams()?.get("docId") ?? ""; // Get the event docId from the URL

  /* Save Workout Button */
  const handleSaveWorkout = async () => {
    if (!docId) {
      alert("Error: Missing event ID.");
      return;
    }
    try {
      const workoutRef = await addDoc(collection(db, "Workouts"), {
        name: workoutName,
        exercises: exercises.filter((ex) => ex.name.trim() !== ""), // changed this btw
        eventId: docId, // Include the event's docId
        workoutDuration: workoutDuration
      });

      alert("Workout saved successfully!");

      const eventRef = doc(db, "Event", docId);

      // Step 3: Update event's workouts array by adding the new workout ID
      await updateDoc(eventRef, {
        workouts: arrayUnion(workoutRef.id),
      });
      router.push(`/event/view?docId=${docId}`);
    } catch (error) {
      console.error("Error saving", error);
      alert("There was an error saving the workout.");
    }
  };

  const handleExerciseChange = (
    index: number,
    field: "name" | "duration",
    value: string
  ) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const addExercise = () => {
    if (exercises.length < 10) {
      setExercises([...exercises, { name: "", duration: "" }]);
    }
  };

  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-lg p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">Create Workout</CardTitle>
        </CardHeader>      
        <CardContent>
          <div className="mb-4">
              <Label className="text-sm font-medium">Workout Name</Label>
              <Input 
                type="text" 
                placeholder="Enter workout name" 
                value={workoutName} 
                onChange={(e) => setWorkoutName(e.target.value)}
                className="mt-1"
              />
          </div>
          <div className="mb-4">
            <label htmlFor="workoutDuration" className="block text-sm font-medium text-gray-700 mb-1">
              Workout Duration (minutes)
            </label>
            <div className="w-20">
              <Input
                id="workoutDuration"
                type="number"
                placeholder="Workout duration"
                min={0}
                step={30}
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Exercise Fields */}
          {exercises.map((exercise, index) => (
            <div key={index} className="flex items-center gap-2 mt-2">
              <Input
                type="text"
                placeholder={`Exercise ${index + 1}`}
                value={exercise.name}
                onChange={(e) =>
                  handleExerciseChange(index, "name", e.target.value)
                }
                className="flex-grow bg-gray-100 p-2 rounded-md"
              />
              <Input
                type="number"
                placeholder="Minutes"
                value={exercise.duration}
                onChange={(e) =>
                  handleExerciseChange(index, "duration", e.target.value)
                }
                className="w-20 bg-gray-100 p-2 rounded-md"
              />
              <Button
                onClick={() => removeExercise(index)}
                className="bg-red-500 text-white px-2 py-1 rounded"
                disabled={exercises.length === 1}
              >
                Remove
              </Button>
            </div>
          ))}

          {/* Buttons */}
          <div className="mt-4 flex justify-between">
            <Button
              onClick={addExercise}
              disabled={exercises.length >= 10}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Add Exercise
            </Button>
            <Button
              onClick={handleSaveWorkout}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save Workout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Workout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkoutPage />
    </Suspense>
  );
}
