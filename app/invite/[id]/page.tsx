"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../../utils/firebaseConfig.js";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";

// This page redirects to the user's profile page if no ID is given in the profile page URL.

export default function InviteRedirect() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [error, setError] = useState("Loading...");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/"); // Redirect to login if not authenticated
        return;
      }

      if (!id) {
        setError("Invalid invite link.");
        setTimeout(() => router.push("/calendar"), 5000); // Redirect after 5 seconds
        return;
      }

      //console.log("Invite ID:", id);
      //console.log("1");

      let event = null;
      let group = null;

      // Get event invite document
      const eventDocRef = doc(db, "EventInvite", id);
      const eventDocSnap = await getDoc(eventDocRef);

      // Get group invite document
      const groupDocRef = doc(db, "GroupInvite", id);
      const groupDocSnap = await getDoc(groupDocRef);

      if (eventDocSnap.exists()) {
        //console.log("Event document data:", eventDocSnap.data());
        const eventRef = eventDocSnap.data().event; // Extract event reference
        event = typeof eventRef === "object" && eventRef.id ? eventRef.id : eventRef; // Use .id if it's a DocumentReference
      } else if (groupDocSnap.exists()) {
        //console.log("Group document data:", groupDocSnap.data());
        const groupRef = groupDocSnap.data().group; // Extract group reference
        group = typeof groupRef === "object" && groupRef.id ? groupRef.id : groupRef; // Use .id if it's a DocumentReference
      } else {
        setError("Invalid invite link. Does not exist as either an event invite or a group invite.");
        setTimeout(() => router.push("/calendar"), 5000); // Redirect after 5 seconds
        return;
      }

      //console.log("2");

      try {
        const inviteId = event || group;
        const inviteType = event ? "Event" : "Groups";

        if (typeof inviteId !== "string" || typeof inviteType !== "string") {
          console.error("Invalid inviteId or inviteType:", { inviteId, inviteType });
          setError("An error occurred while processing the invite.");
          setTimeout(() => router.push("/calendar"), 5000); // Redirect after 5 seconds
          return;
        }

        //console.log("2.1 / inviteId:", inviteId, "inviteType:", inviteType);

        const inviteRef = doc(db, inviteType, inviteId);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          console.error("Invite document does not exist:", { inviteId, inviteType });
          setError("This invite link is invalid or expired.");
          setTimeout(() => router.push("/calendar"), 5000); // Redirect after 5 seconds
          return;
        }

        //console.log("Invite document data:", inviteSnap.data());
        //console.log("3");

        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError("User not authenticated.");
          return;
        }
        const userDocRef = doc(db, "Users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        //console.log("4");

        if (event) {
          if (userDocSnap.exists()) {
            const eventRef = doc(db, "Event", event); // Create a DocumentReference for the event
            await updateDoc(userDocRef, {
              events: arrayUnion(eventRef) // Add the DocumentReference to the events array
            });
            //console.log("5");
          } else {
            setError("User not found.");
            setTimeout(() => router.push("/calendar"), 5000); // Redirect after 5 seconds
            return;
          }
        } else {
          // TODO: Add user to group, ask TJ about how to do this
          const groupRef = doc(db, "Groups", group);
          
          const userSnap = await getDoc(userDocRef);      
          const userData = userSnap.data();
          
          if (!userData) {
            setError("User data not found.");
            return;
          }
    
          // Add user to members map of the group
          await updateDoc(groupRef, {
            [`members.${user.uid}`]: [userData.username, "member"],
          });

          // Add group to user's groups array
          await updateDoc(userDocRef, {
            groups: arrayUnion(groupRef)
          });
        }

        router.push(event ? `/event/view?docId=${event}` : `/groups?docId=${group}`); // Redirect user with query parameter for groups
      } catch (err) {
        setError("An error occurred while processing the invite.");
        console.error(err);
        setTimeout(() => router.push("/calendar"), 5000); // Redirect after 5 seconds
      }
    });

    return () => unsubscribe();
  }, [router, id]);

  return (
    <div>
      {error}
    </div>
  );
}