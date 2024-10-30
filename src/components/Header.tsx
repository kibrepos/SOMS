import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, storage, firestore } from '../services/firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';
import '../styles/Header.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { collection, updateDoc, doc, onSnapshot,getDoc,setDoc,writeBatch, arrayRemove } from 'firebase/firestore';


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
        const notificationsRef = collection(
          firestore,
          `notifications/${user.uid}/userNotifications`
        );
  
        const unsubscribeSnapshot = onSnapshot(notificationsRef, (snapshot) => {
          const fetchedNotifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            isRead: doc.data().isRead ?? false,
            timestamp: doc.data().timestamp || new Date(), // Ensure timestamp exists
          }));
  
          // Sort notifications by timestamp (newest first)
          const sortedNotifications = fetchedNotifications.sort(
            (a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)
          );
  
          setNotifications(sortedNotifications);
          setUnreadCount(sortedNotifications.filter((notif) => !notif.isRead).length);
        });
  
        return () => unsubscribeSnapshot(); // Cleanup listener on unmount
      }
    });
  
    return () => unsubscribe();
  }, []);
  
  
  const handleAcceptInvite = async (notif: any) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
  
      const orgDocRef = doc(firestore, 'organizations', notif.organizationName);
      const orgDoc = await getDoc(orgDocRef);
  
      if (orgDoc.exists()) {
        const { members = [], invitedStudents = [], president, officers } = orgDoc.data();
  
        const studentDocRef = doc(firestore, 'students', userId);
        const studentDoc = await getDoc(studentDocRef);
        
        let studentName = 'Unknown';
        let studentProfilePicUrl = '/default-profile.png';
        
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          studentName = `${studentData.firstname} ${studentData.lastname}`;
          studentProfilePicUrl = studentData.profilePicUrl || '/default-profile.png';
        }
        
        const newMember = {
          id: userId,
          name: studentName,
          email: auth.currentUser?.email || 'unknown@example.com',
          profilePicUrl: studentProfilePicUrl,
        };
        
  
        // Update members and remove from invitedStudents
        const updatedMembers = [...members, newMember];
        await updateDoc(orgDocRef, {
          members: updatedMembers,
          invitedStudents: arrayRemove(userId),
        });
  
        // Create notification message
        const message = ` has accepted the invite and joined ${notif.organizationName}.`;
  
        // Prepare notification for president
        const notificationsToSend = [
          {
            message,
  organizationName: notif.organizationName,
  timestamp: new Date(),
  isRead: false,
  status: 'new_member',
  type: 'general',
  inviterProfilePic: studentProfilePicUrl,
  inviterName: studentName,
          },
        ];
  
        // Send notifications to the president
        if (president) {
          const notifRef = doc(
            firestore,
            `notifications/${president.id}/userNotifications`,
            uuidv4()
          );
          await setDoc(notifRef, { ...notificationsToSend[0], recipient: 'President' });
        }
  
        // Send notifications to each officer
        for (const officer of officers) {
          const notifRef = doc(
            firestore,
            `notifications/${officer.id}/userNotifications`,
            uuidv4()
          );
          await setDoc(notifRef, { ...notificationsToSend[0], recipient: officer.role });
        }
  
        // Update original notification to 'accepted'
        const notifRef = doc(
          firestore,
          `notifications/${userId}/userNotifications`,
          notif.id
        );
        await updateDoc(notifRef, { status: 'accepted', isRead: true });
  
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, status: 'accepted' } : n
          )
        );
  
        alert('You have successfully joined the organization.');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  };
  
  const handleDeclineInvite = async (notif: any) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
  
      const orgDocRef = doc(firestore, 'organizations', notif.organizationName);
      const orgDoc = await getDoc(orgDocRef);
  
      if (orgDoc.exists()) {
        const { president, officers } = orgDoc.data();
      
        // Fetch student data to use in the notification
        const studentDocRef = doc(firestore, 'students', userId);
        const studentDoc = await getDoc(studentDocRef);
      
        let studentName = 'Unknown';
        let studentProfilePicUrl = '/default-profile.png';
      
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          studentName = `${studentData.firstname} ${studentData.lastname}`;
          studentProfilePicUrl = studentData.profilePicUrl || '/default-profile.png';
        }
      
        // Create notification message
        const message = `has declined the invite to join ${notif.organizationName}.`;
      
        // Prepare notifications for president and officers
        const notificationsToSend = [
          {
            message,
            organizationName: notif.organizationName,
            timestamp: new Date(),
            isRead: false,
            status: 'invite_declined',
            type: 'general',
            inviterProfilePic: studentProfilePicUrl,
            inviterName: studentName,
          },
        ];
      
  
        // Notify president
        if (president) {
          const notifRef = doc(
            firestore,
            `notifications/${president.id}/userNotifications`,
            uuidv4()
          );
          await setDoc(notifRef, { ...notificationsToSend[0], recipient: 'President' });
        }
  
        // Notify each officer
        for (const officer of officers) {
          const notifRef = doc(
            firestore,
            `notifications/${officer.id}/userNotifications`,
            uuidv4()
          );
          await setDoc(notifRef, { ...notificationsToSend[0], recipient: officer.role });
        }
  
        // Remove the user from the invitedStudents list
        await updateDoc(orgDocRef, {
          invitedStudents: arrayRemove(userId),
        });
  
        // Update the original notification to 'declined'
        const notifRef = doc(
          firestore,
          `notifications/${userId}/userNotifications`,
          notif.id
        );
        await updateDoc(notifRef, { status: 'declined', isRead: true });
  
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, status: 'declined' } : n
          )
        );
  
        alert('You have declined the invite.');
      }
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
      const userId = auth.currentUser?.uid;
      if (!userId) return;
  
      const batch = writeBatch(firestore); // Create a batch operation
  
      notifications.forEach((notif) => {
        const notifRef = doc(firestore, `notifications/${userId}/userNotifications`, notif.id);
        batch.update(notifRef, { isRead: true });
      });
  
      await batch.commit(); // Commit the batch
  
      // Update local state to reflect that all notifications are read
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0); // Reset unread count
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };
  

  const deleteAllNotifications = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
  
      const batch = writeBatch(firestore); // Create a batch operation
  
      notifications.forEach((notif) => {
        const notifRef = doc(firestore, `notifications/${userId}/userNotifications`, notif.id);
        batch.delete(notifRef);
      });
  
      await batch.commit(); // Commit the batch
  
      // Clear notifications from local state
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
      <div className="icon notification-icon" onClick={toggleNotifications}>
  <FontAwesomeIcon icon={faBell} />
  {unreadCount > 0 && (
    <span className="notification-badge">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</div>


        {showNotifications && (
          <div className="notifications-dropdown">
            <ul className="notification-list">
  {notifications.length > 0 ? (
    notifications.map((notif) => (
      <li key={notif.id} className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}>
        <div className="notification-content">
          {/* Profile Picture */}
          <div className="profile-avatar">
            {notif.inviterProfilePic ? (
              <img
                src={notif.inviterProfilePic}
                alt="Profile"
                className="notification-profile-pic"
              />
            ) : (
              <div className="default-avatar">
                {notif.inviterName ? notif.inviterName[0] : 'N'}
              </div>
            )}
          </div>

          {/* Notification Text */}
          <div className="notification-text">
            <p className="notification-title">
              <strong>{notif.inviterName}</strong> {notif.message}
            </p>
            <span className="notification-timestamp">
              {new Date(notif.timestamp?.toDate()).toLocaleTimeString()}
            </span>
          </div>

          {/* Optional Actions */}
          {notif.type === 'invite' && notif.status === 'pending' && (
            <div className="notification-actions">
              <button className="accept-btn" onClick={() => handleAcceptInvite(notif)}>
                Accept
              </button>
              <button className="deny-btn" onClick={() => handleDeclineInvite(notif)}>
                Deny
              </button>
            </div>
          )}
        </div>
      </li>
    ))
  ) : (
    <li className="no-notifications">No notifications available.</li>
  )}
</ul>

<div className="notification-button-container">
            {renderNotificationButton()}
            </div>
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
