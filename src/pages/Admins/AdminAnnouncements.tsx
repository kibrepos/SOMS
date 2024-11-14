import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc,Timestamp,DocumentData,query, orderBy, startAfter, limit } from "firebase/firestore";
import AdminSidebar from './AdminSidebar';
import { auth } from "../../services/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL,deleteObject } from "firebase/storage";
import '../../styles/AdminAnnouncements.css';

const AdminAnnouncements: React.FC = () => {
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [senderFirstName, setSenderFirstName] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const storage = getStorage();

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
        return `${userData.firstname} ${userData.lastname}`; // Return full name
      }
    }
    return "Unknown User";
  };
  const fetchMoreAnnouncements = async () => {
    if (loadingMore || allLoaded || !lastVisible) return;
  
    setLoadingMore(true);
  
    try {
      const moreAnnouncementsQuery = query(
        collection(firestore, "notifications"),
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(10)
      );
      const snapshot = await getDocs(moreAnnouncementsQuery);
  
      if (!snapshot.empty) {
        const newAnnouncements = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || null,
        }));
  
        setAnnouncements((prev) => [...prev, ...newAnnouncements]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  
        if (snapshot.docs.length < 10) setAllLoaded(true);
      } else {
        setAllLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching more announcements:", error);
    } finally {
      setLoadingMore(false);
    }
  };
  

  const fetchAnnouncements = async () => {
    const announcementCollection = collection(firestore, "notifications");
    const announcementsQuery = query(announcementCollection, orderBy("timestamp", "desc"), limit(10));
    const snapshot = await getDocs(announcementsQuery);
  
    const announcementList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null,
    }));
  
    setAnnouncements(announcementList);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  };
  
  

  const getAllUserIDs = async () => {
    const studentsCollection = collection(firestore, "students");
    const facultyCollection = collection(firestore, "faculty");
    
    const studentSnapshot = await getDocs(studentsCollection);
    const facultySnapshot = await getDocs(facultyCollection);
    
    const userIDs = studentSnapshot.docs.map(doc => doc.id).concat(facultySnapshot.docs.map(doc => doc.id));
    return userIDs;
  };

  const sendUserNotification = async (
    userID: string,
    notificationId: string,
    subject: string,
    message: string,
    senderName: string,
    imageUrl: string | null = null,
    videoUrl: string | null = null
  ) => {
    const userNotificationRef = doc(collection(firestore, "notifications", userID, "userNotifications"), notificationId);
    
    await setDoc(userNotificationRef, {
      inviterName: `GPadmin ${senderName}`,
      subject,
      message,
      imageUrl,
      videoUrl,
      timestamp: new Date(),
      isRead: false,
      type: "announcement",
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const senderName = await fetchSenderFirstName();
  
    let imageUrl = null;
    let videoUrl = null;
  
    // Upload the image to Firebase Storage if an image is selected
    if (image) {
      const isVideo = image.type.startsWith("video/");
      const storageRef = ref(storage, `announcements/${image.name}`);
      await uploadBytes(storageRef, image);
      const downloadUrl = await getDownloadURL(storageRef);
  
      if (isVideo) {
        videoUrl = downloadUrl;
      } else {
        imageUrl = downloadUrl;
      }
    }
  
    // Create announcement document with the sender's name, subject, message, and image URL
    const announcementDocRef = await addDoc(collection(firestore, "notifications"), {
      subject: announcementSubject,
      text: announcementText,
      audience,
      timestamp: Timestamp.now(),
      senderName,
      imageUrl,
      videoUrl,
    });
  
    const notificationId = announcementDocRef.id;
    const allUserIDs = await getAllUserIDs();
  
    if (audience === "everyone") {
      await Promise.all(
        allUserIDs.map((userID) =>
          sendUserNotification(
            userID,
            notificationId,
            announcementSubject,
            announcementText,
            senderName,
            imageUrl,
            videoUrl
          )
        )
      );
    }
  
    // Clear fields and close modal
    setAnnouncementText("");
    setAnnouncementSubject("");
    setImage(null);
    fetchAnnouncements();
    setIsModalOpen(false);
  };
  

const handleDelete = async (announcementId: string, imageUrl?: string) => {
  try {
    // Delete the main announcement from the "notifications" collection
    await deleteDoc(doc(firestore, "notifications", announcementId));

    // If there's an image, delete it from Firebase Storage
    if (imageUrl) {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    }

    // Fetch all user IDs
    const allUserIDs = await getAllUserIDs();

    // Delete the announcement from each user's "userNotifications" subcollection
    const deletePromises = allUserIDs.map(async (userID) => {
      const userNotificationRef = doc(
        firestore,
        "notifications",
        userID,
        "userNotifications",
        announcementId
      );
      await deleteDoc(userNotificationRef);
    });

    await Promise.all(deletePromises);

    // Fetch announcements again to update the UI
    fetchAnnouncements();

    alert("Announcement deleted successfully.");
  } catch (error) {
    console.error("Error deleting announcement:", error);
    alert("Failed to delete the announcement.");
  }
};

// Confirmation handler before deletion
const handleDeleteConfirmation = (announcementId: string, imageUrl?: string) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this announcement? This will delete it for all users."
  );
  if (confirmDelete) {
    handleDelete(announcementId, imageUrl);
    setIsViewModalOpen(false); // Close the modal after deletion
  }
};

  return (
      <div className="admin-dasasdhboard">
        <div className="admin-dashasdboard-main">
          <AdminSidebar />
          <div className="admin-dashboard-content">
         
            {/* Announcement Creation Modal */}
            {isModalOpen && (
              <div className="ql-modal-overlay">
                <div className="ql-modal-content">
                  <span className="ql-modal-close" onClick={() => setIsModalOpen(false)}>
                    &times;
                  </span>
                  <h2>Create New Announcement</h2>
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
                    <div className="ql-file-button-container">
  <label htmlFor="file-upload" className="ql-file-input-label">
    Add Picture or Video
  </label>
  <input
    type="file"
    id="file-upload"
    className="ql-file-input"
    onChange={(e) => {
      const file = e.target.files?.[0];
      setImage(file || null);
    }}
    accept="image/*, video/*"
  />



  {/* Display the file name with a delete button if a file is selected */}
  {image && (
  <div className="ql-file-display">
    <a
      href={URL.createObjectURL(image)}
      target="_blank"
      rel="noopener noreferrer"
      className="ql-file-link"
    >
      {image.name}
    </a>
    <button
      className="ql-file-remove-button"
      onClick={() => setImage(null)}
      aria-label="Remove file"
    >
      &times;
    </button>
  </div>
)}

  {/* Submit button */}
  <button type="submit" className="ql-modal-submit-button">
    Send Announcement
  </button>
</div>

                  </form>
                </div>
              </div>
            )}
    
    
            {/* List of Announcements */}
         <h2 className="ql-announcements-title">All Announcements</h2>
         <div className="ql-create-button-container">
  <button className="ql-create-button" onClick={() => setIsModalOpen(true)}>
    Create New Announcement
  </button>
</div>


<ul className="ql-announcements-list">
  {announcements.map((announcement) => (
    <li
      key={announcement.id}
      className="ql-announcement-item"
      onClick={() => {
        setSelectedAnnouncement(announcement);
        setIsViewModalOpen(true);
      }}
    >
      <div className="ql-announcement-details">
        <span className="ql-announcement-sender">Sent by: {announcement.senderName || "Unknown User"}</span>
        <p className="ql-announcement-subject">{announcement.subject}</p>
        <p className="ql-announcement-date">
          {announcement.timestamp
            ? new Date(announcement.timestamp).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })
            : 'No Date Available'}
        </p>
      </div>
      <p className="ql-announcement-textsd">
        {announcement.text.length > 140
          ? `${announcement.text.substring(0, 140)}...`
          : announcement.text}
      </p>
      
    </li>
    
  ))}
<div className="ql-load-more-container">
  {lastVisible && !allLoaded ? (
    <button
      onClick={fetchMoreAnnouncements}
      disabled={loadingMore}
      className={`load-more-btn ${loadingMore ? 'loading' : ''}`}
    >
      {loadingMore ? "Loading..." : "Load More Announcements"}
    </button>
  ) : (
    <button disabled className="load-more-btn disabled">
      All Announcements Loaded
    </button>
  )}
</div>
</ul>




    
            {/* View Modal for Individual Announcements */}
         {/* View Modal for Individual Announcements */}
{isViewModalOpen && selectedAnnouncement && (
  <div className="ql-modal-overlay">
    <div className="ql-modal-content">
      <span className="ql-modal-close" onClick={() => setIsViewModalOpen(false)}>
        &times;
      </span>
      
      <p className="ql-modal-sender">Sent by: {selectedAnnouncement.senderName || "Admin"}</p>
      <h2>{selectedAnnouncement.subject}</h2>
      
      <p className="ql-announcement-date-modal">
  {selectedAnnouncement.timestamp
    ? new Date(
        selectedAnnouncement.timestamp.seconds
          ? selectedAnnouncement.timestamp.seconds * 1000 // Firestore Timestamp
          : selectedAnnouncement.timestamp // JavaScript Date
      ).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true, // Use 12-hour format (am/pm)
      })
    : 'No Date Available'}
</p>
      <p>{selectedAnnouncement.text}</p>
      
      {selectedAnnouncement.imageUrl && (
  <div className="ql-announcement-image">
    <img src={selectedAnnouncement.imageUrl} alt="Announcement Attachment" style={{ maxWidth: '100%' }} />
  </div>
)}

      {selectedAnnouncement.videoUrl && (
        <div className="ql-announcement-video">
          <video controls src={selectedAnnouncement.videoUrl} />
        </div>
      )}
       <button
        className="ql-delete-button"
        onClick={() => handleDeleteConfirmation(selectedAnnouncement.id, selectedAnnouncement.imageUrl)}
      >
        Delete Announcement
      </button>
    </div>
  </div>
)}




          </div>
        </div>
      </div>
    );
    
};

export default AdminAnnouncements;