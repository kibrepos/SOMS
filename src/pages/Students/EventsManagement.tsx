import React, { useState, useEffect } from "react";
import { firestore, auth } from "../../services/firebaseConfig"; // Firebase setup
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { useParams,useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import "../../styles/EventsManagement.css";

interface Event {
  title: string;
  description: string;
  eventDates: { startDate: string; endDate: string }[];
  imageUrl: string;
  eventHead: string;
  venue: string;
  createdAt: any;
}
type EventDate = {
  startDate: string; // ISO string format
  endDate: string; // ISO string format
};

const EventsManagement: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!organizationName) return;
  
      try {
        const eventsRef = collection(firestore, "events", organizationName, "event");
        const querySnapshot = await getDocs(eventsRef);
  
        const upcoming: Event[] = [];
        const ongoing: Event[] = [];
        const completed: Event[] = [];
  
        const currentDate = new Date();
  
        querySnapshot.forEach((doc) => {
          const eventData = doc.data() as Event;
  
          // Check event dates
          const isCompleted = eventData.eventDates.every(
            (date) => new Date(date.endDate) < currentDate
          );
          const isUpcoming = eventData.eventDates.every(
            (date) => new Date(date.startDate) > currentDate
          );
          const isOngoing = eventData.eventDates.some(
            (date) =>
              new Date(date.startDate) <= currentDate &&
              new Date(date.endDate) >= currentDate
          );
  
          if (isCompleted) {
            completed.push(eventData);
          } else if (isUpcoming) {
            upcoming.push(eventData);
          } else if (isOngoing) {
            ongoing.push(eventData);
          }
        });
  
        setUpcomingEvents(upcoming);
        setOngoingEvents(ongoing);
        setCompletedEvents(completed);
  
        console.log("Ongoing Events:", ongoing); // Add logging to check
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
  
    fetchEvents();
  
    const interval = setInterval(fetchEvents, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [organizationName]);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (user && organizationName) {
          const orgDocRef = doc(firestore, "organizations", decodeURIComponent(organizationName));
          const orgDoc = await getDoc(orgDocRef);

          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            setOrganizationData(orgData);

            if (orgData.president?.id === user.uid) {
              setUserRole("president");
            } else if (orgData.officers?.some((officer: any) => officer.id === user.uid)) {
              setUserRole("officer");
            } else if (orgData.members?.some((member: any) => member.id === user.uid)) {
              setUserRole("member");
            } else {
              setUserRole(null);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) fetchUserRole();
    });
  }, [organizationName]);

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
 const formatEventDates = (dates: EventDate[]): JSX.Element => {
    if (dates.length === 1) {
      // Single date range: no "Day 1"
      const startDate = new Date(dates[0].startDate);
      const endDate = new Date(dates[0].endDate);
  
      if (startDate.toDateString() === endDate.toDateString()) {
        // Same-day event
        return (
          <div>
            {startDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            - {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })} to{" "}
            {endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
          </div>
        );
      } else {
        // Event spans multiple days
        return (
          <div>
            {startDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            - {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })} to{" "}
            {endDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            - {endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
          </div>
        );
      }
    } else {
      // Multiple date ranges: include "Day X" with bold styling
      return (
        <>
          {dates.map((date: EventDate, idx: number) => {
            const startDate = new Date(date.startDate);
            const endDate = new Date(date.endDate);
  
            if (startDate.toDateString() === endDate.toDateString()) {
              // Same-day event
              return (
                <div key={idx}>
                  <strong>Day {idx + 1}:</strong>{" "}
                  {startDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  - {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}{" "}
                  to {endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
                </div>
              );
            } else {
              // Event spans multiple days
              return (
                <div key={idx}>
                  <strong>Day {idx + 1}:</strong>{" "}
                  {startDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  - {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}{" "}
                  to {endDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  - {endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
                </div>
              );
            }
          })}
        </>
      );
    }
  };
  



  return (
    <div className="organization-dashboard-wrapper">
      <Header />
      <div className="dashboard-container">
        <div className="sidebar-section">{getSidebarComponent()}</div>
        <div className="main-content">
        <div className="header-container">
          <h1 className="headtitle">
            Events
          </h1>
          {(userRole === "president" || userRole === "officer") && (
              <button
                className="create-new-btn"
                onClick={() =>
                  navigate(`/organization/${organizationName}/create-event`)
                }
              >
                + Create Event
              </button>
            )}
       </div>
       <div className="event-section">
  <h3>Upcoming Events</h3>
  {upcomingEvents.length === 0 ? (
    <p>No upcoming events.</p>
  ) : (
    <ul className="event-list">
      {upcomingEvents.map((event, index) => (
        <li
          key={index}
          className="event-item"
          onClick={() =>
            navigate(`/organization/${organizationName}/events/${encodeURIComponent(event.title)}`)
          }
          style={{ cursor: "pointer" }} // Visual indicator for clickable items
        >
          <img src={event.imageUrl} alt={event.title} className="event-image" />
          <h4>{event.title}</h4>
          <p>{event.description}</p>
          <p><strong>Venue:</strong> {event.venue}</p>
          <p><strong>Date:</strong> {formatEventDates(event.eventDates)}</p>
        </li>
      ))}
    </ul>
  )}
</div>

<div className="event-section">
  <h3>Ongoing Events</h3>
  {ongoingEvents.length === 0 ? (
    <p>No ongoing events.</p>
  ) : (
    <ul className="event-list">
      {ongoingEvents.map((event, index) => (
        <li
          key={index}
          className="event-item"
          onClick={() =>
            navigate(`/organization/${organizationName}/events/${encodeURIComponent(event.title)}`)
          }
          style={{ cursor: "pointer" }}
        >
          <img src={event.imageUrl} alt={event.title} className="event-image" />
          <h4>{event.title}</h4>
          <p>{event.description}</p>
          <p><strong>Venue:</strong> {event.venue}</p>
          <p><strong>Date:</strong> {formatEventDates(event.eventDates)}</p>
        </li>
      ))}
    </ul>
  )}
</div>

<div className="event-section">
  <h3>Completed Events</h3>
  {completedEvents.length === 0 ? (
    <p>No completed events.</p>
  ) : (
    <ul className="event-list">
      {completedEvents.map((event, index) => (
        <li
          key={index}
          className="event-item"
          onClick={() =>
            navigate(`/organization/${organizationName}/events/${encodeURIComponent(event.title)}`)
          }
          style={{ cursor: "pointer" }}
        >
          <img src={event.imageUrl} alt={event.title} className="event-image" />
          <h4>{event.title}</h4>
          <p>{event.description}</p>
          <p><strong>Venue:</strong> {event.venue}</p>
          <p><strong>Date:</strong> {formatEventDates(event.eventDates)}</p>
        </li>
      ))}
    </ul>
  )}
</div>

        </div>
      </div>
    </div>
  );
};

export default EventsManagement;


       