"use client";

import "./event-modify.css";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useState, useEffect, SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "../../../utils/firebaseConfig";
import {
  collection,
  addDoc,
  Timestamp,
  DocumentData,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";

export default function ModifyEvent() {
  const router = useRouter();
  const docId = useSearchParams().get("docId");

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
  });
  const [loading, setLoading] = useState(true);
  const [deleteEvent, setDeleteEvent] = useState(false);

  // format datetime variable for displaying
  const formatDatetime = (timestamp: Timestamp) => {
    if (!timestamp) {
      return "";
    }

    const date = timestamp.toDate();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // if (allDay) {
    //   return `${year}-${month}-${day}`;
    // }

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
          setUpdatedData((prevData) => ({
            name: prevData.name || fetchedData.name || "",
            description: prevData.description || fetchedData.description || "",
            allDay: prevData.allDay || fetchedData.allDay || false,
            start: prevData.start || formatDatetime(fetchedData.start) || "",
            end: prevData.end || formatDatetime(fetchedData.end) || "",
            location: prevData.location || fetchedData.location || "",
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
  const handleDataChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target;

    console.log("name:", name);
    if (allDay && name == "start") {
      setUpdatedData((prevData) => ({
        ...prevData,
        start: `${value}T00:00`,
      }));
    } else if (allDay && name == "end") {
      setUpdatedData((prevData) => ({
        ...prevData,
        end: `${value}T23:59`,
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

      console.log("start:", updatedData.start);
      console.log("end:", updatedData.end);
      console.log("start formatted:", localStartDate);
      console.log("end formatteed:", localEndDate);
      console.log("all day:", allDay);

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

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
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
        </CardFooter>
      </Card>
    </div>
  );
}
