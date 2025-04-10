import { put } from "@vercel/blob";
import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";

// example of usage is in app/test/page.tsx (this has upload to Vercel and display image on screen)
// example of a use directly with our app is in app/announcement/create/page.tsx (note that this is only upload to
// Vercel storage and saving the url with the announcement in firebase, display of image has not been implemented yet)

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7
); // random 7 character string

export async function POST(req: Request) {
  const file = await req.arrayBuffer();
  const contentType = req.headers.get("content-type") || "text/plain";
  const filename = `${nanoid()}.${contentType.split("/")[1]}`;

  const blob = await put(filename, file, {
    contentType,
    access: "public",
  });
  return NextResponse.json(blob);
}
