"use client";

import { useRef, useState, useEffect, Suspense } from "react"; //useRef
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown";

const CreateGroupPage = () => {
  const groupPicInputRef = useRef(null);
  const [groupPicture, setGroupPicture] = useState<File | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [userData, setUserData] = useState({ email: "", username: "" });
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false); // Privacy toggle state
  const [tags, setTags] = useState<string[]>([]);
  // eslint-disable-next-line prefer-const
  let [availableTags, setAvailableTags] = useState<string[]>(["Team", "Club", "Sports", "Beginner", "Intermediate", "Advanced", "Professional", "Climbing", "Basketball", "Baseball", "Soccer", "Volleyball", "Hockey", "American Football", "Track/Field", "Training", "Gym", "Workouts", "Bodybuilding"]);

  const toggleTag = (tag: string) => {
    setTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag) // Remove tag if already selected
        : [...prevTags, tag] // Add tag if not selected
    );
  };

  useEffect(() => { // get username and email of owner
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
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
          tags: tags
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

          <div className="mb-4">
            <Label className="text-sm font-medium">Group Tags</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  Select Tags
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {/* Existing tags */}
                {availableTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag}
                    onSelect={(e) => {
                      e.preventDefault(); // Prevent the dropdown from closing
                      toggleTag(tag); // Toggle the tag selection
                    }}
                    className={tags.includes(tag) ? "bg-gray-200 dark:bg-gray-700" : ""}
                  >
                    {tags.includes(tag) ? `✓ ${tag}` : tag}
                  </DropdownMenuItem>
                ))}

                {/* Add new tag input */}
                <div className="mt-2 p-2 border-t border-gray-300">
                  <div>
                    <Input
                      name="newTag"
                      placeholder="Add new tag"
                      className="w-full mb-2"
                      onKeyDown={(e) => {
                        e.stopPropagation(); // Prevent dropdown from moving away on type
                        if (e.key === "Enter") {
                          e.preventDefault(); 
                          const newTagInput = e.currentTarget as HTMLInputElement;
                          const newTag = newTagInput.value.trim();
                          if (newTag && !availableTags.includes(newTag)) {
                            setAvailableTags((prev) => [...prev, newTag]); // Add new tag to availableTags
                            toggleTag(newTag); 
                            newTagInput.value = ""; 
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        e.preventDefault(); // Prevent default button behavior
                        const newTagInput = document.querySelector(
                          'input[name="newTag"]'
                        ) as HTMLInputElement;
                        const newTag = newTagInput.value.trim();
                        if (newTag && !availableTags.includes(newTag)) {
                          setAvailableTags((prev) => [...prev, newTag]); // Add new tag to availableTags
                          toggleTag(newTag); // Automatically select the new tag
                          newTagInput.value = ""; // Clear the input field
                        }
                      }}
                      className="w-full"
                    >
                      Add Tag
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="mt-2">
              <div className="text-sm font-medium mb-1"> Selected Tags:</div> {/* Ensure this stays on a separate line */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-sm font-medium rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
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
          <div className="mb-4 flex flex-col">
            <Label className="text-sm font-medium">Group Picture</Label>
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

export default function CreateGroup() {
  return (
    <Suspense fallback={<div>Loading Past Workouts...</div>}>
      <CreateGroupPage />
    </Suspense>
  );
}