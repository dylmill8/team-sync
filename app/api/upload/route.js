import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const uploadDir = path.join(process.cwd(), "public/uploads");
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_EXTENSIONS = [".png", ".svg"];

async function EnsureUploadDir() {
  try {
    await fs.access(uploadDir);
  } catch (error) {
    console.error(error);

    await fs.mkdir(uploadDir, { recursive: true });
  }
}

async function DeleteExistingFile(userId, newExt) {
  const otherExt = newExt === ".png" ? ".svg" : ".png";
  const otherFilePath = path.join(uploadDir, `${userId}${otherExt}`);

  try {
    await fs.access(otherFilePath);
    await fs.unlink(otherFilePath); // Delete the old file if it exists
  } catch (error) {
    console.error(error);

    // Ignore errors (file might not exist)
  }
}

export async function POST(req) {
  try {
    await EnsureUploadDir();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Only .png and .svg files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 1MB" }, { status: 400 });
    }

    await DeleteExistingFile(userId, ext); // Delete existing conflicting file

    const filePath = path.join(uploadDir, `${userId}${ext}`);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json(
      { message: "Upload successful", file: `/uploads/${userId}${ext}` },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
