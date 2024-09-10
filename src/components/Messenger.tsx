import React, { useState, useEffect,KeyboardEvent  } from 'react';
import { firestore, auth } from '../services/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, getDocs, where } from 'firebase/firestore';
import '../styles/Messenger.css'; // Import CSS file
import Header from '../components/Header';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
}

interface User {
  userId: string;
  firstname: string;
  lastname: string;
  profilePicUrl: string;
  email: string;
}

const Messaging = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Listen for the logged-in user
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
      }
    });

    if (selectedUser) {
      const chatID = [currentUserId, selectedUser.userId].sort().join('_');
      const messagesCollection = collection(firestore, 'chats', chatID, 'messages');
      const messagesQuery = query(messagesCollection, orderBy('createdAt', 'asc'));

      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const loadedMessages: Message[] = snapshot.docs.map((doc) => {
          console.log('Message Data:', doc.data()); // Debugging line
          return {
            id: doc.id,
            ...doc.data(),
          } as Message;
        });
        setMessages(loadedMessages);
      });

      return () => {
        unsubscribeMessages();
      };
    }

    return () => {
      unsubscribeAuth();
    };
  }, [selectedUser]);

  const handleSendMessage = async () => {
    if (newMessage.trim() !== '' && currentUserId && selectedUser) {
      const chatID = [currentUserId, selectedUser.userId].sort().join('_');
      await addDoc(collection(firestore, 'chats', chatID, 'messages'), {
        text: newMessage,
        senderId: currentUserId,
        createdAt: Timestamp.now(),
      });
      setNewMessage(''); // Clear input after sending
    }
  };

  const handleSearch = async () => {
    try {
      console.log('Searching for:', searchQuery); // Debugging line
      
      const studentsRef = collection(firestore, 'students');
      const facultyRef = collection(firestore, 'faculty');
      const adminsRef = collection(firestore, 'admins');

      const searchCondition = where('lastname', '>=', searchQuery);
      const searchCondition2 = where('lastname', '<=', searchQuery + '\uf8ff');

      const q1 = query(studentsRef, searchCondition, searchCondition2);
      const q2 = query(facultyRef, searchCondition, searchCondition2);
      const q3 = query(adminsRef, searchCondition, searchCondition2);

      const studentResults = await getDocs(q1);
      const facultyResults = await getDocs(q2);
      const adminResults = await getDocs(q3);

      const combinedResults: User[] = [
        ...studentResults.docs.map((doc) => doc.data() as User),
        ...facultyResults.docs.map((doc) => doc.data() as User),
        ...adminResults.docs.map((doc) => doc.data() as User),
      ];

      setSearchResults(combinedResults);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery('');
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent default action
      handleSendMessage();
    }
  };
  
  return (
    <div className="messaging-container">
        <Header />
      <div className="search-bar">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for users..."
          className="search-input"
        />
        <button onClick={handleSearch} className="search-button">Search</button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((user) => (
            <div key={user.userId} className="search-result-item" onClick={() => handleSelectUser(user)}>
              <img src={user.profilePicUrl} alt={user.firstname} className="user-avatar" />
              <span>{user.firstname} {user.lastname}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chat Window */}
      {selectedUser && (
        <>
          <div className="chat-header">
            <img src={selectedUser.profilePicUrl} alt={selectedUser.firstname} className="user-avatar" />
            <span>{selectedUser.firstname} {selectedUser.lastname}</span>
          </div>

          <div className="chat-window">
            <div className="messages-list">
              {messages.map((message) => (
                <div key={message.id} className={`message-item ${message.senderId === currentUserId ? 'own-message' : 'other-message'}`}>
                  <div className="message-content">
                    <span>{message.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="message-input-container">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="message-input"
              onKeyDown={handleKeyDown}
            />
            <button onClick={handleSendMessage} className="send-button">
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Messaging;
