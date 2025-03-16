// messagetest1@test.com ; testtest - gFt8q2HV77MxPxS2N8p1vMnjDRI2 - https://localhost:3000/messages/rLjfeAiRYxTKLvYut1V4rU8Kvkg1
// messagetest@test.com ; testtest  - rLjfeAiRYxTKLvYut1V4rU8Kvkg1 - https://localhost:3000/messages/gFt8q2HV77MxPxS2N8p1vMnjDRI2

"use client"

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, onAuthStateChanged } from "../../../utils/firebaseConfig.js";
import { viewDocument, setDocument } from "../../../utils/firebaseHelper.js";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../utils/firebaseConfig.js";

export default function ChatPage() {
  const router = useRouter();
  const { userid } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Listen for auth state changes and update currentUser accordingly
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userid) {
      router.push('/profile');
      return;
    }
    if (!currentUser) return; // Wait until user is set

    const chatId = `${currentUser.uid}_${userid}`;
    const chatRef = doc(db, 'chats', chatId);

    const fetchMessages = async () => {
      const chatData = await viewDocument('chats', chatId);
      if (chatData) {
        setMessages(chatData.messages.slice(-50));
      } else {
        // Initialize the chat document if it does not exist
        await setDocument('chats', chatId, {
          participants: [currentUser.uid, userid],
          messages: [],
          timestamp: new Date(),
        });
      }
      setLoading(false);
    };

    fetchMessages();

    // Set up a real-time listener
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        setMessages(snapshot.data().messages.slice(-50));
      }
    });

    return () => unsubscribe();
  }, [userid, currentUser, router]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    const chatId = `${currentUser.uid}_${userid}`;
    let chatData = await viewDocument('chats', chatId);
    
    if (!chatData) {
      chatData = {
        participants: [currentUser.uid, userid],
        messages: [],
        timestamp: new Date(),
      };
    }
    
    const updatedMessages = [
      ...chatData.messages,
      {
        sender: currentUser.uid,
        content: newMessage,
        timestamp: new Date(),
      },
    ];
    
    await setDocument('chats', chatId, {
      participants: chatData.participants,
      messages: updatedMessages,
      timestamp: new Date(),
    });
    
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-screen p-4">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.push('/profile')}>
          Back to Profile
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto">
        {loading ? (
          <p>Loading messages...</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="p-2 border-b">
              <strong>{msg.sender === currentUser?.uid ? 'You' : 'Them'}:</strong> {msg.content}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 p-2 border-t">
        <Input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          placeholder="Type a message..." 
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}
