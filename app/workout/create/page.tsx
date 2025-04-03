"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { db } from "../../../utils/firebaseConfig"; 
import { useRouter, useSearchParams } from "next/navigation";
import { doc, updateDoc, arrayUnion, addDoc, collection } from "firebase/firestore";

export default function Workout() {
    const [workoutName, setWorkoutName] = useState("Workout Name");
    const [exercises, setExercises] = useState<string[]>([]);

    const router = useRouter();
    const docId = useSearchParams().get("docId"); // Get the event docId from the URL

    /* Save Workout Button */
    const handleSaveWorkout = async () => {
        if (!docId) {
            alert("Error: Missing event ID.");
            return;
        }
        try {
            const workoutRef = await addDoc(collection(db, "Workouts"), {
                name: workoutName,
                exercises: exercises.filter(ex => ex.trim() !== ""), // Remove empty exercises
                eventId: docId, // Include the event's docId
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

    /* Handling changing fields */
    const handleWorkoutNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWorkoutName(e.target.value);
    };

    const handleExerciseChange = (index: number, value: string) => {
        const updatedExercises = [...exercises];
        updatedExercises[index] = value;
        setExercises(updatedExercises);
    };

    const addExercise = () => {
        if (exercises.length < 10) {
            setExercises([...exercises, ""]);
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

            {/* Workout Name */}
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="Workout Name"
                        onChange={handleWorkoutNameChange}
                        className="flex-grow font-semibold text-lg bg-gray-100 p-2 rounded-md"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {/* Exercise Fields */}
                {exercises.map((exercise, index) => (
                    <div key={index} className="flex items-center gap-2 mt-2">
                        <Input
                            type="text"
                            placeholder={`Exercise ${index + 1}`}
                            value={exercise}
                            onChange={(e) => handleExerciseChange(index, e.target.value)}
                            className="flex-grow bg-gray-100 p-2 rounded-md"
                        />
                        <Button
                            onClick={() => removeExercise(index)}
                            className="bg-red-500 text-white px-2 py-1 rounded"
                            disabled={exercises.length === 1} // Disable if only one exercise
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
}