"use client";

import "./event-modify.css";

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "../../../utils/firebaseConfig";
import {
  Timestamp,
  DocumentData,
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  deleteDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const ModifyEventPage = () => {
  const router = useRouter();
  const docId = useSearchParams()?.get("docId") ?? "";
  const [inviteLink, setInviteLink] = useState<string | null>(null); // Use state for inviteLink
  const [recipientEmail, setRecipientEmail] = useState<string>(""); // Use state for recipient email

  // fetch data on load
  const [data, setData] = useState<DocumentData | null>(null);
  const [allDay, setAllDay] = useState(false);
  const [updatedData, setUpdatedData] = useState({
    name: "",
    description: "",
    allDay: false,
    start: "",
    end: "",
    location: "",
    privateEvent: false,
  });
  const [loading, setLoading] = useState(true);
  const [deleteEvent, setDeleteEvent] = useState(false);

  const [tags, setTags] = useState<string[]>([]); // State for selected tags
  // eslint-disable-next-line prefer-const
  let [availableTags, setAvailableTags] = useState<string[]>(["Mandatory", "Match", "Tournament", "Exercise", "Workout", "Training", "Practice", "Meetup", "Hangout", "Wellness"]);

  const toggleTag = (tag: string) => {
    setTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag) // Remove tag if already selected
        : [...prevTags, tag] // Add tag if not selected
    );
  };

  // format datetime variable for displaying
  const formatDatetime = (timestamp: Timestamp) => {
    if (!timestamp) {
      return "";
    }

    const date = timestamp.toDate();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  useEffect(() => {
    if (!docId) {
      return;
    }

    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "Event", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const fetchedData = docSnap.data();
          setData(fetchedData);
          setAllDay(fetchedData.allDay);

          const eventTags = fetchedData.tags || []; // Tags from the event
          setTags(eventTags); // Initialize selected tags with the event's tags

          // Merge event tags with availableTags, avoiding duplicates and sorting alphabetically
          setAvailableTags((prevTags) => {
            const mergedTags = [...new Set([...prevTags, ...eventTags])];
            return mergedTags.sort((a, b) => a.localeCompare(b)); // Sort alphabetically
          });

          setUpdatedData((prevData) => ({
            name: prevData.name || fetchedData.name || "",
            description: prevData.description || fetchedData.description || "",
            allDay: prevData.allDay || fetchedData.allDay || false,
            start: prevData.start || formatDatetime(fetchedData.start) || "",
            end: prevData.end || formatDatetime(fetchedData.end) || "",
            location: prevData.location || fetchedData.location || "",
            privateEvent: fetchedData.private || false,
          }));
        } else {
          console.error("Event not found.");
        }
      } catch (error) {
        console.error("Error fetching event data.", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [docId]);

  if (loading) {
    return <p>Loading ...</p>;
  }
  if (!data) {
    return <p>Error: Event not found.</p>;
  }

  // change updatedData variable on input field change
  const handleDataChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    //console.log("name:", name);
    if (allDay && name == "start") {
      setUpdatedData((prevData) => ({
        ...prevData,
        start: `${value}T00:00`, // Assuming value is a string
      }));
    } else if (allDay && name == "end") {
      setUpdatedData((prevData) => ({
        ...prevData,
        end: `${value}T23:59`, // Assuming value is a string
      }));
    } else {
      setUpdatedData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  // handle navigation when buttons are pressed
  const handleBack = () => {
    router.push(`/event/view?docId=${docId}`);
  };

  const handleSave = async () => {
    if (!docId) {
      console.error("No docId found.");
      return;
    }

    try {
      const docRef = doc(db, "Event", docId);

      if (updatedData.name == "") {
        alert("Event Name field is required.");
        return;
      }

      if (updatedData.start == "" || updatedData.end == "") {
        alert("Event Start and End Date are required.");
        return;
      }

      const localStartDate = updatedData.start.split("T")[0] + "T00:00";
      const localEndDate = updatedData.end.split("T")[0] + "T23:59";

      /* console.log("start:", updatedData.start);
      console.log("end:", updatedData.end);
      console.log("start formatted:", localStartDate);
      console.log("end formatted:", localEndDate);
      console.log("all day:", allDay); */

      await updateDoc(docRef, {
        name: updatedData.name,
        description: updatedData.description,
        allDay: updatedData.allDay,
        start: allDay
          ? Timestamp.fromDate(new Date(localStartDate))
          : Timestamp.fromDate(new Date(updatedData.start)),
        end: allDay
          ? Timestamp.fromDate(new Date(localEndDate))
          : Timestamp.fromDate(new Date(updatedData.end)),
        location: updatedData.location,
        private: updatedData.privateEvent,
        tags,
      });

      alert("Event successfully updated.");
      router.push(`/event/view?docId=${docId}`);
    } catch (error) {
      console.error("Error updating event", error);
      alert("There was an error updating the event.");
    }
  };

  // handle event deletion
  const handleDelete = async () => {
    if (!docId) {
      return;
    }

    try {
      const eventRef = doc(db, "Event", docId);
      if (data?.ownerType == "group") {
        // event deletion for group events
        const groupId = data?.owner;
        if (groupId) {
          const groupRef = doc(db, "Groups", groupId);

          await updateDoc(groupRef, {
            events: arrayRemove(eventRef),
          });
        }

        await deleteDoc(eventRef);
        alert("Event successfully deleted.");
        router.push(`/groups?docId=${groupId}`);
      } else if (data?.ownerType == "user") {
        // event deletion for user-owned events
        const userArray = data?.owner;
        if (userArray) {
          for (const userId of userArray) {
            const userRef = doc(db, "Users", userId);

            await updateDoc(userRef, {
              events: arrayRemove(eventRef),
            });
          }
        }

        await deleteDoc(eventRef);
        alert("Event successfully deleted.");
        router.push("/calendar");
      }
    } catch (e) {
      console.log("error with delete event:", e);
      return;
    }
  };

  // Create invite link
  const createInviteLink = async () => {
    setInviteLink(null);

    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) {
      alert("You must be logged in to create an invite link.");
      return;
    }
    const userRef = doc(db, "Users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      alert("User not found.");
      return;
    }

    if (!docId) {
      return;
    }

    const eventRef = doc(db, "Event", docId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      alert("Event not found.");
      return;
    }

    const inviteRef = await addDoc(collection(db, "EventInvite"), {
      event: eventRef,
    });

    const generatedLink = `http://teamsync-woad.vercel.app/invite/${inviteRef.id}`;
    setInviteLink(generatedLink);
    alert(`Your invite link has been generated!`);
  };

  // Send invite email
  const sendInviteEmail = async () => {
    if (!inviteLink || !recipientEmail) {
      alert("Please generate an invite link and provide an email address.");
      return;
    }

    try {
      const response = await fetch("/api/sendInviteEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: recipientEmail,
          inviteLink,
        }),
      });

      if (response.ok) {
        alert("Invite email sent successfully!");
      } else {
        try {
          const errorData = await response.json();
          alert(`Failed to send email: ${errorData.error}`);
        } catch (err) {
          console.error("Error parsing error response:", err);
          alert("Failed to send email: An unknown error occurred.");
        }
      }
    } catch (error) {
      console.error("Error sending invite email:", error);
      alert("An error occurred while sending the email.");
    }
  };

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle
            className="text-center text-2xl font-semibold"
            data-testid="modify-event-title"
          >
            Modify Event
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form>
            <div className="mb-4">
              <Label className="text-sm font-medium">Event Name</Label>
              <Input
                name="name"
                value={updatedData.name}
                onChange={handleDataChange}
                className="mt-1"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">Event Description</Label>
              <Textarea
                name="description"
                value={updatedData.description}
                onChange={handleDataChange}
                className="mt-1"
              ></Textarea>
            </div>

            <div className="mb-4 all-day-div">
              <Label className="text-sm font-medium">All Day?</Label>
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => {
                  setAllDay(e.target.checked);
                  setUpdatedData((prevData) => ({
                    ...prevData,
                    allDay: !allDay,
                  }));
                }}
                className="ml-3 all-day-checkbox"
              ></input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">Start Date</Label>
              <Input
                name="start"
                type={updatedData.allDay ? "date" : "datetime-local"}
                value={
                  allDay ? updatedData.start.split("T")[0] : updatedData.start
                }
                onChange={handleDataChange}
                className="mt-1"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">End Date</Label>
              <Input
                name="end"
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? updatedData.end.split("T")[0] : updatedData.end}
                onChange={handleDataChange}
                className="mt-1"
              ></Input>
            </div>

            <div className="mb-4">
              <Label className="text-sm font-medium">Event Location</Label>
              <Input
                name="location"
                value={updatedData.location}
                onChange={handleDataChange}
                className="mt-1"
              ></Input>
            </div>


            <div className="mb-4 flex items-center space-x-2">
              <input
                type="checkbox"
                id="privateEvent"
                checked={updatedData.privateEvent}
                onChange={(e) =>
                  setUpdatedData((prevData) => ({
                    ...prevData,
                    privateEvent: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="privateEvent">Private Event</Label>
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
                      className={tags.includes(tag) ? "bg-gray-200 dark:bg-gray-700" : ""}
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
                            const newTagInput = e.currentTarget as HTMLInputElement;
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
                <div className="text-sm font-medium mb-1"> Selected Tags:</div> {/* Ensure this stays on a separate line */}
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
          </form>

          <div className="mb-1 pt-2 flex justify-center items-center">
            <Button
              onClick={() => {
                router.push(`/workout/create?docId=${docId}`);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold mt-1 mx-2 mb-0 rounded transition-all"
            >
              Add Workout
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex-col">
          <div className="flex w-full">
            <Button
              onClick={handleBack}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold mb-2 mx-2 mt-0 rounded transition-all"
            >
              Back
            </Button>
            <Button
              onClick={handleSave}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold mb-2 mx-2 mt-0 rounded transition-all"
            >
              Save
            </Button>
          </div>

          <div className="flex w-full">
            {!deleteEvent && (
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold mb-2 mx-2 mt-0 rounded transition-all"
                onClick={() => setDeleteEvent(true)}
              >
                Delete
              </Button>
            )}

            {deleteEvent && (
              <div className="w-full flex mt-1">
                <Label className="ml-2 w-full font-bold">Confirm Delete?</Label>
                <Button
                  className="w-full bg-gray-100 hover:bg-gray-200 text-black font-bold mb-2 mx-2 mt-0 rounded transition-all"
                  onClick={() => setDeleteEvent(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold mb-2 mx-2 mt-0 rounded transition-all"
                  onClick={handleDelete}
                >
                  Confirm
                </Button>
              </div>
            )}
          </div>

          <div className="flex w-full mt-4">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold mb-2 mx-2 mt-0 rounded transition-all"
              onClick={createInviteLink}
            >
              Create Event Invite Link
            </Button>
          </div>

          <div className="flex w-full">
            <Label className="text-sm font-medium">Invite Recipient:</Label>
          </div>

          <div className="flex w-full">
            <Input
              type="email"
              placeholder="Enter recipient's email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="mb-2 mx-2 mt-0"
            />
          </div>

          <div className="flex w-full">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold mb-2 mx-2 mt-0 rounded transition-all"
              onClick={sendInviteEmail}
            >
              Send Invite Email
            </Button>
          </div>

          <div className="flex w-full">
            {inviteLink && (
              <div className="w-full justify-center flex mb-2 mx-2 mt-0">
                Invite Link: {inviteLink}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default function ModifyEvent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ModifyEventPage />
    </Suspense>
  );
}
