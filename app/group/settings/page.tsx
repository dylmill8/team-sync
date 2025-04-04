"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import { useRouter, useSearchParams } from "next/navigation";
import { arrayRemove } from "firebase/firestore";  
import { Label } from "@/components/ui/label"; 

interface GroupData {
  name: string;
  description: string;
  isPrivate: boolean;
  owner: string;
  events?: { path: string }[]; // Assuming events contain references as paths
}

function GroupSettingsContent() {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const groupId = useSearchParams().get("groupId");
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  
  const [isPrivate, setIsPrivate] = useState(false); // Track privacy setting


  // Fetch the group data
  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId) return;
      
      const docRef = doc(db, "Groups", groupId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const group = docSnap.data();
        setGroupData({
          name: group.name || "",
          description: group.description || "",
          isPrivate: group.isPrivate || false,
          owner: group.owner || "",
          events: group.events || [],
        });
        setGroupName(group.name);
        setGroupDescription(group.description);
        setIsPrivate(group.isPrivate || false);
      } else {
        console.log("Group not found.");
      }
      setLoading(false);
    };
    
    fetchGroupData();
  }, [groupId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setImage(file);
    }
  };


  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!image) {
      alert("Please select an image!");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("image", image);

    try {
      const res = await fetch(`/api/uploadGroup?groupId=${groupId}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }
      alert("Upload successful!");
    } catch (error) {
      console.error("Error removing member:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateGroupSettings = async () => {
    if (!userId || !groupId || !groupData) {
      alert("Error: Invalid group or user.");
      return;
    }
    try {
      const groupRef = doc(db, "Groups", groupId);
      await updateDoc(groupRef, {
        name: groupName,
        description: groupDescription,
        isPrivate: isPrivate, // Update privacy setting
        // Add logic to handle the group picture if necessary
      });
      alert("Group settings updated!");
      router.push("/groupslist");
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!userId || !groupId || !groupData) {
      alert("Error: Invalid group or user.");
      return;
    }

    if (userId !== groupData.owner) {
      alert("You must be the group owner to delete the group.");
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
      router.push("/groupslist");
    } catch (error) {
      console.error("Error removing member:", error);
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
        
          </div>

          <form onSubmit={handleUpload} style={{ marginBottom: "20px" }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              style={{ display: "block", margin: "10px auto" }}
            />
            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: "10px 15px",
                backgroundColor: uploading ? "#ccc" : "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: uploading ? "not-allowed" : "pointer",
                width: "100%",
              }}
            >
              {uploading ? "Uploading..." : "Upload New Image"}
            </button>
          </form>

          <div className="mb-4 flex items-center justify-between">
            <Label className="text-sm font-medium">Private Group</Label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="toggle-checkbox"
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
            <Button 
              onClick={() => router.push("/groupslist")} 
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all mt-4"
            >
              Back to Groups List
            </Button>
          </div>

              

        </CardContent>
      </Card>
    </div>
  );
}

export default function GroupSettings() {
  return (
    <Suspense fallback={<p>Loading settings...</p>}>
      <GroupSettingsContent />
    </Suspense>
  );
}