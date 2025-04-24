"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/utils/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import NextImage from "next/image";

type GalleryImage = {
  url: string;
  tags: string[];
  title?: string;
  description?: string;
  owner: string;
};

interface PhotoGalleryProps {
  groupId: string;
}

export function PhotoGallery({ groupId }: PhotoGalleryProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [newTags, setNewTags] = useState<string>("");
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [previewDims, setPreviewDims] = useState<{ width: number; height: number } | null>(null);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
  const [fullScreenDims, setFullScreenDims] = useState<{ width: number; height: number } | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
    });
  }, []);

  useEffect(() => {
    const fetchGallery = async () => {
      if (!groupId) return;

      const galleryRef = doc(db, "PhotoGallery", groupId);
      const gallerySnap = await getDoc(galleryRef);

      if (gallerySnap.exists()) {
        const data = gallerySnap.data();
        setGalleryImages(data.photos || []);
      } else {
        await setDoc(galleryRef, { photos: [] });
      }
    };

    fetchGallery();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !userId) return;
    const fetchGroupData = async () => {
      const groupRef = doc(db, "Groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const data = groupSnap.data();
        const members = data.members as Record<string, [string, string]>;
        setUserRole(members[userId]?.[1] || "");
      }
    };
    fetchGroupData();
  }, [groupId, userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewDims(null);
    }
  };

  const handleUpload = async () => {
    if (!image || !groupId || !userId) {
      alert("Missing information");
      return;
    }

    const tagsArray = newTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    const title = newTitle.trim();
    const description = newDescription.trim();

    const formData = new FormData();
    formData.append("image", image);

    try {
      const res = await fetch(`/api/uploadGalleryImage?groupId=${groupId}`, {
        method: "POST",
        body: formData,
      });

      let data = null;

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error("Server did not return JSON.");
      }

      if (res.ok && data.imageUrl) {
        const newImage: GalleryImage = {
          url: data.imageUrl,
          tags: tagsArray,
          title,
          description,
          owner: userId!,
        };

        const galleryRef = doc(db, "PhotoGallery", groupId);
        await updateDoc(galleryRef, {
          photos: arrayUnion(newImage),
        });

        setGalleryImages((prev) => [...prev, newImage]);
        setImage(null);
        setPreviewUrl(null);
        setNewTags("");
        setNewTitle("");
        setNewDescription("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        alert("Image uploaded!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Upload error");
      console.error(err);
    }
  };

  const handleCancel = () => {
    setImage(null);
    setPreviewUrl(null);
    setNewTags("");
    setNewTitle("");
    setNewDescription("");
    setPreviewDims(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!groupId) return;
    try {
      const galleryRef = doc(db, "PhotoGallery", groupId);
      await updateDoc(galleryRef, {
        photos: arrayRemove(img),
      });
      setGalleryImages((prev) => prev.filter((i) => i.url !== img.url));
    } catch (err) {
      alert("Failed to delete image.");
      console.error(err);
    }
  };

  const openFullScreen = (url: string) => {
    setFullScreenUrl(url);
    setFullScreenDims(null);
  };

  const handleCloseFullScreen = () => setFullScreenUrl(null);

  const uniqueTags = Array.from(
    new Set(galleryImages.flatMap((img) => img.tags))
  );

  const filteredImages =
    selectedTag === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.tags.includes(selectedTag));

  return (
    <>
      {fullScreenUrl && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50"
          onClick={handleCloseFullScreen}
        >
          <div
            className="relative rounded-lg overflow-hidden shadow-2xl bg-black bg-opacity-80"
            style={{
              width: fullScreenDims ? fullScreenDims.width : undefined,
              height: fullScreenDims ? fullScreenDims.height : undefined,
              maxWidth: "80%",
              maxHeight: "80%",
            }}
          >
            <NextImage
              src={fullScreenUrl}
              alt="Fullscreen preview"
              fill
              onLoadingComplete={({ naturalWidth, naturalHeight }) =>
                setFullScreenDims({ width: naturalWidth, height: naturalHeight })
              }
              className="object-contain rounded-lg"
              unoptimized
            />
          </div>
        </div>
      )}

      <div>
        <div className="mb-6">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <input
            type="text"
            placeholder="Enter title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="mt-2 w-full border px-3 py-2 rounded"
          />
          <textarea
            placeholder="Enter description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="mt-2 w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Enter tags (comma separated)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className="mt-2 w-full border px-3 py-2 rounded"
          />
          {previewUrl && (
            <div className="my-4 flex flex-col items-center rounded-lg">
              <NextImage
                src={previewUrl}
                alt="Preview"
                width={previewDims?.width || 200}
                height={previewDims?.height || 200}
                onLoadingComplete={({ naturalWidth, naturalHeight }) =>
                  setPreviewDims({ width: naturalWidth, height: naturalHeight })
                }
                className="rounded-lg"
                style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain" }}
                unoptimized
              />
              <div className="mt-2 flex space-x-2">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  onClick={handleUpload}
                >
                  Upload Image
                </button>
                <button
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block mb-1 font-medium">Filter by Tag</label>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="all">All</option>
            {uniqueTags.map((tag, i) => (
              <option key={i} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredImages.map((img, i) => (
            <div
              key={i}
              className="relative group w-full h-48 cursor-pointer overflow-hidden rounded-lg"
              onClick={() => openFullScreen(img.url)}
            >
              <NextImage
                src={img.url}
                alt={`Gallery image ${i}`}
                fill
                className="object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-80 text-white p-3 opacity-0 group-hover:opacity-100 transition">
                {img.title && <h3 className="text-lg font-semibold">{img.title}</h3>}
                {img.description && <p className="mt-1 text-sm">{img.description}</p>}
                <div className="mt-2 text-xs">{img.tags.join(", ")}</div>
              </div>
              {(img.owner === userId || userRole === "leader" || userRole === "owner") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Page() {
  const params = useParams();
  const groupId = params?.id as string;
  return <PhotoGallery groupId={groupId} />;
}
