"use client";

import "./groupslist.css";

import NavBar from "@/components/ui/navigation-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";
import { db } from '@/utils/firebaseConfig';
import { doc, DocumentData, DocumentReference, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

interface GroupData {
  docID: string;
  name: string;
  description: string;
  picture: string;
  privacy: boolean;
  members: { [key: string]: string; };
  events: Array<{ id: string; }>;
  chat: DocumentReference;
  announcements: DocumentReference[]; // changed from DocumentReference to an array
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
                const groupDocs = await Promise.all(
                  (userData.groups as DocumentReference<DocumentData>[]).map(async (groupRef) => {
                    const groupDoc = await getDoc(groupRef);
                    if (!groupDoc.exists()) {
                      return null;
                    }
                    return {
                      docID: groupDoc.id,
                      ...groupDoc.data(),
                    };
                  }),
                );
                setUserGroups(groupDocs.filter((doc) => doc !== null) as unknown as GroupData[]);
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
                      <li key={index} 
                      onClick={() => {
                        router.push(`/groups?docId=${group.docID}`)
                      }}
                      className="p-4 border rounded-md shadow-md">
                        <h3 className="text-lg font-semibold">{group.name}</h3>
                        <p className="text-gray-600">{group.description}</p>
                        <p className="text-gray-400">{Object.keys(group.members).length} members</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-gray-500">No groups found.</p>
                )}
              </div>
            </ScrollArea>
            <NavBar/>
        </>
    );
}