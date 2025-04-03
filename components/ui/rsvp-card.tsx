"use client";

import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useState, useEffect } from "react";
import { db } from "@/utils/firebaseConfig";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";

function RSVPView({ eventId }: { eventId: string }) {
  // const [yesList, setYesList] = useState([]);
  // const [maybeList, setMaybeList] = useState([]);
  // const [noList, setNoList] = useState([]);
  const [RSVPList, setRSVPList] = useState<{ [key: string]: string }>({});
  const [usernameDict, setUsernameDict] = useState<{ [key: string]: string }>(
    {}
  );

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const docRef = doc(db, "Event", eventId);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // create RSVP dict if it doesn't exist
        if (data) {
          // if (!data.RSVP_yes) {
          //   await updateDoc(docRef, {
          //     RSVP_yes: [],
          //   });
          // }

          // if (!data.RSVP_maybe) {
          //   await updateDoc(docRef, {
          //     RSVP_maybe: [],
          //   });
          // }

          // if (!data.RSVP_no) {
          //   await updateDoc(docRef, {
          //     RSVP_no: [],
          //   });
          // }

          if (!data.RSVP) {
            await updateDoc(docRef, {
              RSVP: {},
            });
          }
        }

        // setYesList(data?.RSVP_yes || []);
        // setMaybeList(data?.RSVP_maybe || []);
        // setNoList(data?.RSVP_no || []);
        setRSVPList(data?.RSVP || {});
      } else {
        console.log("error getting rsvp statuses");
      }
    });

    return () => unsubscribe();
  }, [eventId]);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!eventId) {
        return "";
      }

      const docRef = doc(db, "Event", eventId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // setYesList(data?.RSVP_yes);
        // setMaybeList(data?.RSVP_maybe);
        // setNoList(data?.RSVP_no);
        setRSVPList(data?.RSVP);
      } else {
        console.log("data can't be found.");
      }
    };

    fetchDocument();
  }, [eventId]);

  useEffect(() => {
    const generateUsernameDict = async () => {
      const dict: { [key: string]: string } = {};
      for (const i in Object.keys(RSVPList)) {
        const uid = Object.keys(RSVPList)[i];
        const docRef = doc(db, "Users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData) {
            dict[uid] = userData.username;
          }
        }
      }

      setUsernameDict(dict);
    };

    generateUsernameDict();
  }, [RSVPList]);

  return (
    <Tabs defaultValue="yes" className="p-0 my-1">
      <TabsList className="p-0 m-0 grid w-full grid-cols-3">
        <TabsTrigger className="m-1 p-1" value="yes">
          Yes
        </TabsTrigger>
        <TabsTrigger className="m-1 p-1" value="maybe">
          Maybe
        </TabsTrigger>
        <TabsTrigger className="m-1 p-1" value="no">
          No
        </TabsTrigger>
      </TabsList>

      <TabsContent value="yes">
        <ScrollArea className="h-28 w-full rounded-md border shadow-md mt-2 px-2 py-1">
          <div className="grid">
            {/* {yesList.map((item, index) => (
              <Label key={index} className="text-md px-2">
                {item}
              </Label>
            ))} */}

            {Object.keys(RSVPList).map(
              (key) =>
                RSVPList[key] === "yes" && (
                  <Label key={key} className="text-md px-2">
                    {usernameDict[key]}
                  </Label>
                )
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="maybe">
        <ScrollArea className="h-28 w-full rounded-md border shadow-md mt-2 px-2 py-1">
          <div className="grid">
          {Object.keys(RSVPList).map(
              (key) =>
                RSVPList[key] === "maybe" && (
                  <Label key={key} className="text-md px-2">
                    {usernameDict[key]}
                  </Label>
                )
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="no">
        <ScrollArea className="h-28 w-full rounded-md border shadow-md mt-2 px-2 py-1">
          <div className="grid">
          {Object.keys(RSVPList).map(
              (key) =>
                RSVPList[key] === "no" && (
                  <Label key={key} className="text-md px-2">
                    {usernameDict[key]}
                  </Label>
                )
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

export default RSVPView;
