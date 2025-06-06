"use client";

import "./event-create.css";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/utils/firebaseConfig";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";
import { useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown";

// interface EventData {
//   name: string;
//   allDay: boolean;
//   start: { seconds: number };
//   end: { seconds: number };
//   description: string;
//   location: string;
//   docID: string;
//   ownerType: string;
//   owner: string;
//   RSVP: { [key: string]: string };
//   workouts: string;
// }

const CreateEventPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const group = searchParams?.get("group");
  const groupId = group ? searchParams?.get("groupId") : "";

  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState<boolean>(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = getAuth(firebaseApp);
  const [uid, setUid] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  const [tags, setTags] = useState<string[]>([]); // State for selected tags
  // eslint-disable-next-line prefer-const
  let [availableTags, setAvailableTags] = useState<string[]>([
    "Mandatory",
    "Match",
    "Tournament",
    "Exercise",
    "Workout",
    "Training",
    "Practice",
    "Meetup",
    "Hangout",
    "Wellness",
  ]);

  const toggleTag = (tag: string) => {
    setTags(
      (prevTags) =>
        prevTags.includes(tag)
          ? prevTags.filter((t) => t !== tag) // Remove tag if already selected
          : [...prevTags, tag] // Add tag if not selected
    );
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const cancelButton = () => {
    if (group == "true") {
      router.push(`/groups?docId=${groupId}`);
    } else {
      router.push("/calendar");
    }
  };

  const eventCreation = async () => {
    if (!eventName) {
      alert("Event Name field is required.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Event Start & End Date fields are required.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("The End Date can not occur before the Start Date");
      return;
    }

    setLoading(true);

    try {
      const [startYear, startMonth, startDay] = startDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

      const localStartDate = new Date(
        startYear,
        startMonth - 1,
        startDay,
        0,
        0,
        0,
        0
      );
      const localEndDate = new Date(
        endYear,
        endMonth - 1,
        endDay,
        23,
        59,
        59,
        0
      );

      const docref = await addDoc(collection(db, "Event"), {
        name: eventName,
        description,
        allDay,
        start: allDay
          ? Timestamp.fromDate(localStartDate)
          : Timestamp.fromDate(new Date(startDate)),
        end: allDay
          ? Timestamp.fromDate(localEndDate)
          : Timestamp.fromDate(new Date(endDate)),
        location,
        ownerType: group == "true" ? "group" : "user",
        owner: group == "true" ? groupId : [],
        RSVP: {},
        workouts: [],
        private: isPrivate, // Add this line to store the private event status
        tags: tags,
      });

      if (group == "false") {
        const docSnap = await getDoc(docref);
        if (docSnap.exists()) {
          await updateDoc(docref, {
            owner: arrayUnion(uid),
          });
        }
      }

      if (group == "true") {
        if (groupId) {
          const groupDocRef = doc(db, "Groups", groupId);

          const docSnap = await getDoc(groupDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (!("events" in data)) {
              await updateDoc(groupDocRef, {
                events: [],
              });
            }
          }

          await updateDoc(groupDocRef, {
            events: arrayUnion(doc(db, "Event", docref.id)),
          });
        }
      } else {
        if (uid) {
          const userDocRef = doc(db, "Users", uid);

          // check if events array exists
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (!("events" in data)) {
              await updateDoc(userDocRef, {
                events: [],
              });
            }
          }

          await updateDoc(userDocRef, {
            events: arrayUnion(doc(db, "Event", docref.id)),
          });
        }
      }

      alert("Event successfulling created!");
      router.push(`/event/view?docId=${docref.id}`);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to create event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center mt-4">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Create Event
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form>
            <div className="mb-4">
              <Label className="text-sm font-medium">Event Name</Label>
              <Input
                placeholder="New Event Name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="mt-1"
                data-testid="name-input"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">Event Description</Label>
              <Textarea
                placeholder="New event description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              ></Textarea>
            </div>

            <div className="mb-4 all-day-div">
              <Label className="text-sm font-medium">All Day?</Label>
              <input
                type="checkbox"
                onChange={() => setAllDay(!allDay)}
                className="ml-3 all-day-checkbox"
              ></input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">Start Date</Label>
              <Input
                type={allDay ? "date" : "datetime-local"}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
                data-testid="start-input"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">End Date</Label>
              <Input
                type={allDay ? "date" : "datetime-local"}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
                data-testid="end-input"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">Event Location</Label>
              <Input
                placeholder="New Event Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">Event Tags</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Select Tags
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {/* Existing tags */}
                  {availableTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag}
                      onSelect={(e) => {
                        e.preventDefault(); // Prevent the dropdown from closing
                        toggleTag(tag); // Toggle the tag selection
                      }}
                      className={
                        tags.includes(tag) ? "bg-gray-200 dark:bg-gray-700" : ""
                      }
                    >
                      {tags.includes(tag) ? `✓ ${tag}` : tag}
                    </DropdownMenuItem>
                  ))}

                  {/* Add new tag input */}
                  <div className="mt-2 p-2 border-t border-gray-300">
                    <div>
                      <Input
                        name="newTag"
                        placeholder="Add new tag"
                        className="w-full mb-2"
                        onKeyDown={(e) => {
                          e.stopPropagation(); // Prevent dropdown from moving away on type
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const newTagInput =
                              e.currentTarget as HTMLInputElement;
                            const newTag = newTagInput.value.trim();
                            if (newTag && !availableTags.includes(newTag)) {
                              setAvailableTags((prev) => [...prev, newTag]); // Add new tag to availableTags
                              toggleTag(newTag);
                              newTagInput.value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        onClick={(e) => {
                          e.preventDefault(); // Prevent default button behavior
                          const newTagInput = document.querySelector(
                            'input[name="newTag"]'
                          ) as HTMLInputElement;
                          const newTag = newTagInput.value.trim();
                          if (newTag && !availableTags.includes(newTag)) {
                            setAvailableTags((prev) => [...prev, newTag]); // Add new tag to availableTags
                            toggleTag(newTag); // Automatically select the new tag
                            newTagInput.value = ""; // Clear the input field
                          }
                        }}
                        className="w-full"
                      >
                        Add Tag
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="mt-2">
                <div className="text-sm font-medium mb-1"> Selected Tags:</div>{" "}
                {/* Ensure this stays on a separate line */}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-sm font-medium rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="mb-4">
              <Label className="text-sm font-medium">Private Event</Label>
              <input
                type="checkbox"
                onChange={() => setIsPrivate(!isPrivate)}
                className="ml-3"
              />
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <Button
            onClick={cancelButton}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all mx-3 my-0"
          >
            Cancel
          </Button>
          <Button
            onClick={eventCreation}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all mx-3 my-0"
            data-testid="createButton"
          >
            Create Event
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default function CreateEvent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateEventPage />
    </Suspense>
  );
}
