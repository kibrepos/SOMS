import React, { useEffect, useState, useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import {  collection, query, where, getDocs, doc, getDoc, onSnapshot, addDoc, updateDoc, setDoc,deleteDoc} from "firebase/firestore";
import * as XLSX from "xlsx";
import { firestore, auth } from "../../services/firebaseConfig";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import "../../styles/EventView.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck,faClock, faTimes  } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import { showToast } from '../../components/toast';



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
  startDate: string;
  endDate: string;
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
  timestamp: string | Date;
}

interface Attendance {
  dayIndex: number;
  attendees: { userId: string; status: string }[]; // Update here
  id?: string; // Firestore document ID
}
interface Response {
  dayIndex: number;
  status: string;
}

interface RSVP {
  id: string; // Add this line to include the Firestore document ID
  userId: string;
  responses: Response[];
}


const ArchivedEventView: React.FC = () => {
  const { organizationName, eventName } = useParams<{
    organizationName: string;
    eventName: string;
  }>();
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [editable, setEditable] = useState<boolean>(true);
  const [dickeditable, dickEditable] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [modalDayIndex, setModalDayIndex] = useState<number | null>(null);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [responses, setResponses] = useState<{ dayIndex: number; status: string }[]>([]);
  const [showRSVPResponsesModal, setShowRSVPResponsesModal] = useState(false); 
  const [attendanceSaved, setAttendanceSaved] = useState<boolean>(false);
const [attendanceOverview, setAttendanceOverview] = useState<Attendance[]>([]);
const [attendees, setAttendees] = useState<{ fullName: string; section: string }[]>([]);
const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
const [showAttendeesModal, setShowAttendeesModal] = useState(false);
const [qrLink, setQrLink] = useState<string>(""); // Current QR code link
const [newQrLink, setNewQrLink] = useState<string>(""); // Input for new link




  useEffect(() => {
  if (!organizationName || !eventId) return;

  const fetchAllAttendanceData = async () => {
    try {
      const attendanceRef = collection(
        firestore,
        "events",
        organizationName,
        "archivedEvents",
        eventId,
        "attendance"
      );

      const querySnapshot = await getDocs(attendanceRef);

      const fetchedAttendance: Attendance[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Attendance[];

      setAttendanceOverview(fetchedAttendance);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  fetchAllAttendanceData();
}, [organizationName, eventId]);
useEffect(() => {
  const fetchQrLink = async () => {
    if (!organizationName || !eventName) {
      console.error("Missing organizationName or eventName.");
      showToast("Invalid organization or event. Please try again.", "error");
      return;
    }

    try {
      console.log("Fetching QR link for:", { organizationName, eventName });

      // Use Firestore collection reference to find the event document by name
      const eventsRef = collection(
        firestore,
        "events",
        decodeURIComponent(organizationName),
        "archivedEvents"
      );

      // Query by title to find the event
      const querySnapshot = await getDocs(
        query(eventsRef, where("title", "==", decodeURIComponent(eventName)))
      );

      if (!querySnapshot.empty) {
        const eventDoc = querySnapshot.docs[0]; // Retrieve the first matching document
        const data = eventDoc.data();

        console.log("Event data fetched successfully:", data);

        setQrLink(data?.qrLink || ""); // Update the QR link
        setEventId(eventDoc.id); // Save event ID for later use
      } else {
        console.error("Event document not found for the given name.");
        showToast("Event not found. Please check the event name.", "error");
        setQrLink(""); // Reset the QR link
      }
    } catch (error) {
      console.error("Error fetching QR link:", error);
      showToast("Failed to load event details. Please try again later.", "error");
      setQrLink(""); // Reset the QR link
    }
  };

  fetchQrLink();
}, [organizationName, eventName]);



  useEffect(() => {
    if (!organizationName || !eventId) return;
  
    const attendanceRef = collection(
      firestore,
      "events",
      organizationName,
      "archivedEvents",
      eventId,
      "attendance"
    );
  
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const fetchedAttendance: Attendance[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Attendance[];
  
      setAttendance(fetchedAttendance);
    });
  
    return () => unsubscribe();
  }, [organizationName, eventId]);
 



const handleCloseAttendeesModal = () => {
  setShowAttendeesModal(false);
  setSelectedDayIndex(null);
};

const renderAttendeesModal = () => {
  return (
    <div className="rsvp-responses-modal-overlay">
      <div className="rsvp-responses-modal-content">
        <h3>Attendees for Day {selectedDayIndex! + 1}</h3>
        {attendees.length > 0 ? (
          <table className="rsvp-responses-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Section</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{attendee.fullName}</td>
                  <td>{attendee.section}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data found for this day.</p>
        )}
        <div className="rsvp-responses-modal-actions">
          <button onClick={handleCloseAttendeesModal}>Close</button>
        </div>
      </div>
    </div>
  );
};


const handleViewAttendees = async (dayIndex: number) => {
  if (!organizationName || !eventId) return;

  const attendeesRef = doc(
    firestore,
    "events",
    decodeURIComponent(organizationName),
    "archivedEvents",
    decodeURIComponent(eventId),
    "attendees",
    `day-${dayIndex}`
  );

  const attendeesDoc = await getDoc(attendeesRef);

  if (attendeesDoc.exists()) {
    setAttendees(attendeesDoc.data()?.attendees || []);
    setSelectedDayIndex(dayIndex);
  } else {
    setAttendees([]);
    
  }
};


  
  
  useEffect(() => {
    if (!organizationName || !eventId) return;
  
    const rsvpsRef = collection(
      firestore,
      "events",
      organizationName,
      "archivedEvents",
      eventId,
      "rsvps"
    );
  
    const unsubscribe = onSnapshot(rsvpsRef, (snapshot) => {
      const fetchedRSVPs: RSVP[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || "", // Ensure a fallback if the field is missing
          responses: data.responses || [], // Ensure a fallback for responses
        };
      });
      setRsvps(fetchedRSVPs); // Update state with properly typed RSVP objects
    });
  
    return () => unsubscribe();
  }, [organizationName, eventId]);
  
  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        if (!organizationName || !eventName) {
          console.error("Missing organizationName or eventName");
          setLoading(false);
          return;
        }
  
        const eventsRef = collection(
          firestore,
          "events",
          decodeURIComponent(organizationName),
          "archivedEvents"
        );
  
        const q = query(
          eventsRef,
          where("title", "==", decodeURIComponent(eventName))
        );
  
        const querySnapshot = await getDocs(q);
  
        if (!querySnapshot.empty) {
          const eventDoc = querySnapshot.docs[0];
          const eventData = eventDoc.data() as Event;
  
          setEventDetails(eventData); // No filtering, just display the event
          setEventId(eventDoc.id);
        } else {
          console.error("Archived event not found with title:", eventName);
        }
      } catch (error) {
        console.error("Error fetching archived event details:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchEventDetails();
  }, [organizationName, eventName]);
  

  useEffect(() => {
    if (attendance.length > 0) {
      setAttendanceSaved(true);
    }
  }, [attendance]);
  

  useEffect(() => {
    if (eventDetails) {
      const currentDate = new Date();
      const eventStartDates = eventDetails.eventDates.map(
        (d) => new Date(d.startDate)
      );
      setEditable(eventStartDates.some((d) => currentDate < d));
      dickEditable(eventStartDates.some((d) => currentDate < d));
    }
  }, [eventDetails]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [newMessage]);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (user && organizationName) {
          const orgDocRef = doc(
            firestore,
            "organizations",
            decodeURIComponent(organizationName)
          );
          const orgDoc = await getDoc(orgDocRef);

          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            
            setOrganizationData(orgData);

            if (orgData.president?.id === user.uid) {
              setUserRole("president");
            } else if (
              orgData.officers?.some((officer: any) => officer.id === user.uid)
            ) {
              setUserRole("officer");
            } else if (
              orgData.members?.some((member: any) => member.id === user.uid)
            ) {
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
      `events/${organizationName}/archivedEvents/${eventId}/forum`
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

    return () => unsubscribe();
  }, [organizationName, eventId]);

  const handleOpenAttendanceModal = async (dayIndex: number) => {
    try {
      if (!organizationName || !eventId || !organizationData) {
        console.error("Missing organization data, organizationName, or eventId.");
        return;
      }
  
      const attendanceDocRef = doc(
        firestore,
        "events",
        decodeURIComponent(organizationName),
        "archivedEvents",
        decodeURIComponent(eventId),
        "attendance",
        `day-${dayIndex}`
      );
  
      const attendanceDoc = await getDoc(attendanceDocRef);
  
      let dayAttendance;
      if (attendanceDoc.exists()) {
        dayAttendance = attendanceDoc.data();
      } else {
        // Initialize attendance data with empty attendees if no data exists
        dayAttendance = {
          dayIndex,
          attendees: [
            {
              userId: organizationData.president.id,
              name: organizationData.president.name,
              role: "President",
              profilePicUrl: organizationData.president.profilePicUrl || "",
              status: "No response",
            },
            ...organizationData.officers.map((officer: any) => ({
              userId: officer.id,
              name: officer.name,
              role: "Officer",
              profilePicUrl: officer.profilePicUrl || "",
              status: "No response",
            })),
            ...organizationData.members.map((member: any) => ({
              userId: member.id,
              name: member.name,
              role: "Member",
              profilePicUrl: member.profilePicUrl || "",
              status: "No response",
            })),
          ],
        };
      }
  
      setModalDayIndex(dayIndex);
      setShowAttendanceModal(true);
  
      setAttendance((prev) =>
        prev.map((a) =>
          a.dayIndex === dayIndex
            ? { ...a, attendees: dayAttendance.attendees }
            : a
        )
      );
    } catch (error) {
      console.error("Error opening attendance modal:", error);
    }
  };
  
  
  
  const AttendanceModal: React.FC<{
    attendees: { id: string; name: string; role: string; status?: string; profilePicUrl?: string }[];
    dayIndex: number;
    onClose: () => void;
  }> = ({ attendees, dayIndex, onClose }) => {
    return (
      <div className="attendance-modal-overlay">
        <div className="attendance-modal-content">
          <h3>Attendance for Day {dayIndex + 1}</h3>
          {attendees.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((attendee) => (
                  <tr key={attendee.id}>
                    <td>
                      <img
                        src={attendee.profilePicUrl || "https://via.placeholder.com/50"}
                        alt={attendee.name}
                        className="profile-pickoa"
                      />
                    </td>
                    <td>{attendee.name}</td>
                    <td>{attendee.role}</td>
                    <td>
                      <div className="status-buttons">
                        {attendee.status === "Present" && (
                          <button className="status-button present active" disabled>
                            <FontAwesomeIcon icon={faCheck} className="custom-icon" />
                          </button>
                        )}
                        {attendee.status === "Late" && (
                          <button className="status-button late active" disabled>
                            <FontAwesomeIcon icon={faClock} className="custom-icon" />
                          </button>
                        )}
                        {attendee.status === "Absent" && (
                          <button className="status-button absent active" disabled>
                            <FontAwesomeIcon icon={faTimes} className="custom-icon" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data-message">
              <p>No data available for this day.</p>
            </div>
          )}
          <div className="modal-actionszxc">
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
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


  const formatEventDates = (dates: EventDate[]): JSX.Element => {
    if (dates.length === 1) {
      const startDate = new Date(dates[0].startDate);
      const endDate = new Date(dates[0].endDate);
  
      if (startDate.toDateString() === endDate.toDateString()) {
        return (
          <div className="single-day-event">
            <span className="date">
              {startDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </span>{" "}
            -{" "}
            <span className="time">
              {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
            </span>{" "}
            to{" "}
            <span className="time">
              {endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
            </span>
          </div>
        );
      } else {
        return (
          <div className="multi-day-event">
            <span className="date">
              {startDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </span>{" "}
            -{" "}
            <span className="time">
              {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
            </span>{" "}
            to{" "}
            <span className="date">
              {endDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </span>{" "}
            -{" "}
            <span className="time">
              {endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
            </span>
          </div>
        );
      }
    } else {
      return (
        <>
          {dates.map((date, idx) => {
            const startDate = new Date(date.startDate);
            const endDate = new Date(date.endDate);
  
            return (
              <div key={idx} className="multi-day-event">
                <strong className="day-label">Day {idx + 1}:</strong>{" "}
                <span className="date">
                  {startDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </span>{" "}
                -{" "}
                <span className="time">
                  {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
                </span>{" "}
                to{" "}
                <span className="date">
                  {endDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </span>{" "}
                -{" "}
                <span className="time">
                  {endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
                </span>
              </div>
            );
          })}
        </>
      );
    }
  };
  
  if (loading) return <p>Loading event details...</p>;

  if (!eventDetails)
    return <p>Event not found in the database. Please check the event name.</p>;


  //MAIN RETURN CODE RETURNHERE
  return (
    <div className="organization-announcements-page">
      <Header />
      <div className="organization-announcements-container">    
        <div className="sidebar-section">{getSidebarComponent()}</div>

        <div className="organization-announcements-content">


          <div className="header-container">
         <h1 className="headtitle">
  {eventDetails.title} <span className="archived-tag">(Archived)</span>
</h1>

            

        
          </div>

          <div className="event-picture-section">
            <img
              src={eventDetails.imageUrl || "https://via.placeholder.com/800x400"}
              alt="Event"
              className="event-picture"
            />
          </div>
      

      <div className="content-container">
      <div className="left-column">
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
                    organizationData.officers?.find(
                      (officer: Officer) =>
                        officer.id === eventDetails?.eventHead
                    ) ||
                    (organizationData.president?.id ===
                    eventDetails?.eventHead
                      ? organizationData.president
                      : null);

                  if (headManager) {
                    return (
                      <div className="head-event-manager">
                        <img
                          src={
                            headManager.profilePicUrl ||
                            "https://via.placeholder.com/50"
                          }
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


{/* RSVP Responses Modal */}
{showRSVPResponsesModal && (
  <div className="rsvp-responses-modal-overlay">
    <div className="rsvp-responses-modal-content">
      <h3>RSVP Responses</h3>
      <table className="rsvp-responses-table">
        <thead>
          <tr>
            <th>Profile</th>
            <th>Name</th>
       
            {eventDetails?.eventDates.map((date, idx) => (
              <th key={idx}>Day {idx + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...organizationData?.officers, ...organizationData?.members, organizationData?.president]
            .sort((userA, userB) => {
              const rsvpA = rsvps.find((rsvp) => rsvp.userId === userA.id);
              const rsvpB = rsvps.find((rsvp) => rsvp.userId === userB.id);
            
              const getStatusPriority = (status: string): number => {
                switch (status) {
                  case "Attending":
                    return 1; // Highest priority
                  case "Maybe":
                    return 2;
                  case "Not Attending":
                    return 3;
                  default:
                    return 4; // No Response
                }
              };
            
              // Get the highest priority status for each user across all event days
              const priorityA = rsvpA
                ? Math.min(
                    ...rsvpA.responses.map((response) =>
                      getStatusPriority(response.status || "No response")
                    )
                  )
                : 4; // Default to "No Response" priority if no RSVP
            
              const priorityB = rsvpB
                ? Math.min(
                    ...rsvpB.responses.map((response) =>
                      getStatusPriority(response.status || "No response")
                    )
                  )
                : 4; // Default to "No Response" priority if no RSVP
            
              return priorityA - priorityB;
            })
            
            .map((user: any) => {
              const rsvp = rsvps.find((rsvp) => rsvp.userId === user.id);
              return (
                <tr key={user.id}>
                  <td>
                    <img
                      src={user.profilePicUrl || "https://via.placeholder.com/50"}
                      alt={user.name}
                      className="profile-pickoa"
                    />
                  </td>
                  <td>{user.name}</td>
            
                  {eventDetails?.eventDates.map((_, dayIdx) => {
                    const userResponse = rsvp?.responses.find(response => response.dayIndex === dayIdx);
                    const status = userResponse ? userResponse.status : "No response";

                    return <td key={dayIdx}>{status}</td>;
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
      <div className="rsvp-responses-modal-actions">
        <button onClick={() => setShowRSVPResponsesModal(false)}>Close</button>
      </div>
    </div>
  </div>
)}

            </div>
          </div>
       
         
          <div className="event-details-cardz">
  <div className="qr-code-container">
    <div className="qr-code-section">
  <h3>QR Code</h3>
  {qrLink ? (
    <>
      <QRCodeCanvas value={qrLink} size={200} />
    </>
    
  ) : (
    
    <p>No QR code link has been set</p>
  )}
</div>
    <div className="qr-code-rightside">
    <a href={qrLink} target="_blank" rel="noopener noreferrer" className="qr-code-link">
  {qrLink}
</a>

  
      </div>
    </div></div></div>
 




          
          <div className="event-side-cards">
            
          <div className="card-left">
  <h3>Attendance for Organization Members</h3>
  {eventDetails?.eventDates.map((_, dayIndex) => (
    <div key={dayIndex} className="attendance-day">
      <span className="day-label">Day {dayIndex + 1}</span>
      <button
        className="view-button"
        onClick={() => handleOpenAttendanceModal(dayIndex)}
      >
        View
      </button>
    </div>
  ))}
</div>

{/* Attendees Section */}
<div className="card-left">
  <h3>Attendees</h3>
  {eventDetails?.eventDates.map((date, index) => (
  <div key={index} className="attendance-day">
    <span>Day {index + 1}</span>
  
    <button
      className="action-button view-button"
      onClick={() => {
        handleViewAttendees(index);
        setShowAttendeesModal(true);
      }}
    >
      View
    </button>
  </div>
))}


 
</div>

  {showAttendeesModal && renderAttendeesModal()}




  {showAttendanceModal && modalDayIndex !== null && (


    <AttendanceModal
    attendees={organizationData
      ? [
          {
            id: organizationData.president.id,
            name: organizationData.president.name,
            role: "President",
            profilePicUrl: organizationData.president.profilePicUrl || "https://via.placeholder.com/50",
            status: attendance
              .find((a) => a.dayIndex === modalDayIndex)
              ?.attendees.find(
                (attendee) => attendee.userId === organizationData.president.id
              )?.status || "No response",
          },
          ...organizationData.officers.map((officer: any) => ({
            id: officer.id,
            name: officer.name,
            role: "Officer",
            profilePicUrl: officer.profilePicUrl || "https://via.placeholder.com/50",
            status: attendance
              .find((a) => a.dayIndex === modalDayIndex)
              ?.attendees.find((attendee) => attendee.userId === officer.id)
              ?.status || "No response",
          })),
          ...organizationData.members.map((member: any) => ({
            id: member.id,
            name: member.name,
            role: "Member",
            profilePicUrl: member.profilePicUrl || "https://via.placeholder.com/50",
            status: attendance
              .find((a) => a.dayIndex === modalDayIndex)
              ?.attendees.find((attendee) => attendee.userId === member.id)
              ?.status || "No response",
          })),
        ]
      : []}
    dayIndex={modalDayIndex!}
    onClose={() => setShowAttendanceModal(false)}

  />
  


)}

{userRole !== "member" && ( 
  <div className="card-left">
    <button
      onClick={() => setShowRSVPResponsesModal(true)}
      className="view-rsvp-responses-button"
    >
      View RSVP Responses
    </button>
  </div>
)}

</div>
</div>
        
          <div className="event-forum">
            <h3>Event Forum</h3>
            
            <div className="forum-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`forum-message ${
                    message.userId === currentUser?.uid
                      ? "message-right"
                      : "message-left"
                  }`}
                >
                  <img
                    src={
                      message.userProfilePic ||
                      "https://via.placeholder.com/50"
                    }
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
              <div ref={messagesEndRef}></div>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivedEventView;
