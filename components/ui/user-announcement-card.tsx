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

import {
  DocumentReference,
  getDoc,
  Timestamp,
} from "firebase/firestore";

interface AnnouncementData {
  title: string;
  groupRef: DocumentReference;
  body: string;
  createdAt: Timestamp;
}

interface UserAnnouncementCardProps {
  announcementRef?: DocumentReference;
  announcementData?: AnnouncementData & { id: string };
}

function UserAnnouncementCard({ announcementRef, announcementData }: UserAnnouncementCardProps) {
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("");
  const [body, setBody] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const fetchAnnouncementData = async () => {
      if (announcementData) {
        // Use provided announcementData
        setTitle(announcementData.title || "");
        setBody(announcementData.body || "");
        setTime(announcementData.createdAt ? announcementData.createdAt.toDate().toLocaleString() : "");
        if (announcementData.groupRef) {
          const groupDoc = await getDoc(announcementData.groupRef);
          if (groupDoc.exists()) {
            const groupData = groupDoc.data() as { name?: string };
            setGroup(groupData.name || "Unknown Group");
          }
        }
      } else if (announcementRef) {
        // Fetch announcement data using announcementRef
        const docSnap = await getDoc(announcementRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as AnnouncementData;
          setTitle(data.title || "");
          setBody(data.body || "");
          setTime(data.createdAt?.toDate().toLocaleString() || "");
          if (data.groupRef) {
            const groupDoc = await getDoc(data.groupRef);
            if (groupDoc.exists()) {
              const groupData = groupDoc.data() as { name?: string };
              setGroup(groupData.name || "Unknown Group");
            }
          }
        } else {
          console.log("No such document!");
        }
      }
    };

    fetchAnnouncementData().catch((error) => console.error("Error fetching announcement data:", error));
  }, [announcementRef, announcementData]);

  return (
    <div className="flex items-center justify-center mt-3">
      <Card className="w-full px-3 my-0 py-0 shadow-lg bg-white rounded-xl">
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
