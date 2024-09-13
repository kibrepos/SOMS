import React, { useState, useEffect,KeyboardEvent  } from 'react';
import { firestore, auth } from '../services/firebaseConfig';
import { Firestore, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import '../styles/Messenger.css'; // Import CSS file
import Header from '../components/Header';


interface User {
  userId: string;
  firstname: string;
  lastname: string;
  profilePicUrl: string; // Added profilePicUrl
}

interface Message {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  read: boolean; // Added read status
}

const Messaging: React.FC = () => {
  const [contacts, setContacts] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [typing, setTyping] = useState<boolean>(false); // Added typing status

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
      }
    });

    const fetchContacts = async () => {
      const allContacts: User[] = [];
      const collections = ['students', 'faculty', 'admin'];
      for (const col of collections) {
        const snapshot = await getDocs(collection(firestore, col));
        snapshot.forEach((doc) => {
          const data = doc.data();
          allContacts.push({
            userId: doc.id,
            firstname: data.firstname ?? '',
            lastname: data.lastname ?? '',
            profilePicUrl: data.profilePicUrl ?? '' // Fetch profilePicUrl
          });
        });
      }
      setContacts(allContacts);
    };

    fetchContacts();

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

    return () => {
      unsubscribeAuth();
    };
  }, [selectedUser, currentUserId]);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setTyping(false); // Reset typing status when selecting a user
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    const chatID = [currentUserId, selectedUser?.userId].sort().join('_');
    const messagesCollection = collection(firestore, 'chats', chatID, 'messages');

    await addDoc(messagesCollection, {
      text: newMessage,
      createdAt: new Date().toISOString(),
      senderId: currentUserId,
      read: false, // Set new messages as unread
    });

    setNewMessage('');
    setTyping(false); // Reset typing status
  };

  const handleMessageDelete = async (messageId: string) => {
    const chatID = [currentUserId, selectedUser?.userId].sort().join('_');
    const messageDoc = doc(firestore, 'chats', chatID, 'messages', messageId);
    await deleteDoc(messageDoc);
  };

  const handleTyping = () => {
    setTyping(true);
    setTimeout(() => setTyping(false), 3000); // Reset typing status after 3 seconds
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevents the default action of form submission if the input is in a form
      handleSendMessage();
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.firstname} ${contact.lastname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="messaging">
      <div className="contacts">
        <input
          type="text"
          placeholder="Search contacts"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <h2>Contacts</h2>
        <ul>
          {filteredContacts.map((user) => (
            <li key={user.userId} onClick={() => handleUserClick(user)}>
              <img src={user.profilePicUrl} alt={`${user.firstname} ${user.lastname}`} className="profile-pic" />
              <div className="contact-info">
                {user.firstname} {user.lastname}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="chat">
        {selectedUser ? (
          <>
            <h2>Chat with {selectedUser.firstname} {selectedUser.lastname}</h2>
            <div className="messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.senderId === currentUserId ? 'sent' : 'received'} ${!message.read && message.senderId !== currentUserId ? 'unread' : ''}`}
                >
                  <p>{message.text}</p>
                  <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                  {message.senderId === currentUserId && (
                    <button onClick={() => handleMessageDelete(message.id)}>Delete</button>
                  )}
                </div>
              ))}
              {typing && <div className="typing-indicator">Typing...</div>}
            </div>
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type a message"
                onKeyDown={handleKeyDown} // Add keydown handler here
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <p>Select a user to start a chat</p>
        )}
      </div>
    </div>
  );
};

export default Messaging;