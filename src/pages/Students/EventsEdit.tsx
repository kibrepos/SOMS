import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { firestore } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import "../../styles/EventsEdit.css";
import { arrayUnion } from "firebase/firestore";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import { showToast } from '../../components/toast';


interface Event {
  title: string;
  description: string;
  eventDates: { startDate: string; endDate: string }[];
  imageUrl: string;
  eventHead: string; // This will store the selected user's ID
  venue: string;
  createdAt: any;
}

interface User {
  id: string;
  name: string;
}

const EditEvent: React.FC = () => {
  const { organizationName, eventId } = useParams<{
    organizationName: string;
    eventId: string;
  }>();

  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]); // Store fetched users
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true); // Loading state for users
  const [eventHead, setEventHead] = useState<string | null>(null); // Event head (president or officer)
  const [isModalOpen, setIsModalOpen] = useState(false); // Manage modal visibility
  const handleSelectEventHead = (id: string) => {
    setEventHead(id);
    setIsModalOpen(false); // Close the modal after selection
  };
  
  const [organizationData, setOrganizationData] = useState<any>(null);

useEffect(() => {
  const fetchOrganizationData = async () => {
    if (!organizationName) return;

    try {
      const orgRef = doc(firestore, "organizations", organizationName);
      const orgDoc = await getDoc(orgRef);
      if (orgDoc.exists()) {
        setOrganizationData(orgDoc.data());
      } else {
        console.error("Organization not found");
      }
    } catch (error) {
      console.error("Error fetching organization data:", error);
    }
  };

  fetchOrganizationData();
}, [organizationName]);



  const handleSave = async () => {
    if (!organizationName || !eventId || !eventDetails) return;

    const eventRef = doc(firestore, "events", organizationName, "event", eventId);

    try {
      await updateDoc(eventRef, {
        ...eventDetails,
        eventDates: arrayUnion(...eventDetails.eventDates), // Ensure proper handling of array fields
      });
      showToast("Event updated successfully");

      window.history.back(); // Navigate to the previous page
    } catch (error) {
      
      console.error("Error updating event:", error);
      showToast("Error updating event");
    }
  };

  const handleCancel = () => {
    window.history.back(); // Cancel and navigate back to the previous page
  };

  // Fetch event details and users (to select from for Event Head)
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!organizationName || !eventId) {
        console.error("Missing organizationName or eventId");
        setLoading(false);
        return;
      }
  
      try {
        const eventRef = doc(firestore, "events", organizationName, "event", eventId);
        const eventDoc = await getDoc(eventRef);
  
        if (eventDoc.exists()) {
          const eventData = eventDoc.data() as Event;
          setEventDetails(eventData);
          
          // Set the event head to the current event's eventHead
          setEventHead(eventData.eventHead);
        } else {
          console.error("Event not found");
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };
  

    const fetchUsers = async () => {
      if (!organizationName) return;

      try {
        const usersRef = collection(firestore, "users"); // Assume users are in 'users' collection
        const usersSnapshot = await getDocs(usersRef);
        const usersList = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name, // Assuming the user document has a 'name' field
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchEventDetails();
    fetchUsers();
  }, [organizationName, eventId]);

  if (loading || loadingUsers) return <p>Loading event details...</p>;

  if (!eventDetails) return <p>Event not found. Please check the event ID.</p>;

  return (
    <div className="event-view-container">
      <Header />
      <div className="dashboard-container">
        <div className="sidebar-section">
          <StudentPresidentSidebar />
        </div>
        <div className="event-content">
          <h2>Edit Event</h2>
          <form className="event-form">
            {/* Event Title */}
            <div className="form-group">
              <label>Event Title</label>
              <input
                type="text"
                value={eventDetails.title}
                onChange={(e) => setEventDetails({ ...eventDetails, title: e.target.value })}
              />
            </div>
  
            {/* Event Description */}
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={eventDetails.description}
                onChange={(e) => setEventDetails({ ...eventDetails, description: e.target.value })}
              />
            </div>
  
            {/* Event Dates */}
            <div className="form-group">
              <label>Event Dates</label>
              {eventDetails.eventDates.map((date, index) => (
                <div key={index} className="event-date-group">
                  <input
                    type="datetime-local"
                    value={date.startDate ? date.startDate.substring(0, 16) : ""}
                    onChange={(e) => {
                      const newEventDates = [...eventDetails.eventDates];
                      newEventDates[index].startDate = e.target.value;
                      setEventDetails({ ...eventDetails, eventDates: newEventDates });
                    }}
                  />
                  to
                  <input
                    type="datetime-local"
                    value={date.endDate ? date.endDate.substring(0, 16) : ""}
                    onChange={(e) => {
                      const newEventDates = [...eventDetails.eventDates];
                      newEventDates[index].endDate = e.target.value;
                      setEventDetails({ ...eventDetails, eventDates: newEventDates });
                    }}
                  />
                </div>
              ))}
            </div>
  
            {/* Venue */}
            <div className="form-group">
              <label>Venue</label>
              <input
                type="text"
                value={eventDetails.venue}
                onChange={(e) => setEventDetails({ ...eventDetails, venue: e.target.value })}
              />
            </div>
  
            {/* Event Head Selection */}
            <div className="form-group">
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
  
            {/* Save and Cancel Buttons */}
            <div className="button-group">
              <button type="button" onClick={handleSave}>
                Save Changes
              </button>
              <button type="button" onClick={handleCancel}>
                Cancel Changes
              </button>
            </div>
          </form>
        </div>
  
        {/* Modal for Event Head Selection */}
        {isModalOpen && (
          <div className="modal">
            <div className="modal-content">
              <h3>Select Event Head</h3>
              <div>
                {/* President Selection */}
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
  
                {/* Officer Selection */}
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
      </div>
    </div>
  );
}

export default EditEvent;
