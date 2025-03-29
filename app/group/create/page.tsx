"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";
import { viewDocument } from "../../../utils/firebaseHelper.js";
import { onAuthStateChanged } from "firebase/auth";


export default function CreateGroup() {
  const groupPicInputRef = useRef(null);
  const [groupPicture, setGroupPicture] = useState<File | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [userData, setUserData] = useState({ email: "", username: "" });
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const userId = auth.currentUser?.uid;

  useEffect(() => { // get username and email of owner
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await viewDocument("Users", user.uid);
        if (userDoc) {
          setUserData({
            email: userDoc.email || "",
            username: userDoc.username || "",
          });
        }
      } else {
        setUserData({ email: "", username: "" });
      }
    });
  
    return () => unsubscribe();
  }, [auth]);
  
  const handleCreateGroup = async () => { // create group
    if (!groupName.trim()) {
      alert("Group name cannot be blank.");
      return;
    }
    if (!groupDescription.trim()) {
      alert("Group description cannot be blank.");
      return;
    }
    if (!userId) {
      alert("You must be logged in to create a group.");
      return;
    }
    
    try {
        const docRef = await addDoc(collection(db, "Groups"), {
          name: groupName,
          description: groupDescription,
          owner: userId,
          members: {
            [userId]: [userData.username, "leader"], // Store as an array with name and role
          },
        });

        if (groupPicture) {
            const formData = new FormData();
            formData.append("image", groupPicture);
            try {
            const res = await fetch(`/api/upload?groupId=${docRef.id}`, {
                method: "POST",
                body: formData,
            });
    
            if (res.ok) {
                alert("Upload successful!");
            } else {
                const errorData = await res.json();
                alert(`Upload failed! ${errorData.error || "Unknown error"}`);
            }
            } catch (error) {
            alert("Upload failed! Network error.");
            }
        }
      
        setGroupName("");
        setGroupDescription("");
        setGroupPicture(null);
        alert("Group Created Successfully");
        router.push("/groups");
        } catch (e) {
            alert("Error creating group");
        }
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">Create Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label className="text-sm font-medium">Group Name</Label>
            <Input 
              type="text" 
              placeholder="Enter group name" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="mb-4">
            <Label className="text-sm font-medium">Group Description</Label>
              <textarea
                placeholder="Enter group description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={4} // Sets the minimum number of rows (adjustable)
                className="mt-1 p-2 w-full border rounded-md resize-none"
              />
          </div>

          <div className="mb-4 flex flex-col items-center">
            <Label className="text-sm font-medium">Group Picture</Label>
            <Input 
              type="file"
              accept="image/*"
              className="mt-2" 
              ref={groupPicInputRef} 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setGroupPicture(e.target.files[0]);
                }
              }} 
            />
          </div>

          <Button 
            onClick={handleCreateGroup} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
          >
            Create Group
          </Button>
          
          <Button 
            onClick={() => router.push("/")} 
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all mt-4"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
