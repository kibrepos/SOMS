import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import AdminSidebar from './AdminSidebar';
import { auth } from "../../services/firebaseConfig";
import '../../styles/AdminAnnouncements.css';

const AdminAnnouncements: React.FC = () => {
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [senderFirstName, setSenderFirstName] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility

  useEffect(() => {
    fetchSenderFirstName();
    fetchAnnouncements();
  }, []);

  const fetchSenderFirstName = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(firestore, "admin", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSenderFirstName(userData?.firstname || null);
      }
    }
  };

  const fetchAnnouncements = async () => {
    const announcementCollection = collection(firestore, "notifications");
    const snapshot = await getDocs(announcementCollection);
    const announcementList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAnnouncements(announcementList);
  };

  const getAllUserIDs = async () => {
    const studentsCollection = collection(firestore, "students");
    const facultyCollection = collection(firestore, "faculty");
    
    const studentSnapshot = await getDocs(studentsCollection);
    const facultySnapshot = await getDocs(facultyCollection);
    
    const userIDs = studentSnapshot.docs.map(doc => doc.id).concat(facultySnapshot.docs.map(doc => doc.id));
    return userIDs;
  };

  const sendUserNotification = async (userID: string, notificationId: string, message: string) => {
    const userNotificationRef = doc(collection(firestore, "notifications", userID, "userNotifications"), notificationId);
    
    await setDoc(userNotificationRef, {
      inviterName: `GPadmin ${senderFirstName}`,
      message,
      timestamp: new Date(),
      isRead: false,
      type: "announcement",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create announcement document
    const announcementDocRef = await addDoc(collection(firestore, "notifications"), {
      subject: announcementSubject,
      text: announcementText,
      audience,
      timestamp: new Date(),
      imageUrl: image ? URL.createObjectURL(image) : null, // Store a reference to the image
    });

    const notificationId = announcementDocRef.id;

    const allUserIDs = await getAllUserIDs();

    if (audience === "everyone") {
      await Promise.all(allUserIDs.map(userID => sendUserNotification(userID, notificationId, announcementText)));
    } else if (audience === "students") {
      const studentIDs = allUserIDs.filter(id => id.startsWith('student_'));
      await Promise.all(studentIDs.map(userID => sendUserNotification(userID, notificationId, announcementText)));
    } else if (audience === "faculty") {
      const facultyIDs = allUserIDs.filter(id => id.startsWith('faculty_'));
      await Promise.all(facultyIDs.map(userID => sendUserNotification(userID, notificationId, announcementText)));
    }

    // Clear fields and close modal
    setAnnouncementText("");
    setAnnouncementSubject("");
    setImage(null);
    fetchAnnouncements();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(firestore, "notifications", id));
    fetchAnnouncements();
  };

  return (
    <div className="admin-Announcent">
      <div className="admin-Announcent-main">
        <AdminSidebar />
        <div className="admin-Announcent-content">
          <h2>Manage Announcements</h2>
          <button onClick={() => setIsModalOpen(true)}>Create Announcement</button>
  
          {/* Announcement Modal */}
          {isModalOpen && (
            <div className="aa-modal">
              <div className="aa-modal-content">
                <span className="aa-modal-close" onClick={() => setIsModalOpen(false)}>&times;</span>
                <h2>Create Announcement</h2>
                <form onSubmit={handleSubmit}>
                  <input
                    type="text"
                    value={announcementSubject}
                    onChange={(e) => setAnnouncementSubject(e.target.value)}
                    required
                    placeholder="Subject"
                  />
                  <textarea 
                    value={announcementText} 
                    onChange={(e) => setAnnouncementText(e.target.value)} 
                    required 
                    placeholder="Enter your announcement here..."
                  />
                  <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                    <option value="everyone">Everyone</option>
                    <option value="students">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                  </select>
                  <input 
                    type="file" 
                    onChange={(e) => setImage(e.target.files?.[0] || null)} 
                    accept="image/*"
                  />
                  <button type="submit">Send Announcement</button>
                </form>
              </div>
            </div>
          )}
  
  <h2 className="admin-announcements-title">All Announcements</h2>
          <ul className="admin-announcements-list">
            {announcements.map(announcement => (
              <li key={announcement.id} className="admin-announcement-item">
                <p className="admin-announcement-subject">{announcement.subject}</p>
                <p className="admin-announcement-date">
                  {new Date(announcement.timestamp.seconds * 1000).toLocaleDateString('en-US', {
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric'
                  })}
                </p>
                <p className="admin-announcement-text">{announcement.text}</p>
                {announcement.imageUrl && (
                  <p className="admin-announcement-file">File: {announcement.imageUrl.split('/').pop()}</p>
                )}
                <div className="admin-announcement-actions">
                  <button className="admin-view-button">View</button>
                  <button className="admin-delete-button" onClick={() => handleDelete(announcement.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;