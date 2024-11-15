import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { collection, addDoc, getDocs, doc, getDoc, setDoc,Timestamp,DocumentData,query, orderBy,deleteDoc, startAfter, limit } from "firebase/firestore";
import AdminSidebar from './AdminSidebar';
import { auth } from "../../services/firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL, } from "firebase/storage";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash,faSync } from '@fortawesome/free-solid-svg-icons';
import '../../styles/AdminAnnouncements.css';

const AdminAnnouncements: React.FC = () => {
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [announcements, setAnnouncements] = useState<any[]>([]);;
  const [image, setImage] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [filterSearchInput, setFilterSearchInput] = useState("");
const [filterSelectedDate, setFilterSelectedDate] = useState<string>("");
const [filterAudience, setFilterAudience] = useState("everyone");
const [filterSortBy, setFilterSortBy] = useState("desc");
const [allAnnouncements, setAllAnnouncements] = useState<any[]>([]); // All fetched announcements
const [filteredAnnouncements, setFilteredAnnouncements] = useState<any[]>([]); // Filtered announcements
const [lastLoadedIndex, setLastLoadedIndex] = useState(10); // Pagination index
const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
const [selectAll, setSelectAll] = useState(false);
const [isLoading, setIsLoading] = useState(false);



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
    if (loadingMore || allLoaded) return;
  
    setLoadingMore(true);
  
    try {
      // Check if we have already loaded all filtered announcements
      if (lastLoadedIndex < filteredAnnouncements.length) {
        const nextIndex = lastLoadedIndex + 10;
        const moreLocalAnnouncements = filteredAnnouncements.slice(lastLoadedIndex, nextIndex);
        
        setAnnouncements((prev) => [...prev, ...moreLocalAnnouncements]);
        setLastLoadedIndex(nextIndex);
        setLoadingMore(false);
        return;
      }
  

      if (lastVisible) {
        const announcementCollection = collection(firestore, "notifications");
        const moreAnnouncementsQuery = query(
          announcementCollection,
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
            audience: doc.data().audience || "everyone",
          }));
  
          setAllAnnouncements((prev) => [...prev, ...newAnnouncements]);
          setFilteredAnnouncements((prev) => [...prev, ...newAnnouncements]);
          setAnnouncements((prev) => [...prev, ...newAnnouncements.slice(0, 10)]);
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  
          // Update the loaded index for the filtered list
          setLastLoadedIndex((prev) => prev + newAnnouncements.length);
  
          // Check if we have loaded less than 10 announcements, meaning no more data
          if (snapshot.docs.length < 10) {
            setAllLoaded(true);
          }
        } else {
          setAllLoaded(true);
        }
      } else {
        setAllLoaded(true);
      }
    } catch (error) {
      console.error("Error loading more announcements:", error);
    } finally {
      setLoadingMore(false);
    }
  };
  

  const handleApplyFilters = () => {
    filterAnnouncements();
    setAllLoaded(false); // Reset the allLoaded flag when filters are applied
  };
  
  const filterAnnouncements = () => {
    let filtered = [...allAnnouncements];
  
    // Apply search filter
    if (filterSearchInput.trim()) {
      filtered = filtered.filter(
        (announcement) =>
          (announcement.subject && announcement.subject.toLowerCase().includes(filterSearchInput.toLowerCase())) ||
        (announcement.message && announcement.message.toLowerCase().includes(filterSearchInput.toLowerCase())) ||
        (announcement.senderName && announcement.senderName.toLowerCase().includes(filterSearchInput.toLowerCase()))
      );
    }
  
    // Apply audience filter
    if (filterAudience !== "everyone") {
      filtered = filtered.filter((announcement) => announcement.audience === filterAudience);
    }
  
    // Apply date filter
    if (filterSelectedDate) {
      filtered = filtered.filter((announcement) => {
        const announcementDate = new Date(announcement.timestamp);
        const filterDate = new Date(filterSelectedDate);
        return announcementDate.toDateString() === filterDate.toDateString();
      });
    }
  
    // Sort the filtered announcements
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return filterSortBy === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
  
    setFilteredAnnouncements(filtered);
    setAnnouncements(filtered.slice(0, 10)); // Display only first 10 after filtering
    setLastLoadedIndex(10); // Reset pagination index
  };

  
  const handleResetFilters = () => {
    setFilterSearchInput("");
    setFilterSelectedDate("");
    setFilterAudience("everyone");
    setFilterSortBy("desc");
  
    setFilteredAnnouncements(allAnnouncements);
    setAnnouncements(allAnnouncements.slice(0, 10)); // Reset to show first 10 unfiltered announcements
    setLastLoadedIndex(10);
    setAllLoaded(false); // Reset the allLoaded flag
  };
  
  
  const fetchAnnouncements = async () => {
    const announcementCollection = collection(firestore, "notifications");
    const announcementsQuery = query(announcementCollection, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(announcementsQuery);
  
    const announcementList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null,
      audience: doc.data().audience || "everyone",
    }));
    
    setAllAnnouncements(announcementList);
    setFilteredAnnouncements(announcementList);
    setAnnouncements(announcementList.slice(0, 10)); // Initially show only 10
    setLastLoadedIndex(10);
  };
  
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAnnouncements([]);
    } else {
      setSelectedAnnouncements(announcements.map((announcement) => announcement.id));
    }
    setSelectAll(!selectAll);
  };
  
  const handleSelectAnnouncement = (announcementId: string) => {
    if (selectedAnnouncements.includes(announcementId)) {
      setSelectedAnnouncements(
        selectedAnnouncements.filter((id) => id !== announcementId)
      );
    } else {
      setSelectedAnnouncements([...selectedAnnouncements, announcementId]);
    }
  };
  
  const handleDeleteSelected = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete the selected announcements?"
    );
    if (confirmDelete) {
      for (const announcementId of selectedAnnouncements) {
        await deleteDoc(doc(firestore, "notifications", announcementId));
      }
      setSelectedAnnouncements([]);
      fetchAnnouncements();
      alert("Selected announcements deleted successfully.");
    }
  };
  

  const getAllUserIDs = async () => {
    const students = await getUserIDsByType("students");
    const faculty = await getUserIDsByType("faculty");
    return [...students, ...faculty];
  };
  

  const sendUserNotification = async (
    userID: string,
    notificationId: string,
    subject: string,
    message: string,
    senderName: string,
    audience: string,
    fileUrl: string | null = null,
    isImage: boolean = false,
    isVideo: boolean = false
  ) => {
    const userNotificationRef = doc(
      collection(firestore, "notifications", userID, "userNotifications"),
      notificationId
    );
  
    await setDoc(userNotificationRef, {
      senderName: `GPadmin ${senderName}`,
      subject,
      message,
      audience,
      fileUrl,
      isImage,
      isVideo,
      timestamp: new Date(),
      isRead: false,
      type: "announcement",
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    const senderName = await fetchSenderFirstName();

    let fileUrl = null;
    let isImage = false;
    let isVideo = false;

   if (image) {
  const storageRef = ref(storage, `announcements/${image.name}`);
  await uploadBytes(storageRef, image);
  fileUrl = await getDownloadURL(storageRef);

  // Check the file type
  const fileType = image.type;
  if (fileType.startsWith("image/")) {
    isImage = true;
  } else if (fileType.startsWith("video/")) {
    isVideo = true;
  }
}

  
const announcementDocRef = await addDoc(collection(firestore, "notifications"), {
  subject: announcementSubject,
  text: announcementText,
  audience,
  timestamp: Timestamp.now(),
  senderName,
  fileUrl,
  isImage,
  isVideo,
});
  
    const notificationId = announcementDocRef.id;
    let userIDs: string[] = [];
  
    // Determine audience
    if (audience === "everyone") {
      userIDs = await getAllUserIDs();
    } else if (audience === "students") {
      userIDs = await getUserIDsByType("students");
    } else if (audience === "faculty") {
      userIDs = await getUserIDsByType("faculty");
    }
  
    // Send notifications to the selected users
    await Promise.all(
      userIDs.map((userID) =>
        sendUserNotification(
          userID,
          notificationId,
          announcementSubject,
          announcementText,
          senderName,
          audience,
          fileUrl
        )
      )
    );
  
    setAnnouncementText("");
    setAnnouncementSubject("");
    setImage(null);
    fetchAnnouncements();
    setIsModalOpen(false);
    setIsLoading(false); 
  };
  
const getUserIDsByType = async (userType: string) => {
  const userCollection = collection(firestore, userType);
  const snapshot = await getDocs(userCollection);
  const userIDs = snapshot.docs.map((doc) => doc.id);
  return userIDs;
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
    Add files (optional)
  </label>
  <input
  type="file"
  id="file-upload"
  className="ql-file-input"
  onChange={(e) => {
    const file = e.target.files?.[0];
    setImage(file || null); 
  }}
/>




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
  <button
            type="submit"
            className="ql-modal-submit-button"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Announcement"}
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

<div className="filters-section">
<input
  type="text"
  value={filterSearchInput}
  placeholder="Search by subject, message, or sender..."
  onChange={(e) => setFilterSearchInput(e.target.value)}
/>

  <select value={filterAudience} onChange={(e) => setFilterAudience(e.target.value)}>
    <option value="everyone">Everyone</option>
    <option value="students">Students</option>
    <option value="faculty">Faculty</option>
  </select>
  <select value={filterSortBy} onChange={(e) => setFilterSortBy(e.target.value)}>
    <option value="desc">DESC</option>
    <option value="asc">ASC</option>
  </select>
  <input
    type="date"
    value={filterSelectedDate}
    onChange={(e) => setFilterSelectedDate(e.target.value)}
  />
  <button onClick={handleApplyFilters} className="apply-button">Apply</button>
  <button onClick={handleResetFilters} className="reset-button">
  <FontAwesomeIcon icon={faSync} className="reset-icon" /> Reset
</button>

  <button
        className="delete-all-button"
        onClick={handleDeleteSelected}
        disabled={selectedAnnouncements.length === 0}
      >
        <FontAwesomeIcon icon={faTrash} /> Delete Selected
      </button>
</div>

{isLoading && (
  <div className="loading-overlay">
    <div className="loading-spinner"></div>
  </div>
)}

<ul className="ql-announcements-list">
  {/* Header Row with checkboxes and Delete Button */}
  <div className="ql-announcements-header">
    <div className="ql-checkbox-column">
      {/* Select All Checkbox */}
      <input
        type="checkbox"
        checked={selectAll}
        onChange={handleSelectAll}
      />
    </div>
    <div className="ql-date-header">Date</div>
    <div className="ql-announcement-header">Announcements</div>
    <div className="ql-actions-header"></div>
  </div>

  {/* List of Announcements */}
  {announcements.map((announcement) => (
    <li key={announcement.id} className="ql-announcement-item">
      <div className="announcement-content">
        {/* Checkbox for each announcement */}
        <div className="checkbox-column">
          <input
            type="checkbox"
            checked={selectedAnnouncements.includes(announcement.id)}
            onChange={() => handleSelectAnnouncement(announcement.id)}
          />
        </div>

        {/* Left Section: Date */}
        <div className="announcement-date">
          <p className="announcement-date-text">
            {announcement.timestamp
              ? new Date(announcement.timestamp).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'No Date'}
          </p>
          <p className="announcement-time-text">
            {announcement.timestamp
              ? new Date(announcement.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                })
              : ''}
          </p>
        </div>

        {/* Right Section: Announcement Details */}
        <div className="announcement-details">
          <h4 className="announcement-sender">{announcement.senderName || "Unknown User"}</h4>
          <p className="announcement-subject">{announcement.subject}</p>
          <p
            className="announcement-message"
            title={announcement.text} // Tooltip with full text on hover
          >
            {announcement.text.length > 100
              ? `${announcement.text.substring(0, 90)}...`
              : announcement.text}
          </p>
        </div>

        {/* Details Button */}
        <button
          className="announcement-details-button"
          onClick={() => {
            setSelectedAnnouncement(announcement);
            setIsViewModalOpen(true);
          }}
        >
          Details
        </button>
      </div>
    </li>
  ))}

<div className="ql-load-more-container">
  {loadingMore ? (
    <button disabled className="load-more-btn loading">Loading...</button>
  ) : !allLoaded ? (
    <button onClick={fetchMoreAnnouncements} className="load-more-btn">
      Load More Announcements
    </button>
  ) : (
    <button disabled className="load-more-btn disabled">All Announcements Loaded</button>
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
      
      {selectedAnnouncement.fileUrl && selectedAnnouncement.isImage && (
  <div className="ql-announcement-image">
    <img src={selectedAnnouncement.fileUrl} alt="Announcement Attachment" style={{ maxWidth: '100%' }} />
  </div>
)}

{selectedAnnouncement.fileUrl && selectedAnnouncement.isVideo && (
  <div className="ql-announcement-video">
    <video controls src={selectedAnnouncement.fileUrl} style={{ maxWidth: '100%' }} />
  </div>
)}

{selectedAnnouncement.fileUrl && !selectedAnnouncement.isImage && !selectedAnnouncement.isVideo && (
  <div className="ql-announcement-file">
    <a href={selectedAnnouncement.fileUrl} target="_blank" rel="noopener noreferrer">
      View Attachment
    </a>
  </div>
)}

       
    </div>
  </div>
)}




          </div>
        </div>
      </div>
    );
    
};

export default AdminAnnouncements;