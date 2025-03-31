"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import { useRouter, useSearchParams } from "next/navigation";
import { arrayRemove } from "firebase/firestore";  

export default function GroupSettings() {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const [groupData, setGroupData] = useState<any>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupPicture, setGroupPicture] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const groupId = useSearchParams().get("groupId");
  const router = useRouter();

  // Fetch the group data
  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId) return;
      
      const docRef = doc(db, "Groups", groupId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const group = docSnap.data();
        setGroupData(group);
        setGroupName(group.name);
        setGroupDescription(group.description);
      } else {
        console.log("Group not found.");
      }
      setLoading(false);
    };
    
    fetchGroupData();
  }, [groupId]);

  const handleUpdateGroupSettings = async () => {
    if (!userId || !groupId || !groupData) {
      alert("Error: Invalid group or user.");
      return;
    }

    if (userId !== groupData.owner) {
      alert("You must be the group leader to make changes.");
      return;
    }

    try {
      const groupRef = doc(db, "Groups", groupId);
      await updateDoc(groupRef, {
        name: groupName,
        description: groupDescription,
        // Add logic to handle the group picture if necessary
      });
      alert("Group settings updated!");
    } catch (error) {
      alert("Failed to update group settings.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!userId || !groupId || !groupData) {
      alert("Error: Invalid group or user.");
      return;
    }

    if (userId !== groupData.owner) {
      alert("You must be the group leader to delete the group.");
      return;
    }

    try {
      const groupRef = doc(db, "Groups", groupId);

      //ITERATE THROUGH ALL EVENTS AND DELETE EVENTS
      if (groupData.events && Array.isArray(groupData.events)) {
        for (const eventRefPath of groupData.events) {
          const eventRef = doc(db, eventRefPath.path); // Convert reference path to doc ref

          // Remove event reference from the group
          await updateDoc(groupRef, {
            events: arrayRemove(eventRef),
          });

          // Delete the event document
          await deleteDoc(eventRef);
        }
      }

      //delete group 
      await deleteDoc(groupRef);

      alert("Group deleted successfully.");


      // Redirect to home or groups page
      router.push("/");
    } catch (error) {
      alert("Failed to delete group.");
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!groupData) {
    return <p>Error: Group not found.</p>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">Group Settings</CardTitle>
          <CardDescription className="text-center text-sm font-medium text-gray-600">
            Manage your group settings below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium">Group Description</label>
            <Textarea
              placeholder="Enter group description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium">Group Profile Picture</label>
            <Input
              type="file"
              accept="image/*"
              className="mt-2"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setGroupPicture(e.target.files[0]);
                }
              }}
            />
          </div>

          <div className="flex justify-between">
            <Button onClick={handleUpdateGroupSettings} className="bg-blue-600 text-white">
              Save Changes
            </Button>
            <Button onClick={handleDeleteGroup} className="bg-red-600 text-white">
              Delete Group
            </Button>
          </div>
          <div className="mt-4 text-center">
            {/* Only show the button if the current user is the leader */}
            {groupData.owner === userId && (
              <Button

                onClick={() => router.push(`/group/permissions?groupId=${groupId}`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-all mt-4"
              >
                Modify Permissions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
