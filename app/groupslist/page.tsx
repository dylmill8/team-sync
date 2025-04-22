"use client";

import "./groupslist.css";

import NavBar from "@/components/ui/navigation-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from "@/utils/firebaseConfig";
import {
  doc,
  DocumentData,
  DocumentReference,
  getDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import Image from "next/image";

interface GroupData {
  docID: string;
  name: string;
  description: string;
  picture: string; // will hold groupPic
  privacy: boolean;
  members: { [key: string]: string };
  events: Array<{ id: string }>;
  chat: DocumentReference;
  announcements: DocumentReference[];
}

export default function Groups() {
  const auth = getAuth(firebaseApp);
  const router = useRouter();
  const [userGroups, setUserGroups] = useState<GroupData[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;

        if (uid) {
          const userDocRef = doc(db, "Users", uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Fetch user groups
            if (userData.groups) {
              const groupDocs = await Promise.all(
                (userData.groups as DocumentReference<DocumentData>[]).map(
                  async (groupRef) => {
                    const groupDoc = await getDoc(groupRef);
                    if (!groupDoc.exists()) {
                      return null;
                    }
                    type FirestoreGroupData = {
                      name: string;
                      description: string;
                      groupPic?: string;
                      privacy: boolean;
                      members: { [key: string]: string };
                      events: Array<{ id: string }>;
                      chat: DocumentReference;
                      announcements: DocumentReference[];
                    };
                    const data = groupDoc.data() as FirestoreGroupData;
                    const { groupPic, ...rest } = data;
                    return {
                      docID: groupDoc.id,
                      picture: groupPic ?? "",
                      ...rest,
                    } as GroupData;
                  }
                )
              );
              setUserGroups(
                groupDocs.filter(
                  (doc) => doc !== null
                ) as unknown as GroupData[]
              );
            }
          }
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [auth]);

  return (
    <>
      <div className="groups-header">
        Your Groups
        <button
          className="create-group-button"
          onClick={() => {
            router.push("/group/create");
          }}
        >
          Create Group
        </button>
      </div>
      <ScrollArea className="rounded-md h-[70vh] max-w-[1100px] mx-auto">
        <div className="groups-list">
          {userGroups.length > 0 ? (
            <ul className="space-y-2">
              {userGroups.map((group, index) => (
                <li
                  key={index}
                  onClick={() => router.push(`/groups?docId=${group.docID}`)}
                  className="flex items-center p-4 border rounded-md shadow-md"
                >
                  {group.picture && (
                    <div className="w-20 h-20 mr-4 relative flex-shrink-0">
                      <Image
                        src={group.picture}
                        alt={`${group.name} thumbnail`}
                        fill
                        className="object-cover rounded-full"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <p className="text-gray-600">{group.description}</p>
                    <p className="text-gray-400">
                      {Object.keys(group.members).length} members
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-gray-500">No groups found.</p>
          )}
        </div>
      </ScrollArea>
      <NavBar />
    </>
  );
}
