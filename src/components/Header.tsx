import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, storage, firestore } from '../services/firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';
import '../styles/Header.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { collection, updateDoc, doc, onSnapshot,getDoc,setDoc,arrayUnion, arrayRemove } from 'firebase/firestore';


const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const profilePicRef = ref(storage, `profilePics/${user.uid}/profile-picture.jpg`);
        try {
          const url = await getDownloadURL(profilePicRef);
          setProfilePicUrl(url);
        } catch (err) {
          console.error('Error fetching profile picture URL:', err);
          setProfilePicUrl('/default-profile.png');
        }
      } else {
        setProfilePicUrl('/default-profile.png');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Correctly reference the logged-in user's notifications
        const notificationsRef = collection(
          firestore,
          `notifications/${user.uid}/userNotifications`
        );
  
        const unsubscribeSnapshot = onSnapshot(notificationsRef, (snapshot) => {
          const fetchedNotifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            isRead: doc.data().isRead ?? false,
          }));
  
          setNotifications(fetchedNotifications);
          setUnreadCount(fetchedNotifications.filter((notif) => !notif.isRead).length);
        });
  
        return () => unsubscribeSnapshot(); // Cleanup listener on unmount
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  const handleAcceptInvite = async (notif: any) => {
    try {
      const orgDocRef = doc(firestore, 'organizations', notif.organizationName);
      const orgDoc = await getDoc(orgDocRef);

      if (orgDoc.exists()) {
        const { members = [], invitedStudents = [], president, officers } = orgDoc.data();

        const newMemberId = auth.currentUser?.uid;
        const newMemberName = auth.currentUser?.displayName || 'Unknown';
        const newMemberEmail = auth.currentUser?.email || 'unknown@example.com';
        const newMemberProfilePicUrl = profilePicUrl || '/default-profile.png';

        const updatedMembers = [...members, { id: newMemberId, name: newMemberName, email: newMemberEmail, profilePicUrl: newMemberProfilePicUrl }];

        await updateDoc(orgDocRef, { 
          members: updatedMembers,
          invitedStudents: arrayRemove(newMemberId) // Remove from invitedStudents
        });

        const notificationsToSend = [];

        // Notify President
        if (president) {
          notificationsToSend.push({
            email: newMemberEmail,
            id: newMemberId,
            name: newMemberName,
            profilePicUrl: newMemberProfilePicUrl,
            message: `${newMemberName} has joined ${notif.organizationName}.`,
            organizationName: notif.organizationName,
            timestamp: new Date(),
            isRead: false,
            status: 'new_member',
            type: 'general',
          });
        }

        // Notify Officers
        for (const officer of officers) {
          notificationsToSend.push({
            email: newMemberEmail,
            id: newMemberId,
            name: newMemberName,
            profilePicUrl: newMemberProfilePicUrl,
            message: `${newMemberName} has joined ${notif.organizationName}.`,
            organizationName: notif.organizationName,
            timestamp: new Date(),
            isRead: false,
            status: 'new_member',
            type: 'general',
          });
        }

        // Send notifications
        for (const notification of notificationsToSend) {
          const notificationRef = doc(
            firestore,
            `notifications/${president}/userNotifications`,
            uuidv4()
          );

          await setDoc(notificationRef, notification);
        }

        const originalNotifDocRef = doc(firestore, 'notifications', notif.id);
        const originalNotifDoc = await getDoc(originalNotifDocRef);
        if (originalNotifDoc.exists()) {
          await updateDoc(originalNotifDocRef, { status: 'accepted', isRead: true });
        } else {
          console.error('Original notification document does not exist:', notif.id);
        }

        
        // Remove the buttons after accepting
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, status: 'accepted' } : n
          )
        );
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  };

  const handleDeclineInvite = async (notif: any) => {
    try {
      await updateDoc(doc(firestore, 'notifications', notif.id), { status: 'declined', isRead: true });

      const orgDocRef = doc(firestore, 'organizations', notif.organizationName);
      await updateDoc(orgDocRef, {
        invitedStudents: arrayRemove(auth.currentUser?.uid) // Remove the user from invitedStudents
      });

      alert('You declined the invite.');

      // Remove the buttons after declining
      setNotifications((prev) => 
        prev.map((n) => 
          n.id === notif.id ? { ...n, status: 'declined' } : n
        )
      );
    } catch (error) {
      console.error('Error declining invite:', error);
    }
  };
  
  
  

  
  
  
  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleProfileVisit = () => {
    navigate('/Student/myprofile');
  };

  const handleNavigateToMessages = () => {
    navigate('/messages');
  };

  const handleVisitChatApp = () => {
    navigate('/ChatApp');
  };

  const markAllAsRead = async () => {
    try {
      const updates = notifications.map((notif) =>
        updateDoc(doc(firestore, 'notifications', notif.id), { isRead: true })
      );
      await Promise.all(updates);
  
      // Update local state to reflect that all notifications are read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0); // Reset unread count to 0
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };
  

  const deleteAllNotifications = async () => {
    try {
      const batchDeletes = notifications.map((notif) =>
        updateDoc(doc(firestore, 'notifications', notif.id), { deleted: true })
      );
      await Promise.all(batchDeletes);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const renderNotificationButton = () => {
    return unreadCount > 0 ? (
      <button className="notification-action-btn" onClick={markAllAsRead}>
      {unreadCount > 0 ? 'Mark All as Read' : 'All Notifications Read'}
    </button>
    ) : (
      <button className="notification-action-btn" onClick={deleteAllNotifications}>
        Delete All
      </button>
    );
  };

  return (
    <div className="header">
      <div className="header-left">
        <div className="logo" onClick={() => navigate('/Student/Dashboard')}>
          GreenPulse
        </div>
      </div>
      <div className="header-right">
        <div className="icon" onClick={toggleNotifications}>
          <FontAwesomeIcon icon={faBell} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </div>

        {showNotifications && (
          <div className="notifications-dropdown">
            <ul className="student-notification-list">
  {notifications.length > 0 ? (
    notifications.map((notif) => (
      <li
        key={notif.id}
        className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
      >
        <div className="notification-header">
          <img
            src={notif.inviterProfilePic || '/default-profile.png'}
            alt="Profile"
            className="notification-profile-pic"
          />
          <div className="notification-text">
            <strong>{notif.inviterName}</strong>
            <p>{notif.message}</p>
          </div>
        </div>
        <div className="notification-actions">
          {notif.type === 'invite' && notif.status === 'pending' && (
            <>
              <button
                onClick={() => handleAcceptInvite(notif)}
                className="notification-accept-btn"
              >
                Accept
              </button>
              <button
                onClick={() => handleDeclineInvite(notif)}
                className="notification-decline-btn"
              >
                Decline
              </button>
            </>
          )}
          <span className="notification-timestamp">
            {new Date(notif.timestamp?.toDate()).toLocaleString()}
          </span>
        </div>
      </li>
    ))
  ) : (
    <li className="no-notifications">No notifications available.</li>
  )}
</ul>

            {renderNotificationButton()}
          </div>
        )}

        <div className="icon" onClick={handleNavigateToMessages}>
          <FontAwesomeIcon icon={faEnvelope} />
        </div>
        <div className="icon" onClick={handleVisitChatApp}>
          CHATAPP
        </div>
        <div className="profile" onClick={toggleDropdown}>
          <img
            src={profilePicUrl || '/default-profile.png'}
            alt="Profile"
            className="profile-icon"
          />
          {showDropdown && (
            <div className="header-dropdown" onMouseLeave={() => setShowDropdown(false)}>
              <ul>
                <li onClick={handleProfileVisit}>Visit Profile</li>
                <li onClick={handleLogout}>Logout</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
