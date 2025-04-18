"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "../../utils/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import NavBar from "@/components/ui/navigation-bar";

interface Group {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  members?: Record<string, [string, string]>; // [username, permission]
  events?: string[];
  tags: string[];
}

export default function GroupSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [minMembers, setMinMembers] = useState(""); // Minimum members filter
  const [minEvents, setMinEvents] = useState(""); // Minimum events filter
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [showFilters, setShowFilters] = useState(false); // Toggle filter menu
  const router = useRouter();

  useEffect(() => {
    const fetchGroups = async () => {
      const q = query(collection(db, "Groups"), where("isPrivate", "==", false));
      const querySnapshot = await getDocs(q);
      const groupList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          isPrivate: data.isPrivate || false,
          members: data.members || {}, // Ensure members is always an object
          events: data.events || [], // Ensure events is always an array
          tags: data.tags || [], // Ensure tags is always an array
        };
      });
      setAllGroups(groupList);
      setFilteredGroups(groupList);
    };

    fetchGroups();
  }, []);

  const handleSearch = () => {
    let filtered = allGroups;

    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (minMembers) {
      filtered = filtered.filter(group =>
        group.members && Object.keys(group.members).length >= parseInt(minMembers, 10)
      );
    }

    if (minEvents) {
      const minEventsNum = parseInt(minEvents, 10);
      filtered = filtered.filter(group => (group.events?.length || 0) >= minEventsNum);
    }

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
          <div className="flex justify-between">
            <Button onClick={handleSearch} className="w-[80%]">Search</Button>
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="ml-2 w-[18%]"
            >
              Filters
            </Button>
          </div>
          
          {/* Filter dropdown menu with animation */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-100 rounded-lg shadow-md">
              <Input
                type="number"
                placeholder="Min members"
                value={minMembers}
                onChange={(e) => {
                  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setMinMembers(value.toString());
                }}
                className="mb-2"
              />
              <Input
                type="number"
                placeholder="Min events"
                value={minEvents}
                onChange={(e) => {
                  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setMinEvents(value.toString());
                }}
                className="mb-2"
              />
              <Button onClick={handleSearch} className="w-full">Apply Filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display filtered groups */}
      <div className="mt-6 space-y-4">
        {filteredGroups.map(group => (
          <Card 
            key={group.id} 
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => router.push(`/group/view?groupId=${group.id}`)}
          >
            <CardHeader style={{ padding: 16, paddingBottom: 0 }}>
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <div className="flex flex-wrap">
                {group.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-sm font-medium rounded-md mb-2 mr-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{group.description}</p>
              <p className="text-sm text-gray-500">Members: {Object.keys(group.members || {}).length}</p>
              <p className="text-sm text-gray-500">Events: {group.events?.length || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <NavBar />
    </div>
  );
}
