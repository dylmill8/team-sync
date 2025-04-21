import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const galleryDir = path.join(process.cwd(), "public/gallery");
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

async function EnsureGalleryDir() {
  try {
    await fs.access(galleryDir);
  } catch {
    await fs.mkdir(galleryDir, { recursive: true });
  }
}

export async function POST(req) {
  try {
    await EnsureGalleryDir();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const uniqueName = `${groupId}_${crypto.randomUUID()}${ext}`;
    const filePath = path.join(galleryDir, uniqueName);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json(
      { message: "Upload successful", imageUrl: `/gallery/${uniqueName}` },
      { status: 200 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
