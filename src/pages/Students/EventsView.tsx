import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs,doc,getDoc } from "firebase/firestore";
import { firestore, auth } from "../../services/firebaseConfig";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import "../../styles/EventView.css";

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
  interface Officer {
    id: string;
    name: string;
    profilePicUrl: string;
    email?: string;
    role?: string;
  }
  

const EventsView: React.FC = () => {
  const { organizationName, eventName } = useParams<{ organizationName: string; eventName: string }>();
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);


  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        if (!organizationName || !eventName) {
          console.error("Missing organizationName or eventName");
          setLoading(false);
          return;
        }
  
        console.log("Fetching event details for:", organizationName, eventName);
  
        // Query the events subcollection for the document with the matching title
        const eventsRef = collection(firestore, "events", decodeURIComponent(organizationName), "event");
        const q = query(eventsRef, where("title", "==", decodeURIComponent(eventName)));
  
        const querySnapshot = await getDocs(q);
  
        if (!querySnapshot.empty) {
          const eventDoc = querySnapshot.docs[0]; // Assuming titles are unique
          setEventDetails(eventDoc.data() as Event);
          console.log("Event found:", eventDoc.data());
        } else {
          console.error("Event not found with title:", eventName);
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchEventDetails();
  }, [organizationName, eventName]);

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
  
  
  
  if (loading) return <p>Loading event details...</p>;
  
  if (!eventDetails) return <p>Event not found in the database. Please check the event name.</p>;
  
  return (
    <div className="event-view-wrapper">
      <Header />
      <div className="dashboard-container">
        <div className="sidebar-section">
        {getSidebarComponent()}     
        </div>
        <div className="main-content">
        <div className="header-container">
          <h1 className="headtitle">
            {eventDetails.title}
          </h1>
          <button className="create-new-btn" >
             Edit
            </button>
       </div>
          {/* Event Picture */}
          <div className="event-picture-section">
            <img
              src={eventDetails.imageUrl || "https://via.placeholder.com/800x400"}
              alt="Event"
              className="event-picture"
            />
          </div>
          {/* Event Details */}
          <div className="event-details-card">
            <div className="event-details-left">
              <h3>Event Name</h3>
              <p>{eventDetails.title}</p>

              <h3>Description</h3>
              <p>{eventDetails.description}</p>

              <h3>Venue</h3>
              <p>{eventDetails.venue}</p>
            </div>
            <div className="event-details-right">
              <h3>Dates:</h3>
              <p>{formatEventDates(eventDetails.eventDates)}</p>

              <h3>Head Event Manager</h3>
{organizationData ? (
  (() => {
    const headManager =
      organizationData.officers?.find((officer: Officer) => officer.id === eventDetails.eventHead) ||
      (organizationData.president?.id === eventDetails.eventHead ? organizationData.president : null);

    if (headManager) {
      return (
        <div className="head-event-manager">
          <img
            src={headManager.profilePicUrl || "https://via.placeholder.com/50"}
            alt={headManager.name}
            className="profile-pics"
          />
          <p>{headManager.name}</p>
        </div>
      );
    }

    return <p>Head Event Manager not found.</p>;
  })()
) : (
  <p>Loading Head Event Manager...</p>
)}


            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsView;