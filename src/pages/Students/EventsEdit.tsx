import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { firestore } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import "../../styles/EventEdit.css";
import { arrayUnion } from "firebase/firestore";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";

interface Event {
  title: string;
  description: string;
  eventDates: { startDate: string; endDate: string }[];
  imageUrl: string;
  eventHead: string;
  venue: string;
  createdAt: any;
}

const EditEvent: React.FC = () => {
  const { organizationName, eventId } = useParams<{
    organizationName: string;
    eventId: string;
  }>();

  const handleSave = async () => {
    if (!organizationName || !eventId || !eventDetails) return;
  
    const eventRef = doc(firestore, "events", organizationName, "event", eventId);
    
    try {
      await updateDoc(eventRef, {
        ...eventDetails,
        eventDates: arrayUnion(...eventDetails.eventDates), // Example for handling array fields
      });
      alert("Event updated successfully");
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Error updating event");
    }
  };
  
  
  
  
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
          setEventDetails(eventDoc.data() as Event);
        } else {
          console.error("Event not found");
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [organizationName, eventId]);

  if (loading) return <p>Loading event details...</p>;

  if (!eventDetails) return <p>Event not found. Please check the event ID.</p>;

  return (
    <div className="event-view-wrapper">
      <Header />
      <div className="dashboard-container">
      <div className="sidebar-section"><StudentPresidentSidebar /></div>
        <div className="edit-event-content">
          Edit Event
          <form className="header-container">
            <div className="form-group">
              <label>Event Title</label>
              <input
                type="text"
                value={eventDetails.title}
                onChange={(e) => setEventDetails({ ...eventDetails, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={eventDetails.description}
                onChange={(e) => setEventDetails({ ...eventDetails, description: e.target.value })}
              />
            </div>

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
              <button
                type="button"
                onClick={() =>
                  setEventDetails({
                    ...eventDetails,
                    eventDates: [...eventDetails.eventDates, { startDate: "", endDate: "" }],
                  })
                }
              >
                Add Date Range
              </button>
            </div>

            <div className="form-group">
              <label>Venue</label>
              <input
                type="text"
                value={eventDetails.venue}
                onChange={(e) => setEventDetails({ ...eventDetails, venue: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Event Head</label>
              <input
                type="text"
                value={eventDetails.eventHead}
                onChange={(e) => setEventDetails({ ...eventDetails, eventHead: e.target.value })}
              />
            </div>

            <button type="button" onClick={handleSave}>
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;
