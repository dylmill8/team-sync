"use client";

import "./event-view.css";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "../../../utils/firebaseConfig";
import { doc, getDoc, DocumentData } from "firebase/firestore";

export default function ViewEvent() {
  const [data, setData] = useState<DocumentData | null>(null);
  const docId = useSearchParams().get("docId");

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) {
        return "";
      }

      const docRef = doc(db, "Event", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setData(docSnap.data());
      } else {
        console.log("data can't be found.");
      }
    };

    fetchDocument();
  }, []);

  const router = useRouter();
  const modifyNavigation = () => {
    router.push(`/event/modify?docId=${docId}`);
  };

  const handleBack = () => {
    router.push("/calendar");
  };

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            {data?.name || "Error loading event name."}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-gray-600 mb-4">
            {data?.description || ""}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medium">
                Start Date:{" "}
                {data?.start
                  ? data.start.toDate().toLocaleString("en-US")
                  : "Error loading date."}
              </Label>
            </div>
          )}

          {data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medium">
                Start Date:{" "}
                {data?.start
                  ? data.start.toDate().toLocaleDateString("en-US")
                  : "Error loading start date."}
              </Label>
            </div>
          )}

          {!data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medmium">
                End Date:{" "}
                {data?.end
                  ? data.end.toDate().toLocaleString("en-US")
                  : "Error loading end date."}
              </Label>
            </div>
          )}

          {data?.allDay && (
            <div className="mb-1">
              <Label className="text-sm font-medium">
                End Date:{" "}
                {data?.end
                  ? data.end.toDate().toLocaleDateString("en-US")
                  : "Error loading end date."}
              </Label>
            </div>
          )}

          <div className="mb-1">
            <Label className="text-sm font-medium">
              Location: {data?.location || "N/A"}
            </Label>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleBack}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
          >
            Back
          </Button>
          <Button
            onClick={modifyNavigation}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
          >
            Modify
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
