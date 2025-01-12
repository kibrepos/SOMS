import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {  doc, getDoc, collection, setDoc, Timestamp,getDocs, deleteDoc,addDoc } from "firebase/firestore";
import { auth, firestore, storage } from "../../services/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync,faTrash,faFileAlt, faFilePdf, faFileWord, faFilePowerpoint, faFileExcel   } from '@fortawesome/free-solid-svg-icons';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar'; 
import StudentMemberSidebar from './StudentMemberSidebar'; 
import '../../styles/OrganizationAnnouncement.css';
import { getAuth } from 'firebase/auth'; 

type OrganizationData = {
  name: string;
  description: string;
  coverImagePath?: string;
  profileImagePath?: string;
  members: Array<any>;
  officers: Array<any>;
  president?: any;
};
const getFileIcon = (fileName: string) => {
  if (fileName.endsWith('.pdf')) {
    return faFilePdf;
  } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return faFileWord;
  } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
    return faFilePowerpoint;
  } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
    return faFileExcel;
  } else {
    return faFileAlt;
  }
};
const getFileIconClass = (fileName: string) => {
  if (fileName.endsWith('.pdf')) {
    return 'pdf-icon';
  } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return 'word-icon';
  } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
    return 'powerpoint-icon';
  } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
    return 'excel-icon';
  } else {
    return 'file-icon';
  }
};
const OrganizationAnnouncements: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [file, setFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("desc");
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(""); // Input value for search
const [selectedDate, setSelectedDate] = useState<string>(""); // Date filter input
const [applyFilters, setApplyFilters] = useState(false); // Flag to trigger filter application
const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
const [currentUserName, setCurrentUserName] = useState<string>("Unknown");
const [currentUserProfilePic, setCurrentUserProfilePic] = useState<string>("");
const [isSending, setIsSending] = useState(false);
const [selectedAnnouncementDetails, setSelectedAnnouncementDetails] = useState<any>(null);
const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
const [role, setRole] = useState<string>('');
const [userDetails, setUserDetails] = useState<any>(null);

useEffect(() => {
  const fetchUserDetails = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      let userDocRef = doc(firestore, "students", currentUser.uid);
      let userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // If the user is not found in the "students" collection, check "faculty"
        userDocRef = doc(firestore, "faculty", currentUser.uid);
        userDoc = await getDoc(userDocRef);
      }

      if (userDoc.exists()) {
        setUserDetails(userDoc.data());
      } else {
        console.error("User not found in students or faculty collections.");
      }
    }
  };

  fetchUserDetails();
}, []);

const logActivity = async (description: string) => {
  if (organizationName && userDetails) {
    try {
      const logEntry = {
        userName: `${userDetails.firstname} ${userDetails.lastname}`,
        description,
        organizationName,
        timestamp: new Date(),
      };

      await addDoc(
        collection(firestore, `studentlogs/${organizationName}/activitylogs`),
        logEntry
      );
      console.log("Activity logged:", logEntry);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }
};


const fetchStudentData = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No authenticated user found");
    return;
  }

  const userId = user.uid;
  console.log("Fetching data for user:", userId);

  try {
    // Fetch the student data from the Firestore "students" collection
    const studentDocRef = doc(firestore, "students", userId);
    const studentDoc = await getDoc(studentDocRef);

    if (studentDoc.exists()) {
      const studentData = studentDoc.data();
      console.log("Student Data:", studentData);

      // Check if data fields exist before setting state
      const fullName = `${studentData?.firstname || ""} ${studentData?.lastname || ""}`.trim();
      const profilePic = studentData?.profilePicUrl || "";

      setCurrentUserName(fullName || "Unknown");
      setCurrentUserProfilePic(profilePic);
    } else {
      console.error("Student document does not exist in Firestore");
    }
  } catch (error) {
    console.error("Error fetching student data:", error);
  }
};


useEffect(() => {
  // Wait until `auth.currentUser` is ready before fetching data
  if (auth.currentUser) {
    fetchStudentData();
  } else {
    console.error("User is not authenticated");
  }
}, []);

  // Fetch Organization Data
  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        if (organizationName && auth.currentUser) {
          const orgDocRef = doc(firestore, 'organizations', organizationName);
          const orgDoc = await getDoc(orgDocRef);

          if (orgDoc.exists()) {
            const orgData = orgDoc.data() as OrganizationData;
            setOrganizationData(orgData);
          }
        }
      } catch (error) {
        console.error("Error fetching organization data:", error);
      }
    };

    fetchOrganizationData();
    fetchAnnouncements();
  }, [organizationName]);

  useEffect(() => {
    const sortedAnnouncements = [...announcements].sort((a, b) => {
      const dateA = new Date(a.timestamp.seconds * 1000).getTime();
      const dateB = new Date(b.timestamp.seconds * 1000).getTime();
      return sortBy === "desc" ? dateB - dateA : dateA - dateB;
    });
  
    setFilteredAnnouncements(sortedAnnouncements);
  }, [announcements, sortBy]);
  useEffect(() => {
    if (applyFilters) {
      applySearchAndFilters();
    }
  }, [applyFilters]);
  
  const handleApplyFilters = () => {
    setApplyFilters(true);
    applySearchAndFilters();
  };
 

 const applySearchAndFilters = () => {
  let filtered = [...announcements]; // Use the original announcements list

  // Filter by audience
  if (audience !== "All") {
    filtered = filtered.filter(
      (announcement) => announcement.audience.toLowerCase() === audience.toLowerCase()
    );
  }

  // Apply date filter if a date is selected
  if (selectedDate) {
    filtered = filtered.filter((announcement) => {
      const announcementDate = new Date(announcement.timestamp.seconds * 1000);
      const filterDate = new Date(selectedDate);
      return announcementDate.toDateString() === filterDate.toDateString();
    });
  }

  // Apply search term filter if provided
  if (searchInput.trim() !== "") {
    filtered = filtered.filter(
      (announcement) =>
        announcement.subject.toLowerCase().includes(searchInput.toLowerCase()) ||
        announcement.message.toLowerCase().includes(searchInput.toLowerCase())
    );
  }

  // Sort the filtered results
  filtered.sort((a, b) => {
    const dateA = new Date(a.timestamp.seconds * 1000).getTime();
    const dateB = new Date(b.timestamp.seconds * 1000).getTime();
    return sortBy === "desc" ? dateB - dateA : dateA - dateB;
  });

  setFilteredAnnouncements(filtered);
  setApplyFilters(false); // Reset the flag after applying filters
};

  

  const fetchAnnouncements = async () => {
    try {
      if (!organizationName) return;
  
      setLoading(true);
  
      const orgNotificationsRef = doc(firestore, "notifications", organizationName);
      const subCollectionRef = collection(orgNotificationsRef, "organizationAnnouncements");
  
      const snapshot = await getDocs(subCollectionRef);
  
      if (snapshot.empty) {
        console.log("No announcements found for this organization");
      } else {
        console.log("Fetched documents:", snapshot.docs.map(doc => doc.data()));
      }
  
      const fetchedAnnouncements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      setAnnouncements(fetchedAnnouncements);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    }
  };
  const resetFilters = () => {
    // Reset all filter inputs
    setAudience("All");
    setSortBy("desc");
    setSearchInput("");
    setSelectedDate("");
  
    // Ensure filtered announcements reset to the original list
    setFilteredAnnouncements([...announcements]);
  
    // Trigger a re-render by applying default sorting
    const sortedAnnouncements = [...announcements].sort((a, b) => {
      const dateA = new Date(a.timestamp.seconds * 1000).getTime();
      const dateB = new Date(b.timestamp.seconds * 1000).getTime();
      return sortBy === "desc" ? dateB - dateA : dateA - dateB;
    });
    setFilteredAnnouncements(sortedAnnouncements);
  };
  
  const handleSelectAnnouncement = (id: string) => {
    if (selectedAnnouncements.includes(id)) {
      setSelectedAnnouncements(selectedAnnouncements.filter((announcementId) => announcementId !== id));
    } else {
      setSelectedAnnouncements([...selectedAnnouncements, id]);
    }
  };
  
  // Function to handle multiple deletions
  const handleDeleteSelected = async () => {
    if (selectedAnnouncements.length === 0) return;
  
    const confirmDelete = window.confirm("Are you sure you want to delete the selected announcements?");
    if (!confirmDelete) return;
  
    try {
      const deletionCount = selectedAnnouncements.length;
      await Promise.all(
        selectedAnnouncements.map(async (id) => {
          if (organizationName) {
            // Delete from organization-specific subcollection
            const orgNotificationRef = doc(firestore, "notifications", organizationName, "organizationAnnouncements", id);
            await deleteDoc(orgNotificationRef);

 
        
          };
        })
      );
  
      await logActivity(`Deleted ${deletionCount} announcement(s)`);
      await fetchAnnouncements();
      setSelectedAnnouncements([]);
    } catch (error) {
      console.error("Error deleting announcements:", error);
    }
  };

  const openDetailsModal = (announcement: any) => {
    setSelectedAnnouncementDetails(announcement);
    setIsDetailsModalOpen(true);
  };
  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAnnouncementDetails(null);
  };

  
  useEffect(() => {
    const fetchRole = async () => {
      try {
        if (organizationName && auth.currentUser) {
          const orgDocRef = doc(firestore, 'organizations', organizationName);
          const orgDoc = await getDoc(orgDocRef);
  
          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            const userId = auth.currentUser.uid;
  
            if (orgData.president?.id === userId) {
              setRole('president');
            } else if (orgData.officers?.some((officer: any) => officer.id === userId)) {
              setRole('officer');
            } else if (orgData.facultyAdviser?.id === userId) { // Check for faculty adviser
              setRole('faculty');
            } else if (orgData.members?.some((member: any) => member.id === userId)) {
              setRole('member');
            } else {
              setRole('guest');
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole('guest');
      }
    };
  
    fetchRole();
  }, [organizationName]);
  
  const renderSidebar = () => {
    switch (role) {
      case 'president':
        return <StudentPresidentSidebar />;
      case 'officer':
        return <StudentPresidentSidebar  />;
        case 'faculty':
          return <StudentPresidentSidebar  />;
      case 'member':
        return <StudentMemberSidebar />;
      default:
        return null; // Or render a default/empty sidebar for guests
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    const user = auth.currentUser;
    if (!user || !organizationData) return;
  
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let isImage = false;
    let isVideo = false;

    const selectedAudience = audience.trim() === "" ? "everyone" : audience;
      if (file) {
    try {
      const fileRef = ref(storage, `announcements/${organizationName}/${file.name}`);
      await uploadBytes(fileRef, file);
      fileUrl = await getDownloadURL(fileRef);
      fileName = file.name; // Save the file name

      // Determine if the file is an image or video
      const fileType = file.type;
      isImage = fileType.startsWith("image/");
      isVideo = fileType.startsWith("video/");
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }
  
    const newAnnouncement = {
      organizationNameAnnouncement: organizationName,
      subject: announcementSubject.trim(),
      message: announcementMessage.trim(),
      audience: selectedAudience,
      senderName: currentUserName,
      senderProfilePic: currentUserProfilePic,
      timestamp: Timestamp.now(),
      fileUrl,
      fileName, 
      isImage,
      isVideo,
      type: "announcement",
      isRead: false,
    };
  
    console.log("Creating new announcement:", newAnnouncement);
  
    // Add the announcement to user-specific notifications
    await sendNotifications(newAnnouncement);
  
    // Save to organization's subcollection
    if (organizationName) {
      try {
        const orgNotificationsRef = doc(firestore, "notifications", organizationName);
        const subCollectionRef = collection(orgNotificationsRef, "organizationAnnouncements");
        await setDoc(doc(subCollectionRef), newAnnouncement);
        await logActivity(`Created a new announcement`);     
      } catch (error) {
        console.error("Error saving to organization's subcollection:", error);
      }
    }
  
    // Reset form fields
    setAnnouncementSubject("");
    setAnnouncementMessage("");
    setFile(null);
    setIsModalOpen(false);
  
    // Fetch the updated announcements
    await fetchAnnouncements();
    setIsSending(false);
  };
  

  // Send Notifications to Users
  const sendNotifications = async (announcement: any) => {
    if (!organizationData) {
      console.error("Organization data not found");
      return;
    }
  
    const userIdsToNotify: string[] = [];
  
    if (announcement.audience === "everyone") {
      organizationData.members.forEach((member) => {
        if (member.id) userIdsToNotify.push(member.id);
      });
    } else if (announcement.audience === "officers") {
      organizationData.officers.forEach((officer) => {
        if (officer.id) userIdsToNotify.push(officer.id);
      });
      if (organizationData.president?.id) {
        userIdsToNotify.push(organizationData.president.id);
      }
    }
  
    await Promise.all(
      userIdsToNotify.map(async (userId) => {
        const notificationRef = doc(
          collection(firestore, "notifications", userId, "userNotifications")
        );
        await setDoc(notificationRef, { ...announcement });
      })
    );
  };
  

  return (
    <div className="organization-announcements-page">
      <Header />
      <div className="organization-announcements-container">
      {renderSidebar()}
  <div className="organization-announcements-content">
  <div className="header-container">
  <h1 className="headtitle">Announcements</h1>

    {/* Announcement Creation Button */}
    {["president", "officer", "faculty"].includes(role) && (
      <button onClick={() => setIsModalOpen(true)} className="create-new-btn">
        + Add New Announcement
      </button>
    )}
    </div>
{isModalOpen && (
  <div className="organization-announcements-modal-overlay" onClick={() => setIsModalOpen(false)}>
    <div className="organization-announcements-modal-container" onClick={(e) => e.stopPropagation()}>
      <div className="organization-announcements-modal-header">
        <h2>Create Announcement</h2>
        <button
          className="organization-announcements-modal-close-button"
          onClick={() => setIsModalOpen(false)}
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleAddAnnouncement} className="organization-announcements-announcement-form">
        {/* Announcement Subject */}
        <div className="organization-announcements-form-group">
          <label htmlFor="subject">Subject</label>
          <input
            type="text"
            id="subject"
            value={announcementSubject}
            onChange={(e) => setAnnouncementSubject(e.target.value)}
            placeholder="Enter announcement subject"
            required
          />
        </div>

        {/* Announcement Message */}
        <div className="organization-announcements-form-group">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            value={announcementMessage}
            onChange={(e) => setAnnouncementMessage(e.target.value)}
            placeholder="Enter announcement message"
            rows={5}
            required
          />
        </div>

        {/* Audience Selection */}
        <div className="organization-announcements-form-group">
          <label htmlFor="audience">Audience</label>
          <select
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
         
            <option value="everyone">Everyone</option>
            <option value="officers">Officers Only</option>
          </select>
        </div>

        {/* File Upload */}
        <div className="organization-announcements-form-group">
          <label htmlFor="fileUpload">Attach File (Optional)</label>
          <input
            type="file"
            id="fileUpload"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* Submit Button */}
        <button type="submit" className="organization-announcements-send-announcement-button">
          Send Announcement
        </button>
      </form>
    </div>
  </div>
)}
{isSending && (
  <div className="loading-overlay">
    <div className="loading-spinner"></div>
  </div>
)}
    {/* Filters Section */}
    <div className="organization-announcements-filters-section">
  {/* Audience Dropdown */}
  <select value={audience} onChange={(e) => setAudience(e.target.value)}>
    <option value="All">All</option>
    <option value="everyone">Everyone</option>
    <option value="officers">Officers Only</option>
  </select>

  {/* Sort By Dropdown */}
  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
    <option value="desc">DESC</option>
    <option value="asc">ASC</option>
  </select>

  {/* Date Picker */}
  <input
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    placeholder="Filter by Date"
  />

  {/* Search Input */}
  <input
    type="text"
    value={searchInput}
    placeholder="Search..."
    className="tksks-search-input"
    onChange={(e) => setSearchInput(e.target.value)}
  />
  <button onClick={handleApplyFilters} className="organization-announcements-apply-button">
    Apply
  </button>
    <button onClick={resetFilters} className="organization-announcements-reset-button">
    <FontAwesomeIcon icon={faSync} /> Reset
  </button>
  {role !== 'member' && (
    <button
      onClick={handleDeleteSelected}
      className="organization-announcements-delete-button"
      disabled={selectedAnnouncements.length === 0}
    >
      <FontAwesomeIcon icon={faTrash} />
    </button>
  )}

</div>

{isDetailsModalOpen && selectedAnnouncementDetails && (
  <div className="orgy-announcy-overlay">
    <div className="orgy-announcy-content">
      <span className="orgy-announcy-close" onClick={closeDetailsModal}>&times;</span>

      {/* Sender Information */}
      <div className="orgy-announcy-header">
        <img
          src={selectedAnnouncementDetails.senderProfilePic || '/default-profile.png'}
          alt="Sender"
          className="orgy-announcy-profile-pic"
        />
        <div className="orgy-announcy-sender-info">
          <strong>{selectedAnnouncementDetails.senderName || "Unknown Sender"}</strong>
          {selectedAnnouncementDetails.organizationNameAnnouncement && (
            <span>via {selectedAnnouncementDetails.organizationNameAnnouncement}</span>
          )}
          
        </div>
        
      </div>
  {/* Announcement Date and Time */}
  <p className="orgy-announcy-timestamp">
        {new Date(selectedAnnouncementDetails.timestamp.seconds * 1000).toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })}
      </p>

      <h2 className="orgy-announcy-subject">{selectedAnnouncementDetails.subject}</h2>

    
      {/* Message with original formatting */}
      <div className="orgy-announcy-message" style={{ whiteSpace: 'pre-wrap' }}>
        {selectedAnnouncementDetails.message}
      </div>

   {/* Display attached file */}
{/* Display attached file */}
{selectedAnnouncementDetails.fileUrl && (
  <>
    {selectedAnnouncementDetails.isImage ? (
      <div className="orgy-announcy-image-container">
        <img
          src={selectedAnnouncementDetails.fileUrl}
          alt="Attachment"
          className="orgy-announcy-image"
        />
      </div>
    ) : selectedAnnouncementDetails.isVideo ? (
      <div className="orgy-announcy-video-container">
        <video
          src={selectedAnnouncementDetails.fileUrl}
          controls
          className="orgy-announcy-video"
        />
      </div>
    ) : (
      <div className="orgy-announcy-file-container">
        {/* Displaying icon and file name for other file types */}
        <FontAwesomeIcon icon={getFileIcon(selectedAnnouncementDetails.fileName)} className={getFileIconClass(selectedAnnouncementDetails.fileName)} />
        <a
          href={selectedAnnouncementDetails.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="orgy-announcy-file-link"
        >
          {selectedAnnouncementDetails.fileName}
        </a>
      </div>
    )}
  </>
)}


    </div>
  </div>
)}



<div className="organization-announcements-table">
  {loading ? (
    <p>Loading announcements...</p>
  ) : filteredAnnouncements.length > 0 ? (
    filteredAnnouncements.map((announcement) => (
      <div key={announcement.id} className="organization-announcements-row">
         <div key={announcement.id} className="organization-announcements-row">
       {role !== "member" && (
  <input
    type="checkbox"
    checked={selectedAnnouncements.includes(announcement.id)}
    onChange={() => handleSelectAnnouncement(announcement.id)}
  />
)}

       <div className="organization-announcements-date">
  {new Date(announcement.timestamp.seconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })} <br />
  {new Date(announcement.timestamp.seconds * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}
</div></div>
        <div className="organization-announcements-details">
          <h3>{announcement.subject}</h3>
          <p>{announcement.message}</p>
          {announcement.fileUrl && (
            <a href={announcement.fileUrl} target="_blank" rel="noopener noreferrer">
              View Attachment
            </a>
          )}
        </div>
        <button
        className="organization-announcements-details-button"
        onClick={() => openDetailsModal(announcement)}
      >
        Details
      </button>
      </div>
    ))
  ) : (
    <p>No announcements available</p>
  )}
</div>

  </div>
</div>


    </div>
  );
};

export default OrganizationAnnouncements;
