"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { doc, getDoc, DocumentData, updateDoc } from "firebase/firestore";
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
      const userDoc = await viewDocument("Users", userId);
      if (!userDoc || !userDoc.username) {
        alert("User data not found.");
        return;
      }

      // Add user to members map
      await updateDoc(groupRef, {
        [`members.${userId}`]: [userDoc.username, "member"],
      });
      alert("Group joined");

      // Redirect after joining
      router.push(`/group/search`);
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
          <Button
            onClick={handleJoinGroup}
            className="my-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-all"
          >
            Join Group
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
