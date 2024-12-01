import React, { useState, useEffect } from "react";
import { firestore, storage } from "../../services/firebaseConfig"; // Firebase setup
import { doc, setDoc, serverTimestamp, collection, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import "../../styles/CreateEvent.css";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage

const CreateEvent: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null); // Image file for upload
  const [imageUrl, setImageUrl] = useState(""); // Uploaded image URL
  const [userRole, setUserRole] = useState<string | null>(null); // User role: president, officer, member
  const [currentUser, setCurrentUser] = useState<any>(null); // Current user object
  const [eventDates, setEventDates] = useState([{ startDate: "", endDate: "" }]); // Date range for event
  const [eventHead, setEventHead] = useState<string | null>(null); // Event head (president or officer)
  const [venue, setVenue] = useState(""); // Venue or Platform for the event
  const [organizationData, setOrganizationData] = useState<any>(null); // Organization data (officers, president)
  const [isModalOpen, setIsModalOpen] = useState(false); // Manage modal visibility
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    // Get current user's authentication and organization data
    auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        const fetchOrganizationData = async () => {
          if (organizationName) {
            const orgDocRef = doc(firestore, "organizations", decodeURIComponent(organizationName));
            const orgDoc = await getDoc(orgDocRef);

            if (orgDoc.exists()) {
              const orgData = orgDoc.data();
              setOrganizationData(orgData);

              if (orgData?.president?.id === user.uid) {
                setUserRole("president");
                setEventHead(orgData?.president?.id); // Set president as default event head
              } else if (orgData?.officers?.some((officer: any) => officer.id === user.uid)) {
                setUserRole("officer");
                setEventHead(orgData?.officers.find((officer: any) => officer.id === user.uid)?.id); // Set officer as event head
              } else {
                setUserRole(null);
                setEventHead(null);
              }
            }
          }
        };
        fetchOrganizationData();
      } else {
        setUserRole(null);
        setEventHead(null);
      }
    });
  }, [auth, organizationName]);

  // Handle image file selection
 // Function to handle file input change
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setImageFile(file);
  }
};

// Upload the image to Firebase Storage and get the download URL
const handleImageUpload = async (eventName: string) => {
    if (imageFile) {
      try {
        // Create a reference to the image in Firebase Storage with the name `eventBG`
        const imageRef = ref(storage, `organizations/${organizationName}/Events/${eventName}/eventBG`);
        
        // Upload the image
        await uploadBytes(imageRef, imageFile);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(imageRef);
        
        // Set the image URL state
        setImageUrl(downloadURL);
  
        console.log("Image uploaded successfully:", downloadURL);
        return downloadURL; // Ensure we return the download URL to use in Firestore
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }
  };


  // Handle form submission to create event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!eventTitle || !eventDescription || eventDates.length === 0 || !organizationName || !eventHead || !venue) {
      alert("Please fill in all fields.");
      return;
    }
  
    try {
      // Upload the image and get the URL
      const uploadedImageUrl = await handleImageUpload(eventTitle); // Use eventTitle as eventName to ensure unique folder
      
      // Ensure that organizationName is valid and not undefined
      if (!organizationName) {
        throw new Error("Organization name is undefined.");
      }
  
      // Create a reference to the subcollection under events/{organizationName}/event
      const orgEventsRef = collection(firestore, "events", organizationName, "event");
  
      // Create a new document reference in the subcollection
      const newEventRef = doc(orgEventsRef); // Firestore generates a unique document ID
  
      const newEvent = {
        title: eventTitle,
        description: eventDescription,
        eventDates: eventDates.map((date) => ({
          startDate: new Date(date.startDate).toISOString(),
          endDate: new Date(date.endDate).toISOString(),
        })),
        imageUrl: uploadedImageUrl, // Use the uploaded image URL
        eventHead: eventHead, // Store the selected event head (president or officer)
        organizationName: organizationName,
        venue: venue, // Venue or platform for the event
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid,
      };
  
      // Save the new event document to Firestore
      await setDoc(newEventRef, newEvent);
  
      alert("Event created successfully!");
      navigate(`/organization/${organizationName}/events`);
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event.");
    }
  };

  // Add/remove multiple date ranges for multi-day events
  const handleAddDateRange = () => {
    setEventDates([...eventDates, { startDate: "", endDate: "" }]);
  };

  const handleRemoveDateRange = (index: number) => {
    const updatedEventDates = eventDates.filter((_, i) => i !== index);
    setEventDates(updatedEventDates);
  };

  const handleDateChange = (index: number, field: "startDate" | "endDate", value: string) => {
    const updatedEventDates = [...eventDates];
    updatedEventDates[index][field] = value;
    setEventDates(updatedEventDates);
  };

  // Sidebar component based on user role
  const getSidebarComponent = () => {
    switch (userRole) {
      case "president":
        return <StudentPresidentSidebar />;
      case "officer":
        return <StudentOfficerSidebar />;
      case "member":
        return <StudentMemberSidebar />;
      default:
        return null;
    }
  };

  // Handle selecting an event head
  const handleSelectEventHead = (id: string) => {
    setEventHead(id);
    setIsModalOpen(false); // Close the modal after selection
  };

  return (
    <div className="organization-dashboard-wrapper">
      <Header />
      <div className="dashboard-container">
        <div className="sidebar-section">{getSidebarComponent()}</div>
        <div className="main-content">
          <h2 className="create-event-title">Create Event for {organizationName}</h2>
          <form onSubmit={handleCreateEvent} className="create-event-form">
            <div className="create-event-form-group">
              <label htmlFor="eventTitle" className="create-event-label">Event Title</label>
              <input
                type="text"
                id="eventTitle"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="create-event-input"
                required
              />
            </div>

            <div className="create-event-form-group">
              <label htmlFor="eventDescription" className="create-event-label">Event Description</label>
              <textarea
                id="eventDescription"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="create-event-textarea"
                required
              />
            </div>

            {eventDates.map((date, index) => (
              <div key={index} className="create-event-form-group">
                <label htmlFor={`startDate-${index}`} className="create-event-label">Start Date & Time (Day {index + 1})</label>
                <input
                  type="datetime-local"
                  id={`startDate-${index}`}
                  value={date.startDate}
                  onChange={(e) => handleDateChange(index, "startDate", e.target.value)}
                  className="create-event-input"
                  required
                />
                <label htmlFor={`endDate-${index}`} className="create-event-label">End Date & Time (Day {index + 1})</label>
                <input
                  type="datetime-local"
                  id={`endDate-${index}`}
                  value={date.endDate}
                  onChange={(e) => handleDateChange(index, "endDate", e.target.value)}
                  className="create-event-input"
                  required
                />
                {eventDates.length > 1 && (
                  <button type="button" onClick={() => handleRemoveDateRange(index)} className="remove-date-btn">Remove Date</button>
                )}
              </div>
            ))}

            <button type="button" onClick={handleAddDateRange} className="add-date-btn">Add Date</button>

            <div className="create-event-form-group">
              <label htmlFor="imageFile" className="create-event-label">Upload Event Image</label>
              <input
                type="file"
                id="imageFile"
                onChange={handleImageChange}
                className="create-event-input"
                accept="image/*"
              />
            </div>

            <div className="create-event-form-group">
  <label htmlFor="eventHead" className="create-event-label">Select Event Head</label>
  <button type="button" onClick={() => setIsModalOpen(true)} className="dropdown-toggle">
    {eventHead ? 
      organizationData?.president?.id === eventHead ? 
        organizationData?.president?.name : 
        organizationData?.officers.find((officer: any) => officer.id === eventHead)?.name
      : "Select Event Head"
    }
  </button>
</div>


            {/* Modal for selecting event head */}
            {isModalOpen && (
              <div className="modal">
                <div className="modal-content">
                  <h3>Select Event Head</h3>
                  <div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleSelectEventHead(organizationData?.president?.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={organizationData?.president?.profilePicUrl || "default-profile.png"}
                        alt="President"
                        className="dropdown-profile-pic"
                      />
                      {organizationData?.president?.name} (President)
                    </div>
                    {organizationData?.officers?.map((officer: any) => (
                      <div
                        key={officer.id}
                        className="dropdown-item"
                        onClick={() => handleSelectEventHead(officer.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <img
                          src={officer.profilePicUrl || "default-profile.png"}
                          alt={officer.name}
                          className="dropdown-profile-pic"
                        />
                        {officer.name} ({officer.role})
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="close-modal-btn">Close</button>
                </div>
              </div>
            )}

            <div className="create-event-form-group">
              <label htmlFor="venue" className="create-event-label">Venue/Platform</label>
              <input
                type="text"
                id="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="create-event-input"
                required
              />
            </div>

            <button type="submit" className="create-event-submit-btn">Create Event</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
