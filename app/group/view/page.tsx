"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { arrayRemove, arrayUnion, doc, getDoc, DocumentData, updateDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import { getAuth } from "firebase/auth";
import { viewDocument } from "../../../utils/firebaseHelper.js";
import { useRouter, useSearchParams } from "next/navigation";

export default function ViewGroup() {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const [data, setData] = useState<DocumentData | null>(null);
  const groupId = useSearchParams().get("groupId");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper function to get number of members
  const getNumberOfMembers = (members: Record<string, any> | undefined): number => {
    if (members && typeof members === "object") {
      return Object.keys(members).length;
    }
    return 0;
  };
  const numberOfMembers = getNumberOfMembers(data?.members);

  // Check if user is a member already
  let isMember = false;
  if (userId && data?.members) {
    isMember = userId in data.members;
  }

  let isLeader = false;
  if (userId && data?.members) {
    const userPermission = data.members[userId]?.[1]; // Assuming [0] is the name, and [1] is the permission
    isLeader = userPermission === "leader" || userPermission === "owner";
  }

  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) {
        return;
      }
      const docRef = doc(db, "Groups", groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setData(docSnap.data());
        setLoading(false);
      } else {
        console.log("Group not found.");
      }
    };

    fetchGroup();
  }, [groupId]);

  // Leave group button
  const handleLeaveGroup = async () => {
    if (!userId) {
      alert("You must be logged in to leave a group.");
      return;
    }
    if (!groupId) {
      alert("Group ID is missing.");
      return;
    }
  
    try {
      const groupRef = doc(db, "Groups", groupId);
      const userRef = doc(db, "Users", userId);
  
      // Check if the group exists
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) {
        alert("Group not found.");
        return;
      }
  
      const groupData = groupSnap.data();
  
      // Check if user is in the group
      if (!groupData?.members?.[userId]) {
        alert("You are not a member of this group.");
        return;
      }
  
      // Remove the user from the group's members map
      const updatedMembers = { ...groupData.members };
      delete updatedMembers[userId];
  
      await updateDoc(groupRef, {
        members: updatedMembers,
      });
  
      // Remove the group from the user's groups array
      await updateDoc(userRef, {
        groups: arrayRemove(groupRef),
      });
  
      alert("You have left the group.");
      router.push("/groupslist"); // Redirect after leaving
    } catch (error) {
      alert("Failed to leave group.");
      console.error("Error leaving group:", error);
    }
  };


  // Join group button
  const handleJoinGroup = async () => {
    if (!userId) {
      alert("You must be logged in to join a group.");
      return;
    }
    if (!groupId) {
      alert("Group ID is missing.");
      return;
    }
    try {
      const groupRef = doc(db, "Groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) {
        alert("Group not found.");
        return;
      }
      const groupData = groupSnap.data();

      // Check if user is already in the members map
      if (groupData?.members?.[userId]) {
        alert("You are already a member of this group.");
        return;
      }
      
      // Get user data
      const userRef = doc(db, "Users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        alert("User not found.");
        return;
      }

      const userData = userSnap.data();

      // Add user to members map of the group
      await updateDoc(groupRef, {
        [`members.${userId}`]: [userData.username, "member"], // User becomes a member
      });

      // Add group reference to the user's groups array
      await updateDoc(userRef, {
        groups: arrayUnion(doc(db, "Groups", groupId)), // Adding the group reference to the user's 'groups' array
      });

      alert("Group joined successfully!");
      // Redirect after joining
      router.push(`/groupslist`);
    } catch (error) {
      alert("Failed to join group.");
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }
  if (!data) {
    return <p>Error: group not found.</p>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            {data?.name || "Error loading group name."}
          </CardTitle>
          <CardDescription className="text-sm font-medium text-gray-600 mb-4">
            {data?.description || "No description available."}
          </CardDescription>
        </CardHeader>
        <CardContent>

          {/* Display number of members */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Number of Members: {numberOfMembers}</Label>
          </div>
          
          {/* Conditional rendering based on user role */}
          {data.owner === userId ? (
            <p className="font-medium text-gray-700">
            You are the owner of this group.
            </p>
          ) : isMember ? (
            <Button
              onClick={handleLeaveGroup}
              className="my-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-all"
            >
              Leave Group
            </Button>
          ) : (
            <Button
              onClick={handleJoinGroup}
              className="my-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-all"
            >
              Join Group
            </Button>
          )}

          {isLeader && (
            <Button
              onClick={() => router.push(`/group/settings?groupId=${groupId}`)}
              className="my-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded transition-all"
            >
              Go to Settings
            </Button>
          )}

          <Button
            onClick={() => router.push(`/groups?docId=${groupId}`)}
            className="mt-2 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold rounded transition-all"
          >
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
