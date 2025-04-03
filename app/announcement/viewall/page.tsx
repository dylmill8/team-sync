"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserAnnouncementCard from "@/components/ui/user-announcement-card";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db, firebaseApp } from "@/utils/firebaseConfig";
import { doc, DocumentReference, getDoc } from "firebase/firestore";

export default function AnnouncementViewAll() {
  const router = useRouter();
  const auth = getAuth(firebaseApp);

  const [uid, setUid] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<DocumentReference[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const getUserAnnouncements = async () => {
      if (!uid) {
        return;
      }

      try {
        const userDocRef = doc(db, "Users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const groupList = userData.groups || [];

          console.log(groupList);

          for (const group of groupList) {
            const groupDoc = await getDoc(group);
            if (groupDoc.exists()) {
              const groupData = groupDoc.data();
              const announcementList =
                (groupData as { announcements?: DocumentReference[] }).announcements || [];

              setAnnouncements((prevAnnouncements) => [
                ...announcementList,
                ...prevAnnouncements,
              ]);
            }
          }
        }
      } catch (e) {
        console.log("Error getting user announcements:", e);
      }
    };

    getUserAnnouncements();
  }, [uid]);

  return (
    <div className="flex items-center justify-center">
      <Card className="my-4 w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <Button
            className="mb-2 mx-2 w-1/4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-all"
            onClick={() => router.push("/profile")}
          >
            Back
          </Button>
          <CardTitle className="text-center text-2xl font-semibold">
            All Group Announcements
          </CardTitle>
        </CardHeader>

        <CardContent>
          {announcements.map((announcement, index) => {
            return (
              <UserAnnouncementCard
                announcementRef={announcement}
                key={index}
              ></UserAnnouncementCard>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
