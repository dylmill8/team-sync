"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { db } from "@/utils/firebaseConfig";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  DocumentReference,
  serverTimestamp
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";

export default function CreateAnnouncement() {
  const router = useRouter();

  const groupId = useSearchParams().get("groupId");
  const [groupRef, setGroupRef] = useState<DocumentReference | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  // get group reference
  useEffect(() => {
    if (groupId) {
      setGroupRef(doc(db, "Groups", groupId));
    }
  }, []);

  // TODO: implement cancel button that routes user back to the group page

  const createButton = async () => {
    if (!title) {
      alert("Announcement Title is required.");
      return;
    }

    setLoading(true);

    try {
      // create and add to database
      const docRef = await addDoc(collection(db, "Announcements"), {
        title,
        body,
        groupRef,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setBody("");

      // update group with new announcement
      if (groupRef) {
        await updateDoc(groupRef, {
          announcements: arrayUnion(docRef),
        });
      }

      alert("Announcement successfully created!");
      router.push(`/groups?docId=${groupId}`);
    } catch (e) {
      console.error("there was an error creating a new announcement", e);
      alert("failed to create announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center mt-4">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            New Announcement
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form>
            <div className="mb-4">
              <Label className="text-sm font-medium">Title</Label>
              <Input
                placeholder="Announcement Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-meidum">Body</Label>
              <Textarea
                placeholder="Announcement body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1"
              ></Textarea>
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all mx-3 my-0"
            onClick={() => router.push(`/groups?docId=${groupId}`)}
          >
            Cancel
          </Button>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all mx-3 my-0"
            onClick={createButton}
            disabled={loading}
          >
            Create
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
