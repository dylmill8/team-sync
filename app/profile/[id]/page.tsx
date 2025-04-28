"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { notifyUsers } from "@/utils/notification";

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
import { DocumentReference } from "firebase/firestore";
import Image from "next/image";
import NextImage from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ActivityGrid from "@/components/ui/activity-grid";

type DataItem = {
  name: string;
  value: number;
};

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

interface GroupInfo {
  name: string;
  docID: string;
  description: string;
  groupPic: string;
  memberCount: number;
}

export default function Profile() {
  const router = useRouter();
  const params = useParams();
  const id = (
    params && typeof params === "object" && "id" in params ? params.id : ""
  ) as string;
  const [userId, setUserId] = useState("");
  const [profileId, setProfileId] = useState<string>("");
  const [userData, setUserData] = useState({
    email: "",
    username: "",
    profilePic: null,
  });
  const [eventList, setEventList] = useState<CalendarEvent[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendList, setFriendList] = useState<string[]>([]);
  const [groupList, setGroupList] = useState<GroupInfo[]>([]);
  const [showGroups, setShowGroups] = useState(false);

  // stats overview variables
  const [profileRSVP, setProfileRSVP] = useState<DataItem[]>([
    { name: "yes", value: 0 },
    { name: "maybe", value: 0 },
    { name: "no", value: 0 },
  ]);
  const [profileWorkoutDates, setProfileWorkoutDates] = useState<{
    [key: string]: number;
  }>({});
  const [statsVisible, setStatsVisible] = useState<boolean>(true);
  const [visibleSetting, setVisibleSetting] = useState<string>("only me");
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);

  // stats overview related functions
  useEffect(() => {
    if (visibleSetting == "only me") {
      if (userId == profileId) {
        setStatsVisible(true);
      } else {
        setStatsVisible(false);
      }
    } else if (visibleSetting == "my friends") {
      if (userId == profileId || isFriend) {
        setStatsVisible(true);
      } else {
        setStatsVisible(false);
      }
    } else if (visibleSetting == "everyone") {
      setStatsVisible(true);
    }
  }, [visibleSetting, profileId, userId, isFriend]);

  useEffect(() => {
    const fetchVisibility = async () => {
      try {
        const profileRef = doc(db, "Users", profileId);
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          if (profileData.statVisibility) {
            setVisibleSetting(profileData.statVisibility);
          } else {
            setVisibleSetting("only me");
          }
        } else {
          setVisibleSetting("only me");
        }
      } catch (e) {
        console.log("error", e);
      }
    };

    fetchVisibility();
  }, [profileId]);

  useEffect(() => {
    // calculate workouts
    setLoadingOverview(true);
    const fetchWorkouts = async () => {
      const dateMap: { [key: string]: number } = {};

      if (profileId) {
        try {
          const profileRef = doc(db, "Users", profileId);
          const profileDoc = await getDoc(profileRef);

          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            const profileWorkouts = profileData.workouts;

            if (profileWorkouts) {
              const workoutsPromise = profileWorkouts.map(
                async (workoutId: string) => {
                  const workoutRef = doc(db, "Workouts", workoutId);
                  const workoutDoc = await getDoc(workoutRef);

                  if (workoutDoc.exists()) {
                    const workoutData = workoutDoc.data();
                    const workoutLogs = workoutData.Map;
                    const workoutEvent = workoutData.eventId;

                    let workoutDateString = "";

                    if (workoutEvent) {
                      const eventRef = doc(db, "Event", workoutEvent);
                      const eventDoc = await getDoc(eventRef);

                      if (eventDoc.exists()) {
                        const eventData = eventDoc.data();
                        const eventDate = eventData.start;

                        if (eventDate) {
                          const date = eventDate.toDate();
                          const formattedDate = date
                            .toISOString()
                            .split("T")[0]; // "YYYY-MM-DD"
                          // if (formattedDate in dateMap) {
                          //   dateMap[formattedDate] += 1;
                          // } else {
                          //   dateMap[formattedDate] = 1;
                          // }

                          workoutDateString = formattedDate;
                        }
                      }
                    }

                    if (workoutLogs) {
                      const logRef = doc(db, "Logs", workoutLogs[profileId]);
                      const logDoc = await getDoc(logRef);

                      if (logDoc.exists()) {
                        const logData = logDoc.data();
                        const logDesc = logData.descriptions;

                        for (const desc of logDesc) {
                          if (desc != "") {
                            if (workoutDateString in dateMap) {
                              dateMap[workoutDateString] += 1;
                            } else {
                              dateMap[workoutDateString] = 1;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              );

              await Promise.all(workoutsPromise);
            }
          }
        } catch (e) {
          console.log("something went wrong", e);
        }
      }

      setProfileWorkoutDates(dateMap);
      setLoadingOverview(false);
    };

    fetchWorkouts();
  }, [profileId]);
  useEffect(() => {
    // calculate RSVP
    setLoadingOverview(true);
    const fetchRSVPData = async () => {
      const profileRSVPList: DataItem[] = [
        { name: "yes", value: 0 },
        { name: "maybe", value: 0 },
        { name: "no", value: 0 },
      ];

      const rsvpPromise = eventList.map(async (event: CalendarEvent) => {
        if (event.RSVPStatus) {
          if (event.RSVPStatus == "yes") {
            profileRSVPList[0].value += 1;
          } else if (event.RSVPStatus == "maybe") {
            profileRSVPList[1].value += 1;
          } else if (event.RSVPStatus == "no") {
            profileRSVPList[2].value += 1;
          }
        }
      });

      await Promise.all(rsvpPromise);
      setProfileRSVP(profileRSVPList);
      setLoadingOverview(false);
    };

    fetchRSVPData();
  }, [profileId, eventList]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        if (!profileId && typeof id === "string") {
          setProfileId(id);
        }

        // Fetch the user's friend list
        const userDocRef = doc(db, "Users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.friends) {
            setFriendList(
              userData.friends.map(
                (friendRef: DocumentReference) => friendRef.id
              )
            );
          }
        }
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [profileId, id, router]);

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
            profilePic: userData.profilePic || null,
          });

          let newEventList: CalendarEvent[] = [];

          // Get the events for the user
          if (Array.isArray(userData.events)) {
            const eventListPromise = userData.events.map(async (event) => {
              let eventDoc;
              try {
                eventDoc = await getDoc(event);
              } catch (error) {
                console.error("Error getting document:", error);
              }
              if (eventDoc && eventDoc.exists()) {
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
                  return {
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
                  };
                }
              }
            });

            const list = await Promise.all(eventListPromise);
            newEventList = list.filter((e) => e != null) as CalendarEvent[];
          }

          // fetch user's group events
          if (Array.isArray(userData.groups)) {
            const groupListPromise = userData.groups.map(
              async (groupRef: DocumentReference) => {
                const groupDoc = await getDoc(groupRef);
                if (groupDoc.exists()) {
                  const eventList = groupDoc.data().events;
                  if (eventList) {
                    const events: CalendarEvent[] = [];
                    for (const eventRef of eventList) {
                      let eventDoc;
                      try {
                        eventDoc = await getDoc(eventRef);
                      } catch (error) {
                        console.error("Error getting document:", error);
                      }
                      if (eventDoc && eventDoc.exists()) {
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
                        if (
                          eventData.workouts &&
                          eventData.workouts.length > 0
                        ) {
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
                          events.push({
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
                    }

                    return events;
                  }
                }
              }
            );

            const groupList = await Promise.all(groupListPromise);
            const filteredGroupList = groupList
              .flat()
              .filter((e) => e != null) as CalendarEvent[];
            newEventList = [...newEventList, ...filteredGroupList];

            // for (let i = 0; i < userData.events.length; i++) {
            //   const event = userData.events[i];

            // }
          }

          setEventList(newEventList);

          // Fetch public groups in parallel
          if (Array.isArray(userData.groups)) {
            const snaps = await Promise.all(
              (userData.groups as DocumentReference[]).map((ref) => getDoc(ref))
            );
            const newGroupList: GroupInfo[] = snaps
              .filter(
                (snap) => snap.exists() && snap.data()?.isPrivate === false
              )
              .map((snap) => {
                const gd = snap.data()!;
                const members = gd.members || {};
                return {
                  name: gd.name as string,
                  docID: snap.id,
                  description: (gd.description as string) || "",
                  groupPic: (gd.groupPic as string) || "",
                  memberCount: Object.keys(members).length,
                };
              });
            setGroupList(newGroupList);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [profileId]);

  const sendFriendRequest = async () => {
    try {
      const currentUserDocRef = doc(db, "Users", userId);
      const profileUserDocRef = doc(db, "Users", profileId);

      // Add incoming request to profile user's document
      await updateDoc(profileUserDocRef, {
        incomingFriendRequests: arrayUnion(currentUserDocRef),
      });

      // Fetch sender's username
      const currentUserDoc = await getDoc(currentUserDocRef);
      let senderUsername = "Someone";
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        senderUsername = currentUserData.username || "Someone";
      }

      // Notify the receiver
      await notifyUsers(
        [profileId],
        "FriendRequest",
        `${senderUsername} has sent you a friend request.`
      );

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
      //console.log("Friend removed:", profileId);
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
      <div
        style={{
          width: "150px",
          height: "150px",
          borderRadius: "50%",
          overflow: "hidden",
          margin: "0 auto",
          border: "3px solid #0070f3",
        }}
      >
        <NextImage
          src={
            userData?.profilePic ||
            "https://ns6ela3qh5m1napj.public.blob.vercel-storage.com/88BqvzD.-sYOdx4LwT08Vjf9C4TxU17uTscYPjn.bin"
          }
          alt="Profile"
          width={150}
          height={150}
          className="rounded-full object-cover w-[150px] h-[150px]"
          onError={(e) =>
            (e.currentTarget.src =
              "https://ns6ela3qh5m1napj.public.blob.vercel-storage.com/88BqvzD.-sYOdx4LwT08Vjf9C4TxU17uTscYPjn.bin")
          }
        />
      </div>
      {/*<h2>User ID: {userId}</h2>*/}
      <p>
        <strong>Email:</strong> {userData.email}
      </p>
      <p>
        <strong>Username:</strong> {userData.username}
      </p>

      {statsVisible && (
  <Card className="my-2 mx-10 max-h-[80vh] overflow-y-auto">
    <CardHeader>
      <CardTitle className="text-lg">Overview</CardTitle>
    </CardHeader>

    {loadingOverview && <p>Loading overview...</p>}
    {!loadingOverview && (
      <CardContent className="min-w-max flex flex-col justify-center items-center">
        <Label className="mb-3 font-semibold">
          Total Events Attended: {profileRSVP[0].value}
        </Label>
        <div className="overflow-y-auto max-h-[60vh]">
          <ActivityGrid workoutData={profileWorkoutDates} />
        </div>
      </CardContent>
    )}
  </Card>
)}


      {userId === profileId && (
        <>
          <button
            onClick={() => router.push("/statistics/view")}
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
            View My Statistics
          </button>

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
            Account Settings
          </button>

          {/*<button
            onClick={() => router.push("/notification-settings")}
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
            Notification Settings
          </button>*/}
          <button
            onClick={() => router.push("/messages")}
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
            Open Messages
          </button>
          <button
            onClick={() => router.push("/profile/pastworkouts")}
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
            Past Workouts
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

      {userId == profileId && (
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
      )}

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
        onClick={() => setShowGroups(!showGroups)}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        {showGroups ? "Hide Public Groups" : "Show Public Groups"}
      </button>

      {showGroups && (
        <div className="mt-2">
          {groupList.length > 0 ? (
            <ul className="space-y-2">
              {groupList.map((g) => (
                <li
                  key={g.docID}
                  onClick={() => router.push(`/groups?docId=${g.docID}`)}
                  className="p-2 border rounded cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    {g.groupPic && (
                      <div className="w-10 h-10 rounded-full overflow-hidden relative">
                        <Image
                          src={g.groupPic}
                          alt={g.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold">{g.name}</h4>
                      <p className="text-sm text-gray-600">{g.description}</p>
                      <p className="text-xs text-gray-500">
                        {g.memberCount} member{g.memberCount !== 1 && "s"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 mt-1">No public groups found.</p>
          )}
        </div>
      )}

      <NavBar />
    </div>
  );
}
