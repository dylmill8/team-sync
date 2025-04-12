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
}

interface Event {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  rsvpYes: number;
}

export default function GroupSearch() {
  const [searchMode, setSearchMode] = useState<"group" | "event">("group");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false); // Toggle filter menu
  const router = useRouter();
  
  // GROUPS SEARCH
  const [minMembers, setMinMembers] = useState("");
  const [minEvents, setMinEvents] = useState("");
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);

  // EVENTS SEARCH
  const [minRSVP, setMinRSVP] = useState("");
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

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
        };
      });
      setAllGroups(groupList);
      setFilteredGroups(groupList);
    };

    fetchGroups();

    const fetchEvents = async () => {
      const q = query(collection(db, "Event"), where("private", "==", false));
      const querySnapshot = await getDocs(q);
      const eventList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const rsvpMap = data.RSVP || {};
        const rsvpYesCount = Object.values(rsvpMap).filter(status => status === "yes").length;
        console.log("RSVP map:", rsvpMap);
console.log("Counted yes responses:", rsvpYesCount);
        return {
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          isPrivate: data.private || false,
          rsvpYes: rsvpYesCount
        };
      });
      setAllEvents(eventList);
      setFilteredEvents(eventList);
    };

    fetchEvents();
  }, []);

  const handleSearch = () => {
    if (searchMode === "group") {
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
    } else if (searchMode === "event") {
      let filtered = allEvents;
  
      if (searchTerm) {
        filtered = filtered.filter(event =>
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
  
      if (minRSVP) {
        const minYes = parseInt(minRSVP, 10);
        filtered = filtered.filter(event => event.rsvpYes >= minYes);
      }
  
      setFilteredEvents(filtered);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>
            <div className="flex space-x-4 border-b pb-2">
              <button
                className={`pb-1 ${
                  searchMode === "group"
                    ? "border-b-2 border-blue-500 font-semibold text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => setSearchMode("group")}
              >
                Groups
              </button>
              <button
                className={`pb-1 ${
                  searchMode === "event"
                    ? "border-b-2 border-blue-500 font-semibold text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => setSearchMode("event")}
              >
                Events
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder={
              searchMode === "group"
                ? "Search groups by name or description..."
                : "Search events by title or location..."
            }
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

          {showFilters && searchMode === "group" && (
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
            </div>
          )}
          {showFilters && searchMode === "event" && (
            <div className="mt-3 p-3 bg-gray-100 rounded-lg shadow-md">
              <Input
                type="number"
                placeholder="Min RSVP"
                value={minRSVP}
                onChange={(e) => {
                  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setMinRSVP(value.toString());
                }}
                className="mb-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      <div className="mt-6 space-y-4">
        {searchMode === "group" ? (
          filteredGroups.map(group => (
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
                <p className="text-sm text-gray-500">Members: {Object.keys(group.members || {}).length}</p>
                <p className="text-sm text-gray-500">Events: {group.events?.length || 0}</p>
              </CardContent>
            </Card>
          ))
        ) : ( // If events tab
          filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-md transition"
                onClick={() => router.push(`/event/view?docId=${event.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{event.description}</p>
                  <p className="text-sm text-gray-500">Yes RSVPs: {event.rsvpYes}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-gray-500 italic">No events found.</p>
          )
        )}
      </div>

      <NavBar />
    </div>
  );
}
