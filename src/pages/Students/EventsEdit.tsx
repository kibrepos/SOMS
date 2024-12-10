import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { firestore, storage } from "../../services/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import "../../styles/CreateEvent.css"; // Shared CSS for styling
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";

interface Event {
  title: string;
  description: string;
  eventDates: { startDate: string; endDate: string }[];
  imageUrl: string;
  eventHead: string;
  venue: string;
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
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch event details
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (organizationName && eventId) {
        const eventRef = doc(
          firestore,
          "events",
          organizationName,
          "event",
          eventId
        );
        const eventDoc = await getDoc(eventRef);
        if (eventDoc.exists()) {
          const eventData = eventDoc.data() as Event;
          setEventDetails(eventData);
          setImagePreview(eventData.imageUrl || null); // Load existing image preview
        }
      }
    };

    const fetchOrganizationData = async () => {
      if (organizationName) {
        const orgRef = doc(firestore, "organizations", organizationName);
        const orgDoc = await getDoc(orgRef);
        if (orgDoc.exists()) {
          setOrganizationData(orgDoc.data());
        }
      }
    };

    fetchEventDetails();
    fetchOrganizationData();
  }, [organizationName, eventId]);

  const handleSave = async () => {
    if (!organizationName || !eventId || !eventDetails) return;

    const eventRef = doc(
      firestore,
      "events",
      organizationName,
      "event",
      eventId
    );

    try {
      // Upload new image if changed
      let imageUrl = eventDetails.imageUrl;
      if (imageFile) {
        const imageRef = ref(
          storage,
          `organizations/${organizationName}/Events/${eventId}/eventBG`
        );
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(eventRef, {
        ...eventDetails,
        imageUrl, // Updated image URL
      });

      alert("Event updated successfully");
      navigate(`/organization/${organizationName}/events`);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event");
    }
  };

  const handleCancel = () => navigate(-1);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSelectEventHead = (id: string) => {
    if (eventDetails) {
      setEventDetails({ ...eventDetails, eventHead: id });
    }
    setIsModalOpen(false);
  };

  if (!eventDetails) return <p>Loading...</p>;

  return (
    <div className="organization-dashboard-wrapper">
      <Header />
      <div className="dashboard-container">
        <div className="sidebar-section">
          <StudentPresidentSidebar />
        </div>
        
        <div className="main-content">
        <div className="header-container">
            <h1 className="headtitle">Edit event</h1>
          
          </div>
          <div className="FESTANOBRAZIL">
            <form className="CCC-create-event-form">
              <div className="CCC-form-left">
                <div className="CCC-create-event-form-group">
                  <label className="CCC-create-event-label">Event Title</label>
                  <input
                    type="text"
                    value={eventDetails.title}
                    onChange={(e) =>
                      setEventDetails({
                        ...eventDetails,
                        title: e.target.value,
                      })
                    }
                    className="CCC-create-event-input"
                  />
                </div>
                <div className="CCC-create-event-form-group">
                  <label className="CCC-create-event-label">Description</label>
                  <textarea
                    value={eventDetails.description}
                    onChange={(e) =>
                      setEventDetails({
                        ...eventDetails,
                        description: e.target.value,
                      })
                    }
                    className="CCC-create-event-textarea"
                  />
                </div>
                <div className="CCC-create-event-form-group">
                  <label className="CCC-create-event-label">Venue</label>
                  <input
                    type="text"
                    value={eventDetails.venue}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, venue: e.target.value })
                    }
                    className="CCC-create-event-input"
                  />
                </div>
                <div className="CCC-date-time-section">
                  {eventDetails.eventDates.map((date, index) => (
                    <div key={index} className="CCC-date-time-group">
                      <label className="CCC-create-event-label">
                        Start Date & Time (Day {index + 1})
                      </label>
                      <input
                        type="datetime-local"
                        value={date.startDate.substring(0, 16)}
                        onChange={(e) => {
                          const updatedDates = [...eventDetails.eventDates];
                          updatedDates[index].startDate = e.target.value;
                          setEventDetails({
                            ...eventDetails,
                            eventDates: updatedDates,
                          });
                        }}
                        className="CCC-create-event-input"
                      />
                      <label className="CCC-create-event-label">
                        End Date & Time (Day {index + 1})
                      </label>
                      <input
                        type="datetime-local"
                        value={date.endDate.substring(0, 16)}
                        onChange={(e) => {
                          const updatedDates = [...eventDetails.eventDates];
                          updatedDates[index].endDate = e.target.value;
                          setEventDetails({
                            ...eventDetails,
                            eventDates: updatedDates,
                          });
                        }}
                        className="CCC-create-event-input"
                      />
                    </div>
                  ))}
                </div>
             
              </div>

              <div className="CCC-form-right">
                <div className="CCC-create-event-form-group">
                  <label className="CCC-create-event-label">
                    Upload Event Image
                  </label>
                  <div className="CCC-image-upload">
                    <img
                      src={imagePreview || "https://via.placeholder.com/150"}
                      alt="Event"
                      className="CCC-uploaded-image"
                    />
                    <input
                      type="file"
                      onChange={handleImageChange}
                      className="CCC-create-event-input"
                      accept="image/*"
                    />
                  </div>
                </div>
                <div className="CCC-create-event-form-group">
                  <label className="CCC-create-event-label">
                    Select Event Head
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="CCC-dropdown-toggle"
                  >
                    {organizationData?.president?.id === eventDetails.eventHead
                      ? organizationData?.president?.name
                      : organizationData?.officers.find(
                          (officer: any) =>
                            officer.id === eventDetails.eventHead
                        )?.name || "Select Event Head"}
                  </button>
                </div>
              </div>
            </form>

            <div className="CCC-buttons">
              <button
                type="button"
                onClick={handleCancel}
                className="CCC-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="CCC-create-event-submit-btn"
              >
                Save Changes
              </button>
            </div>
          </div>

          {isModalOpen && (
            <div className="CCC-modal">
              <div className="CCC-modal-content">
                <h3>Select Event Head</h3>
                <div>
                  <div
                    className="CCC-dropdown-item"
                    onClick={() =>
                      handleSelectEventHead(organizationData?.president?.id)
                    }
                  >
                    <img
                      src={
                        organizationData?.president?.profilePicUrl ||
                        "default-profile.png"
                      }
                      alt="President"
                      className="CCC-dropdown-profile-pic"
                    />
                    {organizationData?.president?.name} (President)
                  </div>
                  {organizationData?.officers?.map((officer: any) => (
                    <div
                      key={officer.id}
                      className="CCC-dropdown-item"
                      onClick={() => handleSelectEventHead(officer.id)}
                    >
                      <img
                        src={
                          officer.profilePicUrl || "default-profile.png"
                        }
                        alt={officer.name}
                        className="CCC-dropdown-profile-pic"
                      />
                      {officer.name} ({officer.role})
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="CCC-close-modal-btn"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
