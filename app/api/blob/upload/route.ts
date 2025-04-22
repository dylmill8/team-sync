import { put } from "@vercel/blob";
import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import path from "path";

// example of usage is in app/test/page.tsx (this has upload to Vercel and display image on screen)
// example of a use directly with our app is in app/announcement/create/page.tsx

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
); // random 7 character string

export async function POST(req: Request) {
  const file = await req.arrayBuffer();
  const contentType = req.headers.get("content-type") || "text/plain";
  const originalFilename = req.headers.get("x-original-filename") || "unknown";
  const extension = path.extname(originalFilename) || ".bin";
  const filename = `${nanoid()}.${extension}`;

  const blob = await put(filename, file, {
    contentType,
    access: "public",
  });

  return NextResponse.json({
    url: blob.url,
    filename: originalFilename,
  });
}
