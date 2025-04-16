"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/utils/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface Workout {
  eventId: string;
  exercises: string[];
  name: string;
}

const PastWorkoutsPage = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        // Step 1: Fetch user document to get their workout references
        const userRef = doc(db, "Users", "userId"); // Replace "userId" with the actual user ID
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          console.log("User not found");
          return;
        }
        
        const userData = userDoc.data();
        const workoutRefs = userData?.workouts || []; // Extract the array of workout document references

        // Step 2: Fetch workouts using the document references
        const workoutsList: Workout[] = [];
        for (const workoutRef of workoutRefs) {
          const workoutDoc = await getDoc(doc(db, "Workouts", workoutRef));
          if (workoutDoc.exists()) {
            workoutsList.push({
              eventId: workoutDoc.id,
              exercises: workoutDoc.data()?.exercises || [],
              name: workoutDoc.data()?.name || "No name",
            });
          }
        }

        setWorkouts(workoutsList);
      } catch (error) {
        console.error("Error fetching workouts: ", error);
      }
    };

    fetchWorkouts();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">Past Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-4 mx-1">
            {workouts.length === 0 && (
              <Label className="block text-center">No past workouts available.</Label>
            )}
            {workouts.map((workout) => (
              <Card key={workout.eventId} className="mb-4">
                <CardHeader>
                  <CardTitle className="text-lg text-center">{workout.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center mt-4">
                    <Button
                      className="mx-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => console.log(`Viewing workout ${workout.name}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function PastWorkouts() {
  return (
    <Suspense fallback={<div>Loading past workouts...</div>}>
      <PastWorkoutsPage />
    </Suspense>
  );
}
