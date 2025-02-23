"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../utils/firebaseConfig"; 

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProfilePicture(event.target.files[0]);
    }
  };

  // Handle registration logic
  const handleRegister = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    alert(`Email Registered: ${email}, username: ${username}`);
    // TODO: Send data to Firebase here
    // Add user details to Firestore

    try {
      const docRef = await addDoc(collection(db, "User"), {
        email: email,
        username: username,
        password: password, // ⚠ WARNING: Store passwords securely using Firebase Auth!
      });    
      console.log("User registered with ID: ", docRef.id);
      alert(`User Registered: ${username}`);

      // Reset form fields
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6 shadow-lg bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">Register</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Username */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Email</Label>
            <Input 
              type="text" 
              placeholder="Enter email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Display Name */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Display Name</Label>
            <Input 
              type="text" 
              placeholder="Enter username name" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Password</Label>
            <Input 
              type="password" 
              placeholder="Enter password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Confirm Password</Label>
            <Input 
              type="password" 
              placeholder="Confirm password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Profile Picture Upload */}
          <div className="mb-4 flex flex-col items-center">
            <Label className="text-sm font-medium">Profile Picture</Label>
            <Input type="file" accept="image/*" onChange={handleFileChange} className="mt-2" />
            
            {/* Avatar Preview */}
            {profilePicture && (
              <Avatar className="mt-2 w-20 h-20">
                <AvatarImage src={URL.createObjectURL(profilePicture)} />
                <AvatarFallback>PP</AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Register Button */}
          <Button 
            onClick={handleRegister} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all"
          >
            Register
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}