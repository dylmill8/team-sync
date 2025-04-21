import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("groupId");
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public/uploads/groups");
    const files = fs.readdirSync(uploadDir);

    let userFile = files.find((file) => file.startsWith(userId));
    let defaultFile = files.find((file) => file.startsWith("default"));
    if (!userFile) {
      return NextResponse.json({ file: defaultFile }, { status: 200 });

    }

    return NextResponse.json({ file: userFile }, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to retrieve profile image" },
      { status: 500 }
    );
  }
}
