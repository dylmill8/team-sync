"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocs, query, where } from "firebase/firestore";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig"; 
import { useRouter, useSearchParams } from "next/navigation";

interface Exercise {
    name: string;
    reps: string;
    sets: string;
    time: string;
  }

export default function Workout() {
    const [workoutName, setWorkoutName] = useState("Workout Name");
    const [description, setDescription] = useState("Workout Description");
    const [exercises, setExercises] = useState<string[]>([]);

    const router = useRouter();
    const docId = useSearchParams().get("docId"); // Get the event docId from the URL

    /* Save Workout Button */
    const handleSaveWorkout = async () => {
        try {
            await addDoc(collection(db, "Workouts"), {
                name: workoutName,
                description: description,
                exercises: exercises,
            });

            alert("Workout saved successfully!");
            //router.push(`/workout/view?docId=${eventDocRef.id}`);
        } catch (error) {
            console.error("Error saving workout", error);
            alert("There was an error saving the workout.");
        }
    };

    /* Handling changing fields */
    const handleWorkoutNameChange = (e) => {
        setWorkoutName(e.target.value);
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
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

                {/* Workout Description */}
                <div className="mb-4">
                        <Textarea
                            placeholder="Description"
                            onChange={handleDescriptionChange}
                            className="w-full h-24 bg-gray-100 p-2 rounded-md"
                        />
                </div>

                {/* Exercise */}
                
            </CardContent>
            <Button onClick={handleSaveWorkout} className="mt-4 w-full bg-blue-600 text-white py-2 rounded">
                    Save Workout
                </Button>
        </Card>
    </div>
    );
}