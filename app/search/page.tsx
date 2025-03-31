"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "../../utils/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function GroupSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allGroups, setAllGroups] = useState<any[]>([]); // Store all groups here
  const [filteredGroups, setFilteredGroups] = useState<any[]>([]); // This changes on search
  const router = useRouter();

  useEffect(() => {
    const fetchGroups = async () => {
      const q = query(collection(db, "Groups"), where("isPrivate", "==", false));
      const querySnapshot = await getDocs(q);
      const groupList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllGroups(groupList);
      setFilteredGroups(groupList); // Set both lists initially
    };

    fetchGroups();
  }, []);

  const handleSearch = () => {
    if (!searchTerm) {
      setFilteredGroups(allGroups); // Reset when search is cleared
      return;
    }

    const filtered = allGroups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGroups(filtered);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Search Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3"
          />
          <Button onClick={handleSearch} className="w-full">Search</Button>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4">
        {filteredGroups.map(group => (
          <Card 
            key={group.id} 
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => router.push(`/group/view?groupId=${group.id}`)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{group.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
