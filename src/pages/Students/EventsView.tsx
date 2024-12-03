import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs,doc,getDoc,onSnapshot,addDoc,updateDoc  } from "firebase/firestore";
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
  interface Message {
    id: string;
    text: string;
    userId: string;
    userName: string;
    userProfilePic: string;
    timestamp: string | Date; // Adjust type based on your timestamp
  }
  interface Attendance {
    dayIndex: number;
    attendees: string[];
    id?: string; // Assuming each attendance record has a Firestore document ID
  }
  

const EventsView: React.FC = () => {
  const { organizationName, eventName } = useParams<{ organizationName: string; eventName: string }>();
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
const [newMessage, setNewMessage] = useState("");
const [currentUser, setCurrentUser] = useState(auth.currentUser);
const [rsvps, setRsvps] = useState<any[]>([]);
const [attendance, setAttendance] = useState<Attendance[]>([]);
const [editable, setEditable] = useState<boolean>(true);
const userRSVP = rsvps.find((rsvp) => rsvp.userId === currentUser?.uid) || null;
const getDayAttendance = (index: number) => 
  attendance.find((a) => a.dayIndex === index) || null;

const [showAttendanceModal, setShowAttendanceModal] = useState(false);
const [modalDayIndex, setModalDayIndex] = useState<number | null>(null);


const getUserDetailsFromOrg = (userId: string, organizationData: any) => {
  // Check in president
  if (organizationData.president?.id === userId) {
    return organizationData.president;
  }

  // Check in officers
  const officer = organizationData.officers?.find((officer: any) => officer.id === userId);
  if (officer) return officer;

  // Check in members
  const member = organizationData.members?.find((member: any) => member.id === userId);
  if (member) return member;

  return null;
};

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
          setEventId(eventDoc.id); 
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
    if (eventDetails) {
      const currentDate = new Date();
      const eventStartDates = eventDetails.eventDates.map((d) => new Date(d.startDate));
      setEditable(eventStartDates.some((d) => currentDate < d));
    }
  }, [eventDetails]);
  
  


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

  useEffect(() => {
    if (!organizationName || !eventId) return;
  
    const messagesRef = collection(
      firestore,
      `events/${organizationName}/event/${eventId}/forum`
    );
  
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          userId: data.userId,
          userName: data.userName,
          userProfilePic: data.userProfilePic,
          timestamp: data.timestamp,
        };
      });
      setMessages(
        fetchedMessages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      );
    });
  
    return () => unsubscribe(); // Cleanup on component unmount
  }, [organizationName, eventId]);
  
  const AttendanceModal: React.FC<{ 
    attendees: { id: string; name: string; role: string }[]; 
    dayIndex: number; 
    onClose: () => void; 
    onSave: (updatedAttendance: { userId: string; status: string }[]) => void; 
  }> = ({ attendees, dayIndex, onClose, onSave }) => {
    const [attendanceData, setAttendanceData] = useState(
      attendees.map((attendee) => ({
        userId: attendee.id,
        name: attendee.name,
        role: attendee.role,
        status: "Present", // Default status
      }))
    );
  
    const handleStatusChange = (userId: string, status: string) => {
      setAttendanceData((prev) =>
        prev.map((data) =>
          data.userId === userId ? { ...data, status } : data
        )
      );
    };
  
    const handleSave = () => {
      onSave(attendanceData);
    };
  
    return (
      <div className="attendance-modal-overlay">
        <div className="attendance-modal-content">
          <h3>Manage Attendance for Day {dayIndex + 1}</h3>
          <table className="attendance-modal-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((attendee) => (
                <tr key={attendee.userId}>
                  <td>{attendee.name}</td>
                  <td>{attendee.role}</td>
                  <td>
                    <select
                      value={attendee.status}
                      onChange={(e) =>
                        handleStatusChange(attendee.userId, e.target.value)
                      }
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="attendance-modal-actions">
            <button onClick={onClose}>Cancel</button>
            <button onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    );
  };
  
  const handleOpenAttendanceModal = (dayIndex: number) => {
  setModalDayIndex(dayIndex);
  setShowAttendanceModal(true);
};

const handleSaveAttendance = async (
  updatedAttendance: { userId: string; status: string }[]
) => {
  if (!organizationName || !eventId || modalDayIndex === null) return;

  const attendanceRef = collection(
    firestore,
    "events",
    organizationName,
    "event",
    eventId,
    "attendance"
  );

  const existingDayAttendance = attendance.find(
    (a) => a.dayIndex === modalDayIndex
  );

  try {
    if (existingDayAttendance) {
      const attendanceDocRef = doc(attendanceRef, existingDayAttendance.id);
      await updateDoc(attendanceDocRef, {
        attendees: updatedAttendance,
      });
    } else {
      await addDoc(attendanceRef, {
        dayIndex: modalDayIndex,
        attendees: updatedAttendance,
      });
    }
    console.log("Attendance saved successfully");
  } catch (error) {
    console.error("Error saving attendance:", error);
  }
};

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!newMessage.trim() || !currentUser || !organizationName || !eventId || !organizationData) return;
  
    try {
      // Get user details from organization data
      const userDetails = getUserDetailsFromOrg(currentUser.uid, organizationData);
  
      if (!userDetails) {
        console.error("User details not found in the organization.");
        return;
      }
  
      // Save the message to Firestore
      const messagesRef = collection(
        firestore,
        `events/${organizationName}/event/${eventId}/forum`
      );
  
      const newMessageData = {
        text: newMessage,
        userId: currentUser.uid,
        userName: userDetails.name,
        userProfilePic: userDetails.profilePicUrl || "",
        timestamp: new Date().toISOString(),
      };
  
      await addDoc(messagesRef, newMessageData);
      setNewMessage(""); // Clear the input field
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
    // Fetch RSVP and Attendance
    useEffect(() => {
      if (!organizationName || !eventName) {
        setRsvps([]);
        setAttendance([]);
        return;
      }
    
      const rsvpRef = collection(firestore, "events", organizationName, "event", eventName, "rsvps");
      const attendanceRef = collection(firestore, "events", organizationName, "event", eventName, "attendance");
    
      const unsubscribeRSVP = onSnapshot(rsvpRef, (snapshot) => {
        setRsvps(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    
      const unsubscribeAttendance = onSnapshot(attendanceRef, (snapshot) => {
        const fetchedAttendance = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            dayIndex: data.dayIndex || 0, // Provide a default value or ensure dayIndex exists
            attendees: data.attendees || [], // Default to an empty array if attendees is undefined
          } as Attendance;
        });
        setAttendance(fetchedAttendance);
      });
      
    
      return () => {
        unsubscribeRSVP();
        unsubscribeAttendance();
      };
    }, [organizationName, eventName]);
  
    // Handle RSVP
    const handleRSVP = async (responses: { dayIndex: number; status: string }[]) => {
      if (!editable || !currentUser) {
        console.error("RSVP not editable or user not authenticated");
        return;
      }
    
      if (!organizationName || !eventId) {
        console.error("Organization name or event ID is undefined");
        return;
      }
    
      try {
        const rsvpRef = collection(firestore, "events", organizationName, "event", eventId, "rsvps");
    
        // Get user details from organization data
        const userDetails = getUserDetailsFromOrg(currentUser.uid, organizationData);
    
        if (!userDetails) {
          console.error("User details not found in the organization");
          return;
        }
    
        const userRSVP = rsvps.find((rsvp) => rsvp.userId === currentUser.uid);
        if (userRSVP) {
          // Update existing RSVP
          const rsvpDocRef = doc(rsvpRef, userRSVP.id);
          await updateDoc(rsvpDocRef, { responses });
          console.log("RSVP updated successfully");
        } else {
          // Add new RSVP
          await addDoc(rsvpRef, {
            userId: currentUser.uid,
            name: userDetails.name || "Unknown User",
            responses,
          });
          console.log("RSVP added successfully");
        }
      } catch (error) {
        console.error("Error saving RSVP:", error);
      }
    };
    

    const handleAttendance = async (dayIndex: number, userId: string) => {
      if (!currentUser || (userRole !== "officer" && userRole !== "president")) {
        console.error("User not authorized to handle attendance");
        return;
      }
    
      if (!organizationName || !eventId) {
        console.error("Organization name or event ID is undefined");
        return;
      }
    
      try {
        const attendanceRef = collection(firestore, "events", organizationName, "event", eventId, "attendance");
    
        const dayAttendance = attendance.find((a) => a.dayIndex === dayIndex) || null;
    
        if (dayAttendance) {
          const attendanceDocRef = doc(attendanceRef, dayAttendance.id);
          if (!dayAttendance.attendees.includes(userId)) {
            await updateDoc(attendanceDocRef, {
              attendees: [...dayAttendance.attendees, userId],
            });
            console.log("Attendance updated successfully");
          } else {
            console.log("User already marked present");
          }
        } else {
          await addDoc(attendanceRef, {
            dayIndex,
            attendees: [userId],
          });
          console.log("Attendance added successfully");
        }
      } catch (error) {
        console.error("Error handling attendance:", error);
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
         <button
  className="create-new-btn"
 
>
  Edit
</button>


       </div>
        {/* RSVP Section */}
        <h3>RSVP</h3>
              {eventDetails?.eventDates.map((date, idx) => (
                <div key={idx}>
                  <p>Day {idx + 1}: {new Date(date.startDate).toDateString()}</p>
                  {editable ? (
                    <select onChange={(e) => handleRSVP([{ dayIndex: idx, status: e.target.value }])}>
                      <option value="Attending">Attending</option>
                      <option value="Maybe">Maybe</option>
                      <option value="Not Attending">Not Attending</option>
                    </select>
                  ) : (
                    <p>RSVP is closed.</p>
                  )}
                </div>
              ))}

              {/* Attendance Section */}
              <h3>Attendance</h3>
{eventDetails?.eventDates.map((date, idx) => (
  <div key={idx}>
    <p>Day {idx + 1}: {new Date(date.startDate).toDateString()}</p>
    {new Date() > new Date(date.endDate) ? (
      <button onClick={() => handleOpenAttendanceModal(idx)}>
        Manage Attendance
      </button>
    ) : (
      <p>Attendance available after this day ends.</p>
    )}
  </div>
))}

{showAttendanceModal && modalDayIndex !== null && (
  <AttendanceModal
    attendees={[
      {
        id: organizationData?.president?.id || "",
        name: organizationData?.president?.name || "President",
        role: "President",
      },
      ...(organizationData?.officers || []).map((officer: any) => ({
        id: officer.id,
        name: officer.name,
        role: "Officer",
      })),
      ...(organizationData?.members || []).map((member: any) => ({
        id: member.id,
        name: member.name,
        role: "Member",
      })),
    ]}
    dayIndex={modalDayIndex}
    onClose={() => setShowAttendanceModal(false)}
    onSave={handleSaveAttendance}
  />
)}



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
 {/* Event Forum Section */}
<div className="event-forum">
  <h3>Event Forum</h3>
  <div className="forum-messages">
    {messages.map((message) => (
      <div
        key={message.id}
        className={`forum-message ${
          message.userId === currentUser?.uid ? "message-right" : "message-left"
        }`}
      >
        <img
          src={message.userProfilePic || "https://via.placeholder.com/50"}
          alt={message.userName}
          className="profile-picko"
        />
        <div className="message-content">
          <p className="message-author">{message.userName}</p>
          <p className="message-text">{message.text}</p>
          <p className="message-time">
            {new Date(message.timestamp).toLocaleString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            })}
          </p>
        </div>
      </div>
    ))}
  </div>
  <form onSubmit={handleSendMessage} className="forum-input">
    <input
      type="text"
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      placeholder="Write a message..."
      required
    />
    <button type="submit">Send</button>
  </form>
</div>


        </div>
      </div>
    </div>
  );
};

export default EventsView;