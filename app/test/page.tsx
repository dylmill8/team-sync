"use client";

import { PutBlobResult } from "@vercel/blob";
import { ChangeEvent, useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const changePicture = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files && event.currentTarget.files[0];
    if (file instanceof File) {
      setFile(file);
    }
  };

  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          fetch("api/blob/upload", {
            method: "POST",
            headers: {
              "content-type": file?.type || "application/octet-stream",
            },
            body: file,
          }).then(async (result) => {
            const { url } = (await result.json()) as PutBlobResult;
            setUrl(url);
          });
        }}
      >
        <div>
          <label htmlFor="image">Image</label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            onChange={changePicture}
          />
        </div>
        <button type="submit">Submit</button>
      </form>

      {url && <img src={url}></img>}
    </div>
  );
}
