"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../utils/firebaseConfig.js";
import NavBar from "@/components/ui/navigation-bar";

interface EventData {
  name: string;
  allDay: boolean;
  start: { seconds: number };
  end: { seconds: number };
  description: string;
  location: string;
  docID: string;
  owner: string;
  RSVP: { [key: string]: string };
  workouts: string;
}

interface CalendarEvent {
  title: string;
  start: number | undefined;
  end: number | undefined;
  allDay: boolean;
  description: string;
  location: string;
  docID: string;
  owner: string;
  RSVPStatus: string;
  workout: string;
}

export default function Profile() {
  const router = useRouter();
  const { id } = useParams();
  const [userId, setUserId] = useState("");
  const [profileId, setProfileId] = useState(id || "");
  const [userData, setUserData] = useState({ email: "", username: "" });
  const [preview, setPreview] = useState("/default.png");
  const [isToggleOn, setIsToggleOn] = useState(false);
  const [eventList, setEventList] = useState<CalendarEvent[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendList, setFriendList] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        if (!profileId) {
          setProfileId(user.uid);
        }

        // Fetch the user's friend list
        const userDocRef = doc(db, "Users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.friends) {
            setFriendList(
              userData.friends.map((friendRef: any) => friendRef.id)
            );
          }
        }
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [profileId]);

  useEffect(() => {
    setIsFriend(friendList.includes(profileId));
  }, [friendList, profileId]);

  useEffect(() => {
    if (!profileId) return;

    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, "Users", profileId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserData({
            email: userData.email || "",
            username: userData.username || "",
          });
          setIsToggleOn(userData.toggleSetting || false);
          if (Array.isArray(userData.events)) {
            const newEventList = [];

            // Get the events for the user
            for (let i = 0; i < userData.events.length; i++) {
              const event = userData.events[i];

              let eventDoc;
              try {
                eventDoc = await getDoc(event);
              } catch (error) {
                console.error("Error getting document:", error);
              }
              if (!eventDoc || !eventDoc.exists()) {
                continue;
              }

              const eventData = eventDoc.data() as EventData;

              // get user RSVP status
              let userRSVPStatus = "None";
              for (const key in eventData.RSVP) {
                if (key === profileId) {
                  userRSVPStatus = eventData.RSVP[key];
                  break;
                }
              }

              let workoutData = "None";
              if (eventData.workouts && eventData.workouts.length > 0) {
                const workoutDocRef = doc(
                  db,
                  "Workouts",
                  eventData.workouts[0]
                );
                const workoutDoc = await getDoc(workoutDocRef);
                if (workoutDoc.exists()) {
                  workoutData = workoutDoc.data().exercises[0];
                }
              }

              if (
                eventData.end !== undefined &&
                eventData.end.seconds < Math.floor(Date.now() / 1000)
              ) {
                newEventList.push({
                  title: eventData.name,
                  allDay: eventData.allDay,
                  start:
                    eventData.start == undefined
                      ? undefined
                      : eventData.start.seconds * 1000,
                  end:
                    eventData.end == undefined
                      ? undefined
                      : eventData.end.seconds * 1000,
                  description: eventData.description,
                  location: eventData.location,
                  docID: eventDoc.id,
                  owner: eventData.owner,
                  RSVPStatus: userRSVPStatus,
                  workout: workoutData,
                });
              }
            }
            setEventList(newEventList);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchProfileImage = async () => {
      try {
        const res = await fetch(`/api/getProfileImage?userId=${profileId}`);
        const data = await res.json();
        if (res.ok && data.file) {
          setPreview(`/uploads/${data.file}?timestamp=${Date.now()}`);
        }
      } catch {
        setPreview("/uploads/testuser.png");
      }
    };

    fetchUserData();
    fetchProfileImage();
  }, [profileId]);

  const sendFriendRequest = async () => {
    try {
      const currentUserDocRef = doc(db, "Users", userId);
      const profileUserDocRef = doc(db, "Users", profileId);

      await updateDoc(profileUserDocRef, {
        incomingFriendRequests: arrayUnion(currentUserDocRef),
      });

      alert("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const removeFriend = async () => {
    try {
      const currentUserDocRef = doc(db, "Users", userId);
      const profileUserDocRef = doc(db, "Users", profileId);

      await updateDoc(currentUserDocRef, {
        friends: arrayRemove(profileUserDocRef),
      });

      await updateDoc(profileUserDocRef, {
        friends: arrayRemove(currentUserDocRef),
      });

      setIsFriend(false);
      console.log("Friend removed:", profileId);
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
      }}
    >
      <h1>Profile Page</h1>
      <img
        src={preview}
        alt="Profile"
        width="150"
        style={{
          display: "block",
          margin: "0 auto",
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid #0070f3",
        }}
        onError={(e) => (e.currentTarget.src = "/default.png")}
      />
      {/*<h2>User ID: {userId}</h2>*/}
      <p>
        <strong>Email:</strong> {userData.email}
      </p>
      <p>
        <strong>Username:</strong> {userData.username}
      </p>
      {userId === profileId && (
        <>
          <button
            onClick={() => router.push("/settings")}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "80%",
            }}
          >
            Go to Settings
          </button>
        </>
      )}

      <button
        onClick={() => router.push("/friends")}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          width: "80%",
        }}
      >
        {userId === profileId ? "Friends List" : "Back to Friends List"}
      </button>
      {userId !== profileId && (
        <>
          {isFriend ? (
            <button
              type="submit"
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "80%",
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-md"
              onClick={removeFriend}
            >
              Remove Friend
            </button>
          ) : (
            <button
              type="submit"
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "80%",
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={sendFriendRequest}
            >
              Send Friend Request
            </button>
          )}
        </>
      )}

      <button
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          width: "80%",
        }}
        onClick={() => router.push("/announcement/viewall")}
      >
        View All Announcements
      </button>

      <button
        type="submit"
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          width: "80%",
        }}
        onClick={() => setShowEvents(!showEvents)}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        {showEvents ? "Hide Events" : "Show Events"}
      </button>

      {showEvents && (
        <div className="mt-4">
          {eventList.length > 0 ? (
            <ul className="space-y-2">
              {eventList.map((event, index) => (
                <li
                  key={index}
                  onClick={() =>
                    router.push(`/event/view?docId=${event.docID}`)
                  }
                  className="p-4 border rounded-md shadow-md"
                >
                  <h3 className="text-lg font-semibold">{event.title}</h3>
                  <p className="text-gray-600">{event.description}</p>
                  <p className="text-sm">
                    <strong>Location:</strong> {event.location}
                  </p>
                  <p className="text-sm">
                    <strong>Start:</strong>{" "}
                    {event.start
                      ? new Date(event.start).toLocaleString()
                      : "N/A"}
                  </p>
                  <p className="text-sm">
                    <strong>End:</strong>{" "}
                    {event.end ? new Date(event.end).toLocaleString() : "N/A"}
                  </p>
                  <p className="text-sm">
                    <strong>All Day:</strong> {event.allDay ? "Yes" : "No"}
                  </p>
                  <p className="text-sm">
                    <strong>RSVP Status:</strong> {event.RSVPStatus}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-gray-500">No events found.</p>
          )}
        </div>
      )}

      <NavBar />
    </div>
  );
}
