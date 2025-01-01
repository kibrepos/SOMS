import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "../../services/firebaseConfig";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";

const EventReport: React.FC = () => {
  const { organizationName, eventId } = useParams<{
    organizationName: string;
    eventId: string;
  }>();

  const [eventDetails, setEventDetails] = useState<any>(null);
  const [attendeesByDay, setAttendeesByDay] = useState<any>({});
  const [attendanceByDay, setAttendanceByDay] = useState<any>({});
  const [eventHead, setEventHead] = useState<string>("N/A");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!organizationName || !eventId) return;
  
      try {
        // Fetch from both "event" and "archivedEvents" collections
        let eventData: any = null;
  
        // Try fetching from "event" collection
        const eventDoc = doc(firestore, `events/${organizationName}/event/${eventId}`);
        const eventSnapshot = await getDoc(eventDoc);
        if (eventSnapshot.exists()) {
          eventData = { ...eventSnapshot.data(), isArchived: false };
        } else {
          // If not found in "event," fetch from "archivedEvents"
          const archivedEventDoc = doc(firestore, `events/${organizationName}/archivedEvents/${eventId}`);
          const archivedEventSnapshot = await getDoc(archivedEventDoc);
          if (archivedEventSnapshot.exists()) {
            eventData = { ...archivedEventSnapshot.data(), isArchived: true };
          }
        }
  
        if (!eventData) {
          console.error("Event not found");
          return;
        }
  
        // Verify and handle eventHead
        if (!eventData.eventHead) {
          console.warn("eventHead property is missing in event data.");
          eventData.eventHead = null; // Ensure eventHead exists, even if null
        }
  
        setEventDetails(eventData);
  
        // Fetch attendees by day
        const attendeesCollection = collection(
          firestore,
          `events/${organizationName}/${eventData.isArchived ? "archivedEvents" : "event"}/${eventId}/attendees`
        );
        const attendeesSnapshot = await getDocs(attendeesCollection);
        const attendeesData: any = {};
        attendeesSnapshot.docs.forEach((doc) => {
          attendeesData[doc.id] = doc.data().attendees || [];
        });
        setAttendeesByDay(attendeesData);
  
        // Fetch attendance by day
        const attendanceCollection = collection(
          firestore,
          `events/${organizationName}/${eventData.isArchived ? "archivedEvents" : "event"}/${eventId}/attendance`
        );
        const attendanceSnapshot = await getDocs(attendanceCollection);
        const attendanceData: any = {};
        attendanceSnapshot.docs.forEach((doc) => {
          attendanceData[doc.id] = doc.data().attendees || [];
        });
        setAttendanceByDay(attendanceData);
  
        // Fetch organization data to resolve the event head name
        const organizationDoc = doc(firestore, `organizations/${organizationName}`);
        const organizationSnapshot = await getDoc(organizationDoc);
        const committees = organizationSnapshot.data()?.committees || [];
        const officers = organizationSnapshot.data()?.officers || [];
        const president = organizationSnapshot.data()?.president || {};
  
        // Find event head from committees, officers, or president
        const eventHeadID = eventData.eventHead;
        let resolvedEventHead = "N/A";
  
        // Check committees for the event head
        committees.forEach((committee: any) => {
          if (committee.head?.id === eventHeadID) {
            resolvedEventHead = committee.head?.name;
          }
        });
  
        // Check officers for the event head
        if (resolvedEventHead === "N/A") {
          officers.forEach((officer: any) => {
            if (officer.id === eventHeadID) {
              resolvedEventHead = officer.name;
            }
          });
        }
  
        // Check president for the event head
        if (resolvedEventHead === "N/A" && president.id === eventHeadID) {
          resolvedEventHead = president.name;
        }
  
        setEventHead(resolvedEventHead);
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchEventDetails();
  }, [organizationName, eventId]);
  

  if (loading) return <div>Loading...</div>;

  return (
    <div className="organization-announcements-page">
    <Header />
    <div className="organization-announcements-container">
      <div className="sidebar-section">
        <StudentPresidentSidebar />
      </div>

      <div className="organization-announcements-content">
     <div className="header-container">
       <h1 className="headtitle">Event Report</h1>
     
    
         </div>
    <div>

      {eventDetails && (
        <div id="event-details">
          <h2>Event Details</h2>
          <p>
            <strong>Title:</strong> {eventDetails.title}
          </p>
          <p>
            <strong>Description:</strong> {eventDetails.description}
          </p>
          <p>
            <strong>Venue:</strong> {eventDetails.venue}
          </p>
          <p>
            <strong>Event Head:</strong> {eventHead}
          </p>
          <p>
            <strong>Dates:</strong>
            <ul>
              {eventDetails.eventDates.map((date: any, index: number) => (
                <li key={index}>
                  {new Date(date.startDate).toLocaleString()} -{" "}
                  {new Date(date.endDate).toLocaleString()}
                </li>
              ))}
            </ul>
          </p>
        </div>
      )}

      <div id="attendee-list">
        <h3>Attendees By Day</h3>
        {Object.keys(attendeesByDay).map((day, index) => (
          <div key={day}>
            <h4>Day {index + 1}</h4>
            <ul>
              {attendeesByDay[day].map((attendee: any, idx: number) => (
                <li key={idx}>
                  {attendee.fullName} - {attendee.section}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div id="attendance">
        <h3>Attendance By Day</h3>
        {Object.keys(attendanceByDay).map((day, index) => (
          <div key={day}>
            <h4>Day {index + 1}</h4>
            <ul>
              {attendanceByDay[day].map((record: any, idx: number) => (
                <li key={idx}>
                  {record.name} - {record.role} - {record.status}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>   </div>   </div>   </div>
  );
};

export default EventReport;
