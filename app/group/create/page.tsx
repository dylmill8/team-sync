"use client";

import { useRef, useState, useEffect } from "react"; //useRef
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setDoc, updateDoc, arrayUnion, doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";
import { viewDocument } from "../../../utils/firebaseHelper.js";
import { onAuthStateChanged } from "firebase/auth";
import { PutBlobResult } from "@vercel/blob";
import { group } from "console";


export default function CreateGroup() {
  const groupPicInputRef = useRef(null);
  const [groupPicture, setGroupPicture] = useState<File | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [userData, setUserData] = useState({ email: "", username: "" });
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const userId = auth.currentUser?.uid;
  const [isPrivate, setIsPrivate] = useState(false); // Privacy toggle state


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
          groupPic: "",
          description: groupDescription,
          owner: userId,
          isPrivate,
          members: {
            [userId]: [userData.username, "owner"], // Store as an array with name and role
          },
        });

        //Add group to the user's groups array
        const userDocRef = doc(db, "Users", userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Update the user's document with the new group ID
          await updateDoc(userDocRef, {
            groups: arrayUnion(doc(db, "Groups", docRef.id)), // Adding the group reference to the user's 'groups' array
          });
        }

        if (groupPicture) {
          try {
            console.log("groupPicture:", groupPicture);
            console.log("type:", groupPicture.type);
            console.log("name:", groupPicture.name);
            console.log("size:", groupPicture.size);
            fetch("../api/blob/upload", {
              method: "POST",
              headers: {
                "content-type": groupPicture?.type || "application/octet-stream",
              },
              body: groupPicture,
            })
              .then(async (result) => {
                // Check if the result is successful
                if (!result.ok) {
                  throw new Error("Failed to upload the picture");
                }
                const { url } = await result.json() as PutBlobResult;
        
                // Now update the group document with the picture URL and other data
                await setDoc(doc(db, "Groups", docRef.id), {
                  groupPic: url,
                  name: groupName,
                  description: groupDescription,
                  owner: userId,
                  isPrivate,
                  members: {
                    [userId]: [userData.username, "owner"],
                  },
                }, { merge: true });
              })
              .catch((error) => {
                console.error("Upload failed", error);
              });
          } catch (error) {
            console.error("uppload failed", error);
          }
        }
      
        setGroupName("");
        setGroupDescription("");
        setGroupPicture(null);
        alert("Group Created Successfully");
        router.push(`/group/view?groupId=${docRef.id}`);
        } catch (e) {
            if (e) {
            alert("Error creating group");
            }
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

          {/* Privacy Toggle Switch */}
          <div className="mb-4 flex items-center">
            <Label className="text-sm font-medium mr-2">Private Group</Label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="toggle-checkbox h-5 w-5 cursor-pointer"
            />
          </div>



          <div className="mb-4 flex flex-col items-center">
            <Label className="text-sm font-medium">Profile Picture</Label>
            <Input
              type="file"
              accept="image/*"
              className="mt-2"
              ref={groupPicInputRef} // Attach ref to the file input
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setGroupPicture(e.target.files[0]); // Save the file in state
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
            onClick={() => router.push("/groupslist")} 
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-all mt-4"
          >
            Back to Groups List
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
