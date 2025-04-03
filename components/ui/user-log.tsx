"use client";

import { db } from "@/utils/firebaseConfig";
import { getDoc, doc, DocumentData } from "@firebase/firestore";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@radix-ui/react-label";
import { useState, useEffect } from "react";

interface UserLogProps {
  userId: string;
  logId: string;
  exerciseList: string[];
}

function UserLog({ userId, logId, exerciseList }: UserLogProps) {
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [logData, setLogData] = useState<DocumentData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "Users", userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (e) {
        console.log("error fetching user data", e);
      }
    };
    const fetchLogData = async () => {
      try {
        const logRef = doc(db, "Logs", logId);
        const logDoc = await getDoc(logRef);
        if (logDoc.exists()) {
          setLogData(logDoc.data());
        }
      } catch (e) {
        console.log("error fetching log data", e);
      }
    };

    fetchUserData();
    fetchLogData();
  }, [logId, userId]);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {userData?.username || "Loading user..."}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col">
          {[...Array(exerciseList.length)].map((_, i) => (
            <div key={i} className="grid mb-2">
              <Label className="text-sm font-bold">{exerciseList[i]}:</Label>
              <Label className="text-sm">
                {logData?.descriptions[i] || "No log for this exercise."}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserLog;
