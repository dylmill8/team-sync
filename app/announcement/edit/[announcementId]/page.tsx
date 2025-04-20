"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/utils/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const params = useSearchParams();
  const announcementId = params.get("announcementId");
  const groupId = params.get("groupId");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const imageRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!announcementId) return;
    async function load() {
      const annRef = doc(db, "Announcements", announcementId);
      const snap = await getDoc(annRef);
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setBody(data.body || "");
        if (data.imageUrl) {
          setPreview(data.imageUrl);
          setImgW(data.imageDims?.[0] || 0);
          setImgH(data.imageDims?.[1] || 0);
        }
      }
    }
    load();
  }, [announcementId]);

  const changeImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      setImgW(img.width);
      setImgH(img.height);
    };
    img.src = url;
  };

  const onSave = async () => {
    if (!announcementId || !groupId) return;
    setLoading(true);
    try {
      const annRef = doc(db, "Announcements", announcementId);
      let imageUrl = preview;
      if (imageFile) {
        const res = await fetch(`${window.location.origin}/api/blob/upload`, {
          method: "POST",
          headers: { "content-type": imageFile.type },
          body: imageFile,
        });
        const { url } = (await res.json()) as { url: string };
        imageUrl = url;
      }
      const payload: any = { title, body };
      if (imageUrl) payload.imageUrl = imageUrl, payload.imageDims = [imgW, imgH];
      await updateDoc(annRef, payload);
      alert("Announcement updated");
      router.push(`/groups?docId=${groupId}`);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!announcementId || !groupId) return;
    const annRef = doc(db, "Announcements", announcementId);
    await deleteDoc(annRef);
    const grpRef = doc(db, "Groups", groupId);
    await updateDoc(grpRef, { announcements: arrayRemove(annRef) });
    alert("Announcement deleted");
    router.push(`/groups?docId=${groupId}`);
  };

  return (
    <div className="flex items-center justify-center mt-6">
      <Card className="w-full max-w-lg p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle>Edit Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="mb-4">
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="mb-4">
            <Label className="text-sm font-medium">Upload Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={changeImage}
              ref={imageRef}
              className="mt-1"
            />
            {preview && (
              <div className="mt-4 w-1/2">
                <Image
                  src={preview}
                  alt="preview"
                  width={imgW}
                  height={imgH}
                />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            className="w-1/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="destructive"
            className="w-1/3 text-white font-bold py-2 px-4 rounded transition-all"
            onClick={onDelete}
          >
            Delete
          </Button>
          <Button
            className="w-1/3 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
