"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { updateDoc, doc, getDoc, DocumentData } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
//import { getAuth } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

// Define the type for a member object
interface Member {
  userId: string;
  username: string;
  permission: string;
}

const PermissionsPage = () => {
  //const auth = getAuth();
  //const userId = auth.currentUser?.uid;
  const [data, setData] = useState<DocumentData | null>(null);
  const groupId = useSearchParams()?.get("groupId") ?? "";
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Fetch group data and members
  useEffect(() => {
    const fetchGroup = async () => {

      if (!groupId) return;

      const docRef = doc(db, "Groups", groupId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const group = docSnap.data();
        setData(group);
        setOwnerId(group.owner); // Extract owner ID from the owner document reference

        const membersArray: Member[] = [];

        if (group.members) {
          Object.entries(group.members).forEach(([userId, value]) => {
            const [username, permission] = value as [string, string];
            membersArray.push({
              userId,
              username,
              permission,
            });
          });
        }

        setMembers(membersArray);
        setLoading(false);
      } else {
        console.log("Group not found.");
      }
    };

    fetchGroup();
  }, [groupId]);

  // Handle dropdown selection and update permission immediately
  const handleActionChange = (userId: string, action: string) => {
    setMembers((prevMembers) => {
      // Map over the previous members to modify or remove as needed
      const updatedMembers = prevMembers.map((member) => {
        if (member.userId === userId) {
          if (action === "promote") {
            return { ...member, permission: "leader" }; // Promote to admin
          } else if (action === "demote") {
            return { ...member, permission: "member" }; // Demote to member
          }
        }
        return member;
      });

      return updatedMembers;
    });
  };

  const handleApplyChanges = async () => {
    if (!groupId) return;

    try {
      const docRef = doc(db, "Groups", groupId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const group = docSnap.data();
      const updatedMembers = { ...group.members };

      // Apply each change directly from the members array
      members.forEach((member) => {
        if (member.permission !== group.members[member.userId][1]) {
          // Only apply changes if permission has actually changed
          updatedMembers[member.userId][1] = member.permission; // Update permission
        }
      });

      // Update Firestore with the new members
      await updateDoc(docRef, { members: updatedMembers });

      // Refresh local state
      setMembers((prevMembers) => prevMembers.filter(Boolean) as Member[]); // Ensure no null values

      alert("Changes applied successfully!");
    } catch (error) {
      console.error("Error applying changes:", error);
      alert("Failed to apply changes.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setMembers((prevMembers) => {
      // Remove from the local state
      const updatedMembers = prevMembers.filter(
        (member) => member.userId !== userId
      );
      return updatedMembers;
    });

    if (!groupId) return;

    try {
      const docRef = doc(db, "Groups", groupId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return;

      const group = docSnap.data();
      const updatedMembers = { ...group.members };

      // Remove the member from the Firestore members object
      delete updatedMembers[userId];

      // Update Firestore with the new members list
      await updateDoc(docRef, { members: updatedMembers });

      // Now remove the group reference from the user's document
      const userDocRef = doc(db, "Users", userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userDocData = userDocSnap.data() as DocumentData; // Use DocumentData type here
        const updatedGroups =
          userDocData?.groups?.filter(
            (groupRef: { id: string }) => groupRef.id !== groupId // Safely check for groupId removal
          ) || [];
        await updateDoc(userDocRef, { groups: updatedGroups });
      }
      alert("Member removed successfully!");
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-green-600 text-2xl font-bold">
            Permissions Page
          </CardTitle>
          <CardDescription className="text-sm font-medium text-gray-600 mb-4">
            {data?.name || "Error loading group name."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Displaying the list of members */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Members</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <ul className="space-y-4">
                {members.map((member, index) => (
                  <li key={index} className="flex items-center space-x-4">
                    <div className="flex space-x-4 w-full">
                      <input
                        type="text"
                        value={`${member.username} - ${member.permission}`}
                        readOnly
                        className="flex-1 px-2 w-36 py-1 border border-gray-300 rounded-md"
                      />
                      {/* Only show dropdown if the member is not the owner */}
                      {member.userId !== ownerId && (
                        <select
                          onChange={(e) =>
                            handleActionChange(member.userId, e.target.value)
                          }
                          className="border border-gray-300 px-2 py-1 w-20 rounded-md"
                        >
                          <option value="Select Action">Select Action</option>
                          <option value="promote">Promote</option>
                          <option value="demote">Demote</option>
                        </select>
                      )}
                      {member.userId !== ownerId && (
                        <Button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="bg-red-600 text-white px-4 py-2 w-15 rounded-md ml-4"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            className="w-full mt-4 bg-blue-600 text-white"
            onClick={handleApplyChanges}
          >
            Save Changes
          </Button>
          <Button
            onClick={() => router.push("/groupslist")}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all mt-4"
          >
            Back to Groups List
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Permissions() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PermissionsPage />
    </Suspense>
  );
}
