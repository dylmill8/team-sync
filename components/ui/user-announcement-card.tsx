"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { db, firebaseApp } from "@/utils/firebaseConfig";
import {
  doc,
  DocumentData,
  DocumentReference,
  getDoc,
  Timestamp,
} from "firebase/firestore";

interface AnnouncementData {
  title?: string;
  groupRef?: any;
  body?: string;
  createdAt?: Timestamp;
}

function UserAnnouncementCard({ announcementRef }) {
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("");
  const [body, setBody] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const fetchAnnouncementData = async () => {
      try {
        const docSnap = await getDoc(announcementRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as AnnouncementData;

          setTitle(data.title || "");
          setBody(data.body || "");
          setTime(data.createdAt?.toDate().toLocaleString() || "");

          if (data.groupRef) {
            const groupDoc = await getDoc(data.groupRef);
            if (groupDoc.exists()) {
              const groupData = groupDoc.data();
              setGroup(groupData.name || "Unknown Group");
            }
          }
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching announcement data:", error);
      }
    };

    fetchAnnouncementData();
  }, [announcementRef]);

  return (
    <div className="flex items-center justify-center mt-3">
      <Card className="w-full max-w-md px-3 my-0 py-0 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            <Label>Group: {group}</Label>
          </CardDescription>
        </CardHeader>

        {body && (
          <CardContent>
            <Label>{body}</Label>
          </CardContent>
        )}

        <CardFooter>
          <Label>Posted at: {time}</Label>
        </CardFooter>
      </Card>
    </div>
  );
}

export default UserAnnouncementCard;
