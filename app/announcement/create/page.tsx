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

import { useState, useEffect, useRef, Suspense, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { db } from "@/utils/firebaseConfig";
import { notifyUsers } from "@/utils/notification";

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  DocumentReference,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { PutBlobResult } from "@vercel/blob";
import NextImage from "next/image";

const CreateAnnouncementPage = () => {
  const router = useRouter();

  const groupId = useSearchParams()?.get("groupId") ?? "";
  const [groupRef, setGroupRef] = useState<DocumentReference | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // get group reference
  useEffect(() => {
    if (groupId) {
      setGroupRef(doc(db, "Groups", groupId));
    }
  }, [groupId]);

  // set image to be the selected image
  const changeImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files && event.currentTarget.files[0];
    if (!file) {
      setImage(null);
    } else {
      const maxBytes = 1024 * 1024;
      if (file.size > maxBytes) {
        alert("Images must be under 1MB, please try again.");
        setImage(null);

        if (imageRef.current) {
          imageRef.current.value = "";
        }
      } else {
        setImage(file);
        const url = URL.createObjectURL(file);
        setPreview(url);

        const img = new Image();
        img.onload = () => {
          setImageWidth(img.width);
          setImageHeight(img.height);
        };
        img.src = url;
      }
    }
  };

  const createButton = async () => {
    if (!title) {
      alert("Announcement Title is required.");
      return;
    }

    setLoading(true);

    try {
      // add images and attachements to Vercel storage, save urls to store in firebase
      let imageUrl = null;
      if (image) {
        await fetch(`${window.location.origin}/api/blob/upload`, {
          method: "POST",
          headers: {
            "content-type": image.type,
          },
          body: image,
        }).then(async (result) => {
          const { url } = (await result.json()) as PutBlobResult;
          //console.log("url:", url);
          imageUrl = url;
        });
      }

      // create and add to database
      const docRef = await addDoc(collection(db, "Announcements"), {
        title,
        body,
        groupRef,
        createdAt: serverTimestamp(),
        imageUrl,
        imageDims: [imageWidth, imageHeight],
      });
      setTitle("");
      setBody("");

      // update group with new announcement
      if (groupRef) {
        await updateDoc(groupRef, {
          announcements: arrayUnion(docRef),
        });
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          const members = groupData.members || [];

          // 3. Send a notification to all group members
          //    Example: category = "Announcement", message = the new title
          await notifyUsers(members, "Announcement", `${title}: ${body}`);
        }
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

  if (!groupRef) {
    return <p>Loading...</p>;
  }

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

            <div>
              <Label>Upload Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={changeImage}
                ref={imageRef}
                className="mt-1"
              />
              {preview && (
                <div className="mt-4 w-1/2">
                  <NextImage
                    className="rounded-lg"
                    src={preview}
                    alt="preview"
                    width={imageWidth}
                    height={imageHeight}
                  />
                </div>
              )}
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
};

export default function CreateAnnouncement() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateAnnouncementPage />
    </Suspense>
  );
}
