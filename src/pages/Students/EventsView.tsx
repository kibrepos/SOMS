import React, { useEffect, useState, useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import {  collection, query, where, getDocs, doc, getDoc, onSnapshot, addDoc, updateDoc, setDoc} from "firebase/firestore";
import { firestore, auth } from "../../services/firebaseConfig";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import "../../styles/EventView.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck,faClock, faTimes  } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation




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


const EventsView: React.FC = () => {
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
  const [showRSVPResponsesModal, setShowRSVPResponsesModal] = useState(false); // Controls visibility of the modal
  const navigate = useNavigate(); // Call useNavigate at the top of the component

  
  const handleBackButtonClick = () => {
    history.back(); // Navigate back to the previous page
  };

// Define handleEditEventButtonClick inside the component so it has access to the navigate function
const handleEditEventButtonClick = (eventId: string, organizationName: string) => {
  navigate(`/Organization/${organizationName}/edit-event/${eventId}`); // Navigate to the event edit page
};

  const handleOpenRSVPModal = () => {
    const userRSVP = rsvps.find((rsvp) => rsvp.userId === currentUser?.uid);
    const initialResponses = eventDetails?.eventDates.map((_, idx) => ({
      dayIndex: idx,
      status: userRSVP?.responses.find((r) => r.dayIndex === idx)?.status || "No response",
    }));
    setResponses(initialResponses || []);
    setShowRSVPModal(true);
  };
  
  const getUserDetailsFromOrg = (userId: string, organizationData: any) => {
    if (organizationData.president?.id === userId) {
      return organizationData.president;
    }

    const officer = organizationData.officers?.find(
      (officer: any) => officer.id === userId
    );
    if (officer) return officer;

    const member = organizationData.members?.find(
      (member: any) => member.id === userId
    );
    if (member) return member;

    return null;
  };

  useEffect(() => {
    if (!organizationName || !eventId) return;
  
    const attendanceRef = collection(
      firestore,
      "events",
      organizationName,
      "event",
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
  
  useEffect(() => {
    if (!organizationName || !eventId) return;
  
    const rsvpsRef = collection(
      firestore,
      "events",
      organizationName,
      "event",
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
          "event"
        );
        const q = query(
          eventsRef,
          where("title", "==", decodeURIComponent(eventName))
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const eventDoc = querySnapshot.docs[0];
          setEventDetails(eventDoc.data() as Event);
          setEventId(eventDoc.id);
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

    return () => unsubscribe();
  }, [organizationName, eventId]);

const AttendanceModal: React.FC<{
  attendees: { id: string; name: string; role: string; status?: string }[];
  dayIndex: number;
  onClose: () => void;
  onSave: (updatedAttendance: { userId: string; status: string }[]) => void;
  editable: boolean;
}> = ({ attendees, dayIndex, onClose, onSave, editable }) => {
  const [attendanceData, setAttendanceData] = useState(attendees);

  const handleStatusChange = (userId: string, status: string) => {
    if (editable) {
      setAttendanceData((prev) =>
        prev.map((data) =>
          data.id === userId ? { ...data, status } : data
        )
      );
    }
  };

  const handleSave = () => {
    if (editable) {
      onSave(
        attendanceData.map((attendee) => ({
          userId: attendee.id,
          status: attendee.status || "Absent", // Default to "Absent" if status is undefined
        }))
      );
    }
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
              <tr key={attendee.id}>
                <td>{attendee.name}</td>
                <td>{attendee.role}</td>
                <td>
                  <div className="status-buttons">
                    <button
                      className={`status-button present ${attendee.status === "Present" ? "active" : ""}`}
                      onClick={() => handleStatusChange(attendee.id, "Present")}
                      disabled={!editable}
                    >
                     <FontAwesomeIcon icon={faCheck} className="custom-icon" 
                     />

                    </button>
                    <button
                      className={`status-button absent ${attendee.status === "Absent" ? "active" : ""}`}
                      onClick={() => handleStatusChange(attendee.id, "Absent")}
                      disabled={!editable}
                    >
                      <FontAwesomeIcon icon={faTimes} className="custom-icon" />
                    </button>
                    <button
                      className={`status-button late ${attendee.status === "Late" ? "active" : ""}`}
                      onClick={() => handleStatusChange(attendee.id, "Late")}
                      disabled={!editable}
                    >
                      <FontAwesomeIcon icon={faClock} className="custom-icon" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="attendance-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={!editable}>
            {editable ? "Save" : "Locked"}
          </button>
        </div>
      </div>
    </div>
  );
};

  const handleOpenAttendanceModal = (dayIndex: number) => {
    const isEditable =
      currentUser?.uid === organizationData?.president?.id ||
      currentUser?.uid ===
        organizationData?.officers?.find(
          (officer: any) => officer.id === eventDetails?.eventHead
        )?.id;
  
    // Find attendance data for the selected day
    const dayAttendance = attendance.find((a) => a.dayIndex === dayIndex);
  
    const attendees = organizationData
      ? [
          {
            id: organizationData.president.id,
            name: organizationData.president.name,
            role: "President",
            status: dayAttendance?.attendees.find(
              (attendee) => attendee.userId === organizationData.president.id
            )?.status || "Absent",
          },
          ...organizationData.officers.map((officer: any) => ({
            id: officer.id,
            name: officer.name,
            role: "Officer",
            status: dayAttendance?.attendees.find(
              (attendee) => attendee.userId === officer.id
            )?.status || "Absent",
          })),
          ...organizationData.members.map((member: any) => ({
            id: member.id,
            name: member.name,
            role: "Member",
            status: dayAttendance?.attendees.find(
              (attendee) => attendee.userId === member.id
            )?.status || "Absent",
          })),
        ]
      : [];
  
    setEditable(isEditable);
    setModalDayIndex(dayIndex);
    setShowAttendanceModal(true);
    setAttendance((prev) =>
      prev.map((a) =>
        a.dayIndex === dayIndex
          ? { ...a, attendees }
          : a
      )
    );
  };
  
  const handleRSVP = async () => {
    if (!editable || !currentUser || !organizationName || !eventId) {
      console.error("RSVP not editable, user not authenticated, or invalid data");
      return;
    }
  
    try {
      const rsvpDocRef = doc(
        firestore,
        "events",
        organizationName,
        "event",
        eventId,
        "rsvps",
        currentUser.uid // Use userId as the document ID
      );
  
      // Save or overwrite the RSVP
      await updateDoc(rsvpDocRef, { responses }).catch(async (err) => {
        if (err.code === "not-found") {
          await setDoc(rsvpDocRef, {
            userId: currentUser.uid,
            responses,
          });
        }
      });
  
      console.log("RSVP saved successfully");
      setShowRSVPModal(false);
    } catch (error) {
      console.error("Error saving RSVP:", error);
    }
  };
  const handleSaveAttendance = async (
    updatedAttendance: { userId: string; status: string }[]
  ) => {
    if (!organizationName || !eventId || modalDayIndex === null) {
      console.error("Missing organizationName, eventId, or modalDayIndex.");
      return;
    }
  
    try {
      const attendanceRef = doc(
        firestore,
        "events",
        organizationName,
        "event",
        eventId,
        "attendance",
        `day-${modalDayIndex}` // Use dayIndex as the document ID
      );
  
      // Update Firestore with the new attendance data
      await setDoc(attendanceRef, {
        dayIndex: modalDayIndex,
        attendees: updatedAttendance.map((user) => ({
          ...user,
          status: user.status || "Absent", // Default to "Absent" if status is undefined
        })),
      });
  
      console.log("Attendance saved successfully for day:", modalDayIndex);
  
      // Fetch updated attendance data
      const updatedAttendanceData = await fetchAttendanceData(modalDayIndex);
  
      // Update local state with new attendance data
      setAttendance((prev) =>
        prev.map((a) =>
          a.dayIndex === modalDayIndex
            ? { ...a, attendees: updatedAttendanceData?.attendees || [] }
            : a
        )
      );
    } catch (error) {
      console.error("Error saving attendance to Firestore:", error);
    }
  };
  
  const fetchAttendanceData = async (dayIndex: number) => {
    if (!organizationName || !eventId) return null;
  
    try {
      const attendanceRef = collection(
        firestore,
        "events",
        organizationName,
        "event",
        eventId,
        "attendance"
      );
      const attendanceQuery = query(
        attendanceRef,
        where("dayIndex", "==", dayIndex)
      );
      const querySnapshot = await getDocs(attendanceQuery);
  
      if (!querySnapshot.empty) {
        const attendanceDoc = querySnapshot.docs[0];
        return { ...attendanceDoc.data(), id: attendanceDoc.id } as Attendance;
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  
    return null;
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

    if (
      !newMessage.trim() ||
      !currentUser ||
      !organizationName ||
      !eventId ||
      !organizationData
    )
      return;

    try {
      const userDetails = getUserDetailsFromOrg(currentUser.uid, organizationData);

      if (!userDetails) {
        console.error("User details not found in the organization.");
        return;
      }

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
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatEventDates = (dates: EventDate[]): JSX.Element => {
    if (dates.length === 1) {
      const startDate = new Date(dates[0].startDate);
      const endDate = new Date(dates[0].endDate);

      if (startDate.toDateString() === endDate.toDateString()) {
        return (
          <div>
            {startDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            - {startDate.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "numeric",
            })}{" "}
            to{" "}
            {endDate.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "numeric",
            })}
          </div>
        );
      } else {
        return (
          <div>
            {startDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            - {startDate.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "numeric",
            })}{" "}
            to{" "}
            {endDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            - {endDate.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "numeric",
            })}
          </div>
        );
      }
    } else {
      return (
        <>
          {dates.map((date, idx) => {
            const startDate = new Date(date.startDate);
            const endDate = new Date(date.endDate);

            if (startDate.toDateString() === endDate.toDateString()) {
              return (
                <div key={idx}>
                  <strong>Day {idx + 1}:</strong>{" "}
                  {startDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  - {startDate.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                  })}{" "}
                  to{" "}
                  {endDate.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </div>
              );
            } else {
              return (
                <div key={idx}>
                  <strong>Day {idx + 1}:</strong>{" "}
                  {startDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  - {startDate.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                  })}{" "}
                  to{" "}
                  {endDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  - {endDate.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </div>
              );
            }
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
    <div className="event-view-wrapper">
      <Header />
      <div className="dashboard-container">
        <div className="sidebar-section">{getSidebarComponent()}</div>
        <div className="main-content">
        <button className="back-button" onClick={handleBackButtonClick}>Return</button>
        <button onClick={() => eventId && organizationName ? handleEditEventButtonClick(eventId, organizationName) : console.error('eventId or organizationName is missing')}>
        Edit Event 
        </button>
          <div className="header-container">
            <h1 className="headtitle">{eventDetails.title}</h1>
          </div>

          <div className="event-picture-section">
            <img
              src={eventDetails.imageUrl || "https://via.placeholder.com/800x400"}
              alt="Event"
              className="event-picture"
            />
          </div>

          <div className="event-details-card">
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
          </div>

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
              editable={editable}
            />
          )}

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
{/* RSVP Responses Modal */}
{/* RSVP Responses Modal */}
{showRSVPResponsesModal && (
  <div className="rsvp-responses-modal-overlay">
    <div className="rsvp-responses-modal-content">
      <h3>RSVP Responses</h3>
      <table className="rsvp-responses-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            {/* Create headers for each event day */}
            {eventDetails?.eventDates.map((date, idx) => (
              <th key={idx}>Day {idx + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Loop through all members, officers, and president */}
          {/* First, categorize users into those who responded and those who did not */}
          {[...organizationData?.officers, ...organizationData?.members, organizationData?.president]
            .sort((userA, userB) => {
              // Get RSVP response for both users
              const rsvpA = rsvps.find((rsvp) => rsvp.userId === userA.id);
              const rsvpB = rsvps.find((rsvp) => rsvp.userId === userB.id);
              
              // Check if user A and user B have given a response
              const statusA = rsvpA ? rsvpA.responses.some((r) => r.status !== "No response yet") : false;
              const statusB = rsvpB ? rsvpB.responses.some((r) => r.status !== "No response yet") : false;
              
              // Sort attending/maybe/not attending first, then no response at the bottom
              if (statusA && !statusB) return -1;
              if (!statusA && statusB) return 1;
              return 0;
            })
            .sort((userA, userB) => {
              // Prioritize President and Officers first (Attending), then Members
              if (userA.role === "President" || userA.role === "Officer") return -1;
              if (userB.role === "President" || userB.role === "Officer") return 1;
              return 0;
            })
            .map((user: any) => {
              // Find the RSVP response for the user
              const rsvp = rsvps.find((rsvp) => rsvp.userId === user.id);
              
              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.role || "Member"}</td>
                  {/* Loop through all event days and display RSVP status */}
                  {eventDetails?.eventDates.map((_, dayIdx) => {
                    const userResponse = rsvp?.responses.find(response => response.dayIndex === dayIdx);
                    const status = userResponse ? userResponse.status : "No response yet";  // Default response if none
                    
                    return <td key={dayIdx}>{status}</td>;  {/* Display the status for each day */}
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


{showRSVPModal && (
  <div className="modal-overlay">
  <div className="modal-content">
    <h3>Edit RSVP</h3>
    <table>
      <thead>
        <tr>
          <th>Day</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {eventDetails?.eventDates.map((_, idx) => {
          const existingResponse = responses.find((r) => r.dayIndex === idx);

          return (
            <tr key={idx}>
              <td>Day {idx + 1}</td>
              <td>
                <select
                  value={existingResponse?.status || "No response"}
                  onChange={(e) => {
                    const newStatus = e.target.value;

                    // Update the `responses` state correctly
                    setResponses((prevResponses) => {
                      const updatedResponses = [...prevResponses];
                      const responseIndex = updatedResponses.findIndex(
                        (r) => r.dayIndex === idx
                      );

                      if (responseIndex >= 0) {
                        // Update existing response
                        updatedResponses[responseIndex].status = newStatus;
                      } else {
                        // Add new response
                        updatedResponses.push({ dayIndex: idx, status: newStatus });
                      }

                      return updatedResponses;
                    });
                  }}
                >
                  <option value="Attending">Attending</option>
                  <option value="Maybe">Maybe</option>
                  <option value="Not Attending">Not Attending</option>
                </select>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <button onClick={() => setShowRSVPModal(false)}>Cancel</button>
    <button onClick={handleRSVP}>Save</button>
  </div>
</div>

)}




<div className="rsvp-section">
  <h3>Participation Status</h3>
  <button onClick={() => setShowRSVPResponsesModal(true)} className="view-rsvp-responses-button">
    View RSVP Responses
  </button>
  {eventDetails?.eventDates.map((date, idx) => {
    const userRSVP = rsvps.find((rsvp) => rsvp.userId === currentUser?.uid);
    const dayResponse = userRSVP?.responses?.find((r) => r.dayIndex === idx);

    return (
      <div key={idx} className="rsvp-day">
        <p>
          <strong>Day {idx + 1}:</strong> {new Date(date.startDate).toDateString()}
        </p>
        <p>
          <strong>Status:</strong> {dayResponse ? dayResponse.status : "No response"}
        </p>
      </div>
    );
  })}

  {/* Only show the edit button if RSVP data can be edited */}
  {dickeditable && !showAttendanceModal && (
    <button onClick={handleOpenRSVPModal} className="edit-rsvp-button">
      Edit RSVP
    </button>
  )}
</div>






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
