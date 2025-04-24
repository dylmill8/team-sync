"use client";

import React from "react";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import NextImage from "next/image";
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
} from "firebase/firestore";

export default function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const router = useRouter();
  const { announcementId } = React.use(params);
  const searchParams = useSearchParams();
  const groupId = searchParams?.get("groupId") ?? "";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const imageRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [loading, setLoading] = useState(false);

  // add attachments state
  const [files, setFiles] = useState<File[]>([]);
  const filesRef = useRef<HTMLInputElement>(null);

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
    const maxBytes = 1024 * 1024;
    if (file.size > maxBytes) {
      alert("Images must be under 1MB, please try again.");
      setImageFile(null);
      if (imageRef.current) imageRef.current.value = "";
    } else {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
      const img = new window.Image();
      img.onload = () => {
        setImgW(img.width);
        setImgH(img.height);
      };
      img.src = url;
    }
  };

  // attachments handler
  const changeFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.currentTarget.files;
    if (!inputFiles) {
      setFiles([]);
    } else {
      const selected = Array.from(inputFiles);
      const maxBytes = 1024 * 1024 * 10; // 10MB
      const total = selected.reduce((sum, f) => sum + f.size, 0);
      if (total > maxBytes) {
        alert("Total size of files must be under 10MB, please try again.");
        setFiles([]);
        if (filesRef.current) filesRef.current.value = "";
      } else {
        setFiles(selected);
      }
    }
  };

  // expand payload type
  type AnnouncementPayload = {
    title: string;
    body: string;
    imageUrl?: string;
    imageDims?: [number, number];
    fileUrls?: string[];
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
      const payload: AnnouncementPayload = { title, body };
      if (imageUrl) {
        payload.imageUrl = imageUrl;
        payload.imageDims = [imgW, imgH];
      }
      // process attachments
      if (files.length) {
        const fileUrls: string[] = [];
        for (const file of files) {
          const res = await fetch(`${window.location.origin}/api/blob/upload`, {
            method: "POST",
            headers: { "content-type": file.type },
            body: file,
          });
          const { url } = (await res.json()) as { url: string };
          fileUrls.push(url);
        }
        payload.fileUrls = fileUrls;
      }
      await updateDoc(annRef, payload);
      alert("Announcement updated");
      router.push(`/groups?docId=${groupId}`);
    } finally {
      setLoading(false);
    }
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
                <NextImage
                  className="rounded-lg"
                  src={preview}
                  alt="preview"
                  width={imgW}
                  height={imgH}
                />
              </div>
            )}
          </div>
          {/* add file attachments UI */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Upload Files</Label>
            <Input
              type="file"
              multiple
              onChange={changeFiles}
              ref={filesRef}
              className="mt-1"
            />
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
