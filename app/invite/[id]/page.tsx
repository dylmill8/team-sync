"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../../utils/firebaseConfig.js";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";

// This page redirects to the user's profile page if no ID is given in the profile page URL.

export default function InviteRedirect() {
  const router = useRouter();
  const { id } = useParams();
  //const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/"); // Redirect to login if not authenticated
        return;
      }

      if (!id) {
        setError("Invalid invite link.");
        return;
      }

      console.log("Invite ID:", id);
      console.log("1");

      let event = null;
      let group = null;

      // Get event invite document
      const eventDocRef = doc(db, "EventInvite", id);
      const eventDocSnap = await getDoc(eventDocRef);

      // Get group invite document
      const groupDocRef = doc(db, "GroupInvite", id);
      const groupDocSnap = await getDoc(groupDocRef);

      if (eventDocSnap.exists()) {
        console.log("Event document data:", eventDocSnap.data());
        const eventRef = eventDocSnap.data().event; // Extract event reference
        event = typeof eventRef === "object" && eventRef.id ? eventRef.id : eventRef; // Use .id if it's a DocumentReference
      } else if (groupDocSnap.exists()) {
        console.log("Group document data:", groupDocSnap.data());
        const groupRef = groupDocSnap.data().group; // Extract group reference
        group = typeof groupRef === "object" && groupRef.id ? groupRef.id : groupRef; // Use .id if it's a DocumentReference
      } else {
        console.error("Neither event nor group document exists.");
        setError("Invalid invite link.");
        return;
      }

      console.log("2");

      try {
        const inviteId = event || group;
        const inviteType = event ? "Event" : "Groups";

        if (typeof inviteId !== "string" || typeof inviteType !== "string") {
          console.error("Invalid inviteId or inviteType:", { inviteId, inviteType });
          setError("An error occurred while processing the invite.");
          return;
        }

        console.log("2.1 / inviteId:", inviteId, "inviteType:", inviteType);

        const inviteRef = doc(db, inviteType, inviteId);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          console.error("Invite document does not exist:", { inviteId, inviteType });
          setError("This invite link is invalid or expired.");
          return;
        }

        console.log("Invite document data:", inviteSnap.data());
        //console.log("3");

        const user = auth.currentUser;
        const userDocRef = doc(db, "Users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        console.log("4");

        if (event) {
          if (userDocSnap.exists()) {
            const eventRef = doc(db, "Event", event); // Create a DocumentReference for the event
            await updateDoc(userDocRef, {
              events: arrayUnion(eventRef) // Add the DocumentReference to the events array
            });
            console.log("5");
          } else {
            setError("User not found.");
            return;
          }
        } else {
          // TODO: Add user to group, ask TJ about how to do this
        }

        router.push(event ? `/event/view?docId=${event}` : `/group/${group}`); // Redirect user with query parameter
      } catch (err) {
        setError("An error occurred while processing the invite.");
        console.error(err);
      }
    });

    return () => unsubscribe();
  }, [router, id]);

  return (
    <div>
      <h1>Loading...</h1>
      {error}
    </div>
  );
}