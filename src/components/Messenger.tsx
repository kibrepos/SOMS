import React, { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { firestore, auth } from '../services/firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import '../styles/Messenger.css'; 
import Header from '../components/Header'; 

interface User {
  userId: string;
  firstname: string;
  lastname: string;
  profilePicUrl: string;
}

interface Message {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  read: boolean;
}

interface Contact extends User {
  lastMessage: Message | null;
}

const Messaging: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
      }
    });

    const fetchContacts = async () => {
      const allContacts: Contact[] = [];
      const collections = ['students', 'faculty', 'admin'];
      
      for (const col of collections) {
        const snapshot = await getDocs(collection(firestore, col));
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== currentUserId) {
            allContacts.push({
              userId: doc.id,
              firstname: data.firstname ?? '',
              lastname: data.lastname ?? '',
              profilePicUrl: data.profilePicUrl ?? '',
              lastMessage: null, // Will fetch from chats later
            });
          }
        });
      }

      // Now fetch the lastMessage for each contact from the 'chats' collection
      const chatQuery = query(collection(firestore, 'chats'), orderBy('lastMessage.createdAt', 'desc'));
      const chatSnapshot = await getDocs(chatQuery);

      const contactsWithLastMessage = allContacts.map((contact) => {
        const chatDoc = chatSnapshot.docs.find((doc) => doc.id.includes(contact.userId));
        if (chatDoc) {
          const chatData = chatDoc.data();
          contact.lastMessage = chatData.lastMessage || null;
        }
        return contact;
      });

      // Sort contacts by the most recent message
      contactsWithLastMessage.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setContacts(contactsWithLastMessage);
    };

    fetchContacts();

    return () => {
      unsubscribeAuth();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (selectedUser) {
      const chatID = [currentUserId, selectedUser.userId].sort().join('_');
      const messagesCollection = collection(firestore, 'chats', chatID, 'messages');
      const messagesQuery = query(messagesCollection, orderBy('createdAt', 'asc'));

      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const loadedMessages: Message[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Message));
        setMessages(loadedMessages);
      });

      return () => {
        unsubscribeMessages();
      };
    }
  }, [selectedUser, currentUserId]);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const chatID = [currentUserId, selectedUser?.userId].sort().join('_');
      const messagesCollection = collection(firestore, 'chats', chatID, 'messages');

      await addDoc(messagesCollection, {
        text: messageToSend,
        createdAt: new Date().toISOString(),
        senderId: currentUserId,
        read: false,
      });

      const chatDoc = doc(firestore, 'chats', chatID);
      await updateDoc(chatDoc, {
        lastMessage: {
          text: messageToSend,
          createdAt: new Date().toISOString(),
          senderId: currentUserId,
        },
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.firstname} ${contact.lastname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="messaging-container">
      <Header /> 
      <div className="messaging">
        <div className="contacts">
          <input
            type="text"
            placeholder="Search a Lasallian"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <h2>Inbox</h2>
          <ul>
            {filteredContacts.map((user) => (
              <li key={user.userId} onClick={() => handleUserClick(user)}>
                <img src={user.profilePicUrl} alt={`${user.firstname} ${user.lastname}`} className="profile-pic" />
                <div className="contact-info">
                  {user.firstname} {user.lastname}
                </div>
                {user.lastMessage && (
                  <div className="last-message">
                    <span className="message-text">
                      {user.lastMessage.senderId === currentUserId ? `You: ${user.lastMessage.text}` : `${user.lastMessage.text}`}
                    </span>
                    <span className="message-time">{new Date(user.lastMessage.createdAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="chat">
          {selectedUser ? (
            <>
              <h2>{selectedUser.firstname} {selectedUser.lastname}</h2>
              <div className="messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.senderId === currentUserId ? 'sent' : 'received'} ${!message.read && message.senderId !== currentUserId ? 'unread' : ''}`}
                  >
                    <div className="message-content">
                      <p>{message.text}</p>
                    </div>
                    <span className="message-time">{new Date(message.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
                <div ref={endOfMessagesRef} />
              </div>
              <div className="message-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message"
                  onKeyDown={handleKeyDown}
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </>
          ) : (
            <p>Select a user to start a chat</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messaging;
