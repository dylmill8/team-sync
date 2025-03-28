"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import { useRouter } from "next/navigation";

export default function CreateGroup() {
  const groupPicInputRef = useRef(null);
  const [groupPicture, setGroupPicture] = useState<File | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const router = useRouter();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Group name cannot be blank.");
      return;
    }
    if (!groupDescription.trim()) {
      alert("Group description cannot be blank.");
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, "Groups"), {
        name: groupName,
        description: groupDescription,
      });

      if (groupPicture) { // NOT WORKING NEED API CALLS
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
            <Input 
              type="text" 
              placeholder="Enter group description" 
              value={groupDescription} 
              onChange={(e) => setGroupDescription(e.target.value)}
              className="mt-1"
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
