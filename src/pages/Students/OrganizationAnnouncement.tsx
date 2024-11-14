import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {  doc, getDoc, collection, setDoc, Timestamp,getDocs, deleteDoc } from "firebase/firestore";
import { auth, firestore, storage } from "../../services/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync,faTrash  } from '@fortawesome/free-solid-svg-icons';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import '../../styles/OrganizationAnnouncement.css';

type OrganizationData = {
  name: string;
  description: string;
  coverImagePath?: string;
  profileImagePath?: string;
  members: Array<any>;
  officers: Array<any>;
  president?: any;
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
  // Handle search and filter by applying both search term and date filter
const applySearchAndFilters = () => {
  let filtered = [...announcements];
  if (audience === "officers") {
    filtered = filtered.filter(
      (announcement) => announcement.audience === "officers"
    );
  } else if (audience === "everyone") {
    filtered = filtered.filter(
      (announcement) => announcement.audience === "everyone"
    );
  }
  // Apply date filter if selected
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
    setAudience("All");
    setSortBy("desc");
    setSearchInput("");
    setSelectedDate("");
    setFilteredAnnouncements(announcements); // Reset to original list
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
      await Promise.all(
        selectedAnnouncements.map(async (id) => {
          if (organizationName) {
            // Delete from organization-specific subcollection
            const orgNotificationRef = doc(firestore, "notifications", organizationName, "organizationAnnouncements", id);
            await deleteDoc(orgNotificationRef);
  
        
          };
        })
      );
  
      // Refresh announcements after deletion
      await fetchAnnouncements();
      setSelectedAnnouncements([]);
    } catch (error) {
      console.error("Error deleting announcements:", error);
    }
  };


  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const user = auth.currentUser;
    if (!user || !organizationData) return;
  
    let fileUrl: string | null = null;
  
    const selectedAudience = audience.trim() === "" ? "everyone" : audience;
    if (file) {
      try {
        const fileRef = ref(storage, `announcements/${organizationName}/${file.name}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
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
        console.log("Announcement added to organization subcollection");
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
  <StudentPresidentSidebar />
  <div className="organization-announcements-content">
    <h2>{organizationData?.name} Announcements</h2>

    {/* Announcement Creation Button */}
    {(organizationData?.officers.some(officer => officer.id === auth.currentUser?.uid) ||
      organizationData?.president?.id === auth.currentUser?.uid) && (
      <button onClick={() => setIsModalOpen(true)} className="organization-announcements-create-announcement-button">
        Add New Announcement
      </button>
    )}
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
            accept="image/*, video/*"
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
    onChange={(e) => setSearchInput(e.target.value)}
  />

  {/* Apply Button */}
  <button onClick={handleApplyFilters} className="organization-announcements-apply-button">
    Apply
  </button>
    {/* Reset Button with Icon */}
    <button onClick={resetFilters} className="organization-announcements-reset-button">
    <FontAwesomeIcon icon={faSync} /> Reset
  </button>
  <button onClick={handleDeleteSelected} className="organization-announcements-delete-button" disabled={selectedAnnouncements.length === 0}>
      <FontAwesomeIcon icon={faTrash} />
    </button>

</div>




<div className="organization-announcements-table">
  {loading ? (
    <p>Loading announcements...</p>
  ) : filteredAnnouncements.length > 0 ? (
    filteredAnnouncements.map((announcement) => (
      <div key={announcement.id} className="organization-announcements-row">
         <div key={announcement.id} className="organization-announcements-row">
          <input
            type="checkbox"
            checked={selectedAnnouncements.includes(announcement.id)}
            onChange={() => handleSelectAnnouncement(announcement.id)}
          />
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
        <button className="organization-announcements-details-button">Details</button>
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
