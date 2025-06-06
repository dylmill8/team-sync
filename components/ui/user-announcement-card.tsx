"use client";

import { useEffect, useRef, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Image from "next/image";

import { DocumentReference, getDoc, Timestamp } from "firebase/firestore";

interface AnnouncementData {
  title: string;
  groupRef: DocumentReference;
  body: string;
  createdAt: Timestamp;
  imageUrl: string;
  imageDims: [];
  fileUrls: string[];
  filenames: string[];
}

interface UserAnnouncementCardProps {
  announcementRef?: DocumentReference;
  announcementData?: AnnouncementData & { id: string };
}

function UserAnnouncementCard({
  announcementRef,
  announcementData,
}: UserAnnouncementCardProps) {
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageDims, setImageDims] = useState([1, 1]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);
  const [time, setTime] = useState("");

  const imageRef = useRef<HTMLImageElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const fetchAnnouncementData = async () => {
      if (announcementData) {
        // Use provided announcementData
        setTitle(announcementData.title || "");
        setBody(announcementData.body || "");
        setImageUrl(announcementData.imageUrl || "");
        setImageDims(announcementData.imageDims || [1, 1]);
        setFileUrls(announcementData.fileUrls || []);
        setFilenames(announcementData.filenames || []);
        setTime(
          announcementData.createdAt
            ? announcementData.createdAt.toDate().toLocaleString()
            : ""
        );
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
          setImageUrl(data.imageUrl || "");
          setImageDims(data.imageDims || [1, 1]);
          setFileUrls(data.fileUrls || []);
          setFilenames(data.filenames || []);
          setTime(data.createdAt?.toDate().toLocaleString() || "");
          if (data.groupRef) {
            const groupDoc = await getDoc(data.groupRef);
            if (groupDoc.exists()) {
              const groupData = groupDoc.data() as { name?: string };
              setGroup(groupData.name || "Unknown Group");
            }
          }
        } else {
          console.error("No such document!");
        }
      }
    };

    fetchAnnouncementData().catch((error) =>
      console.error("Error fetching announcement data:", error)
    );
  }, [announcementRef, announcementData]);

  const imageFullscreen = () => {
    if (imageRef.current?.requestFullscreen) {
      if (!fullscreen) {
        imageRef.current.requestFullscreen();
        setFullscreen(true);
      } else {
        document.exitFullscreen();
        setFullscreen(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center mt-3">
      <Card className="w-full px-3 my-0 py-0 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            <Label>Group: {group}</Label>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {body && <Label>{body}</Label>}

          {imageUrl && (
            <div className="mt-2 w-1/2">
              <Image
                ref={imageRef}
                src={imageUrl}
                alt="announcement image"
                width={imageDims[0]}
                height={imageDims[1]}
                onClick={imageFullscreen}
                className="cursor-pointer"
              />
            </div>
          )}

          <div>
            {fileUrls.map((url, i) => (
              <div key={i} className="cursor-pointer">
                <Image src="/icons/file-icon.png" alt="file icon" className="inline mr-1" width="15" height="15"/>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <Label className="text-blue-500 underline">
                    {filenames[i] || "unnamed file"}
                  </Label>
                </a>
              </div>
            ))}
          </div>

        </CardContent>

        <CardFooter>
          <Label>Posted at: {time}</Label>
        </CardFooter>
      </Card>
    </div>
  );
}

export default UserAnnouncementCard;
