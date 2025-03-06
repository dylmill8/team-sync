"use client";

import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useState, useEffect } from "react";
import { db, firebaseApp } from "@/utils/firebaseConfig";
import {
  doc,
  getDoc,
  arrayRemove,
  arrayUnion,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "@firebase/auth";

function RSVPStatus({ eventId }) {
  const auth = getAuth(firebaseApp);
  const uid = auth.currentUser?.uid;
  const [username, setUsername] = useState("");

  const [status, setStatus] = useState("");

  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const docRef = doc(db, "Event", eventId);
        const docSnap = await getDoc(docRef);
        const data = docSnap.data();

        if (data?.RSVP_yes.includes(username)) {
          setStatus("yes");
        } else if (data?.RSVP_no.includes(username)) {
          setStatus("no");
        } else {
          setStatus("maybe");
          if (!data?.RSVP_maybe.includes(username)) {
            await updateDoc(docRef, {
              RSVP_maybe: arrayUnion(username),
            });
          }
        }
      } catch (e) {
        console.log("error retrieving user's inital RSVP status");
      }
    };
    fetchInitialStatus();
  });

  const fetchUsername = async () => {
    try {
      const docRef = doc(db, "Users", uid || "uid");
      const docSnap = await getDoc(docRef);
      const user = docSnap.data()?.username;

      if (user) {
        setUsername(user);
      }
    } catch (e) {
      console.error("error fetching user's name", e);
    }
  };
  fetchUsername();

  const handleStatusChange = async (newTab) => {
    try {
      const docRef = doc(db, "Event", eventId);
      const oldArray = `RSVP_${status}`;
      await updateDoc(docRef, {
        [oldArray]: arrayRemove(username),
      });

      // set status
      setStatus(newTab);

      // update status in rsvp lists
      const arrayName = `RSVP_${newTab}`;
      await updateDoc(docRef, {
        [arrayName]: arrayUnion(username),
      });
    } catch (e) {
      console.error("error updating user rsvp status", e);
    }
  };

  return (
    <Tabs
      value={status}
      onValueChange={handleStatusChange}
      className="p-0 my-1"
    >
      <TabsList className="p-0 m-0 grid w-full grid-cols-3">
        <TabsTrigger className="m-1 p-1" value="yes">
          Yes
        </TabsTrigger>
        <TabsTrigger className="m-1 p-1" value="maybe">
          Maybe
        </TabsTrigger>
        <TabsTrigger className="m-1 p-1" value="no">
          No
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export default RSVPStatus;
