"use client";

import { useEffect, useState } from "react";
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

export default function PhotoGalleryPage() {
  const params = useParams();
  const groupId = params?.id as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!image || !groupId || !userId) {
      alert("Missing information");
      return;
    }

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
        const galleryRef = doc(db, "PhotoGallery", groupId);
        await updateDoc(galleryRef, {
          photos: arrayUnion(data.imageUrl),
        });

        setGalleryImages((prev) => [...prev, data.imageUrl]);
        setImage(null);
        setPreviewUrl(null);
        alert("Image uploaded!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Upload error");
      console.error(err);
    }
  };

  const handleDelete = async (url: string) => {
    if (!groupId) return;

    const confirmDelete = confirm("Are you sure you want to delete this image?");
    if (!confirmDelete) return;

    try {
      const galleryRef = doc(db, "PhotoGallery", groupId);
      await updateDoc(galleryRef, {
        photos: arrayRemove(url),
      });
      setGalleryImages((prev) => prev.filter((img) => img !== url));
    } catch (err) {
      alert("Failed to delete image.");
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Photo Gallery</h1>

      <div className="mb-4">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {previewUrl && (
          <div className="my-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="rounded w-full max-h-60 object-cover"
            />
            <button
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
              onClick={handleUpload}
            >
              Upload Image
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {galleryImages.map((url, i) => (
          <div key={i} className="relative group">
            <img
              src={url}
              alt={`Gallery image ${i}`}
              className="w-full h-48 object-cover rounded"
            />
            <button
              onClick={() => handleDelete(url)}
              className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
