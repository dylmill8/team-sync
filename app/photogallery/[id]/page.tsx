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

type GalleryImage = {
  url: string;
  tags: string[];
};

export default function PhotoGalleryPage() {
  const params = useParams();
  const groupId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [newTags, setNewTags] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("all");

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

    const tagsArray = newTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);

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
        };

        const galleryRef = doc(db, "PhotoGallery", groupId);
        await updateDoc(galleryRef, {
          photos: arrayUnion(newImage),
        });

        setGalleryImages((prev) => [...prev, newImage]);
        setImage(null);
        setPreviewUrl(null);
        setNewTags("");
        alert("Image uploaded!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Upload error");
      console.error(err);
    }
  };

  const handleDelete = async (url: string, tags: string[]) => {
    if (!groupId) return;

    const confirmDelete = confirm("Are you sure you want to delete this image?");
    if (!confirmDelete) return;

    try {
      const galleryRef = doc(db, "PhotoGallery", groupId);
      await updateDoc(galleryRef, {
        photos: arrayRemove({ url, tags }),
      });
      setGalleryImages((prev) => prev.filter((img) => img.url !== url));
    } catch (err) {
      alert("Failed to delete image.");
      console.error(err);
    }
  };

  const uniqueTags = Array.from(
    new Set(galleryImages.flatMap((img) => img.tags))
  );

  const filteredImages =
    selectedTag === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.tags.includes(selectedTag));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Photo Gallery</h1>

      <div className="mb-6">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <input
          type="text"
          placeholder="Enter tags (comma separated)"
          value={newTags}
          onChange={(e) => setNewTags(e.target.value)}
          className="mt-2 w-full border px-3 py-2 rounded"
        />
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
        {filteredImages.map(({ url, tags }, i) => (
          <div key={i} className="relative group">
            <img
              src={url}
              alt={`Gallery image ${i}`}
              className="w-full h-48 object-cover rounded"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {(tags ?? []).join(", ")}
            </div>

            <button
              onClick={() => handleDelete(url, tags)}
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
