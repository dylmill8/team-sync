"use client";

import "./event-view.css";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import RSVPView from "@/components/ui/rsvp-card";
import RSVPStatus from "@/components/ui/rsvp-status";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, firebaseApp } from "../../../utils/firebaseConfig";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import { ScrollArea } from "@/components/ui/scroll-area";

const ViewEventPage = () => {
  const auth = getAuth(firebaseApp);
  const [uid, setUid] = useState("");

  const [data, setData] = useState<DocumentData | null>(null);
  const docId = useSearchParams()?.get("docId") ?? "";
  const [loading, setLoading] = useState(true);
  const [canModify, setCanModify] = useState(false);

  // workout related data
  const [workoutData, setWorkoutData] = useState<string[]>([]);
  const [workoutCount, setWorkoutCount] = useState<number>(0);
  const [workoutNameList, setWorkoutNameList] = useState<string[]>([]);
  const [workoutDict, setWorkoutDict] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // use effect for fetching workout data
  useEffect(() => {
    const parseWorkoutData = async () => {
      const nameList = [];
      const dict: { [key: string]: string } = {};
      for (const id in workoutData) {
        const workoutId = workoutData[id];
        const workoutDoc = doc(db, "Workouts", workoutId);
        const workoutSnap = await getDoc(workoutDoc);

        const workoutName = workoutSnap.data()?.name || "name not found";
        nameList.push(workoutName);
        dict[workoutName] = workoutId;
      }

      setWorkoutNameList(nameList);
      setWorkoutDict(dict);
    };

    parseWorkoutData();
  }, [workoutCount, workoutData]);

  // use effect for fetching data
  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) {
        return "";
      }

      const docRef = doc(db, "Event", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currData = docSnap.data();
        setData(currData);

        setWorkoutData(currData.workouts);
        setWorkoutCount(currData.workouts?.length || 0);

        setLoading(false);
      } else {
        console.log("data can't be found.");
      }
    };

    fetchDocument();
  }, [docId]);

  // set modify event permissions use effect
  useEffect(() => {
    const modifyPermissions = async () => {
      if (uid && data) {
        if (data.ownerType == "user") {
          setCanModify(true);
          return;
        }

        if (data.ownerType == "group") {
          const groupRef = doc(db, "Groups", data.owner);
          const groupDoc = await getDoc(groupRef);

          if (groupDoc.exists()) {
            const groupData = groupDoc.data();

            if (
              groupData.members[uid][1] == "leader" ||
              groupData.members[uid][1] == "owner"
            ) {
              setCanModify(true);
            }
          }
        }
      }
    };

    modifyPermissions();
  }, [uid, data]);

  // button navigations
  const router = useRouter();

  const toWorkout = async (workoutName: string) => {
    const workoutId = workoutDict[workoutName];

    if (data?.ownerType == "group" && canModify) {
      router.push(`/workout/group-view?workoutId=${workoutId}`);
    } else {
      router.push(`/workout/modify?workoutId=${workoutId}&userId=${uid}`);
    }

    // if (data?.ownerType == "group") {
    //   try {
    //     const groupRef = doc(db, "Groups", data?.owner);
    //     const groupDoc = await getDoc(groupRef);
    //     if (groupDoc.exists()) {
    //       const groupData = groupDoc.data();

    //       if (groupData.members[uid || ""][1] == "leader") {
    //         router.push(`/workout/group-view?workoutId=${workoutId}`);
    //         return;
    //       }
    //     }
    //   } catch (e) {
    //     console.log("there was an error getting the owner group", e);
    //   }
    // }
  };

  const modifyNavigation = () => {
    router.push(`/event/modify?docId=${docId}`);
  };

  const handleBack = () => {
    if (data?.ownerType == "group") {
      router.push(`/groups?docId=${data?.owner}`);
    } else {
      router.push("/calendar");
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }
  if (!data) {
    return <p>Error: event not found.</p>;
  }

  return (
    <div className="flex items-center justify-center">
      <Card className="mt-4 w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            {data?.name || "Error loading event name."}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-gray-600 mb-4">
            {data?.description || ""}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medium">
                Start Date:{" "}
                {data?.start
                  ? data.start.toDate().toLocaleString("en-US")
                  : "Error loading date."}
              </Label>
            </div>
          )}

          {data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medium">
                Start Date:{" "}
                {data?.start
                  ? data.start.toDate().toLocaleDateString("en-US")
                  : "Error loading start date."}
              </Label>
            </div>
          )}

          {!data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medmium">
                End Date:{" "}
                {data?.end
                  ? data.end.toDate().toLocaleString("en-US")
                  : "Error loading end date."}
              </Label>
            </div>
          )}

          {data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medium">
                End Date:{" "}
                {data?.end
                  ? data.end.toDate().toLocaleDateString("en-US")
                  : "Error loading end date."}
              </Label>
            </div>
          )}

          <div className="mb-1">
            <Label className="text-sm font-medium">
              Location: {data?.location || "N/A"}
            </Label>
          </div>

          <div className="mt-4 mb-2">
            <Label>Your RSVP Status:</Label>
            <RSVPStatus eventId={docId || ""}></RSVPStatus>
          </div>

          <div className="mt-2 mb-4">
            <Label>View RSVP Statuses:</Label>
            <RSVPView eventId={docId || ""}></RSVPView>
          </div>

          {workoutCount != 0 && (
            <div>
              <Label>Workouts:</Label>
              <ScrollArea className="h-28 w-full rounded-md border shadow-md mt-2 px-2 pt-1">
                {workoutNameList.map((item, index) => (
                  <Button
                    className="m-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
                    key={index}
                    onClick={() => toWorkout(item)}
                  >
                    {item}
                  </Button>
                ))}
              </ScrollArea>
            </div>
          )}

          {workoutCount == 0 && (
            <Label>There are no workouts for this event.</Label>
          )}
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleBack}
            className="my-2 mx-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-all"
          >
            Back
          </Button>
          {canModify && (
            <Button
              onClick={modifyNavigation}
              className="my-2 mx-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-all"
            >
              Modify
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default function ViewEvent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViewEventPage />
    </Suspense>
  );
}
