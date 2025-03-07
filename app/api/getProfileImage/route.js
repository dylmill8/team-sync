import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads");
    const files = fs.readdirSync(uploadDir);

    const userFile = files.find((file) => file.startsWith(userId));

    if (!userFile) {
      return NextResponse.json({ error: "No profile image found" }, { status: 404 });
    }

    return NextResponse.json({ file: userFile }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve profile image" },
      { status: 500 }
    );
  }
}
