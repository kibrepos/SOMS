import React, { useEffect, useState, useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import {  collection, query, where, getDocs, doc, getDoc, onSnapshot, addDoc, updateDoc, setDoc,deleteDoc} from "firebase/firestore";
import * as XLSX from "xlsx";
import { firestore, auth } from "../../services/firebaseConfig";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import StudentMemberSidebar from "./StudentMemberSidebar";
import "../../styles/EventView.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck,faClock, faTimes  } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import { showToast } from '../../components/toast';
import { getAuth } from 'firebase/auth'; 


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
  const [showRSVPResponsesModal, setShowRSVPResponsesModal] = useState(false); 
  const [attendanceSaved, setAttendanceSaved] = useState<boolean>(false);
const [attendanceOverview, setAttendanceOverview] = useState<Attendance[]>([]);
const [attendees, setAttendees] = useState<{ fullName: string; section: string }[]>([]);
const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
const [showAttendeesModal, setShowAttendeesModal] = useState(false);
const [qrLink, setQrLink] = useState<string>(""); // Current QR code link
const [newQrLink, setNewQrLink] = useState<string>(""); // Input for new link
const [showArchiveModal, setShowArchiveModal] = useState(false);
const [userDetails, setUserDetails] = useState<any>(null);

useEffect(() => {
  const fetchUserDetails = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      let userDocRef = doc(firestore, "students", currentUser.uid);
      let userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // If the user is not found in the "students" collection, check "faculty"
        userDocRef = doc(firestore, "faculty", currentUser.uid);
        userDoc = await getDoc(userDocRef);
      }

      if (userDoc.exists()) {
        setUserDetails(userDoc.data());
      } else {
        console.error("User not found in students or faculty collections.");
      }
    }
  };

  fetchUserDetails();
}, []);

const logActivity = async (description: string) => {
  if (organizationName && userDetails) {
    try {
      const logEntry = {
        userName: `${userDetails.firstname} ${userDetails.lastname}`,
        description,
        organizationName,
        timestamp: new Date(),
      };

      await addDoc(
        collection(firestore, `studentlogs/${organizationName}/activitylogs`),
        logEntry
      );
      console.log("Activity logged:", logEntry);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }
};

const confirmArchiveEvent = () => {
  if (eventId && organizationName) {
    handleArchiveEvent(eventId, organizationName);
  } else {
    console.error("eventId or organizationName is missing");
  }
};





const canInteractWithAttendance = (dayIndex: number): boolean => {
  if (!eventDetails) return false;

  const currentDate = new Date();
  const eventDay = eventDetails.eventDates[dayIndex];
  const endDate = new Date(eventDay.endDate);

  return currentDate > endDate; // Allow upload only after the day ends
};

const canSaveAttendance = (): boolean => {
  if (!currentUser || !eventDetails) return false;

  const isPresident = userRole === "president";
  const isEventHead = currentUser.uid === eventDetails.eventHead;

  if (!attendanceSaved) {
    // Allow the president and event head to save initially
    return isPresident || isEventHead;
  }

  // After the first save, only allow the president and event head to edit
  return isPresident || isEventHead;
};

  const navigate = useNavigate(); // Call useNavigate at the top of the component
  const getStatusClass = (status: string): string => {
    switch (status) {
      case "Attending":
        return "attending";
      case "Maybe":
        return "maybe";
      case "Not Attending":
        return "not-attending";
      default:
        return "no-response"; // Gray for no response
    }
  };
  
  

  useEffect(() => {
  if (!organizationName || !eventId) return;

  const fetchAllAttendanceData = async () => {
    try {
      const attendanceRef = collection(
        firestore,
        "events",
        organizationName,
        "event",
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
        "event"
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


const saveQrLink = async () => {
  if (!organizationName || !eventId) {
    console.error("Missing organizationName or eventId.");
    return;
  }

  try {
    const eventDocRef = doc(
      firestore,
      "events",
      decodeURIComponent(organizationName),
      "event",
      eventId // Use the saved event ID
    );

    await setDoc(
      eventDocRef,
      { qrLink: newQrLink }, // Save the new QR link
      { merge: true } // Merge with existing data
    );

    // Update local state
    setQrLink(newQrLink);
    setNewQrLink("");
    await logActivity(`Updated QR code for event "${eventDetails?.title}".`);
    showToast("QR code link updated successfully!", "success");
  } catch (error) {
    console.error("Error saving QR link:", error);
    showToast("Failed to update QR code link. Please try again.", "error");
  }
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
 
// Define handleEditEventButtonClick inside the component so it has access to the navigate function
const handleEditEventButtonClick = (eventId: string, organizationName: string) => {
  navigate(`/Organization/${organizationName}/edit-event/${eventId}`); // Navigate to the event edit page
};

const isEventCompleted = (): boolean => {
  if (!eventDetails || !eventDetails.eventDates) return false;

  // Get the latest endDate from the eventDates
  const lastEventDate = eventDetails.eventDates.reduce((latest, current) => {
    return new Date(latest.endDate) > new Date(current.endDate) ? latest : current;
  });

  // Compare the lastEventDate's endDate with the current time
  const now = new Date();
  return new Date(lastEventDate.endDate) < now;
};


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
          <p>No attendees found for this day.</p>
        )}
        <div className="rsvp-responses-modal-actions">
          <button onClick={handleCloseAttendeesModal}>Close</button>
        </div>
      </div>
    </div>
  );
};

const handleArchiveEvent = async (eventId: string, organizationName: string) => {
  try {
    const eventRef = doc(firestore, `events/${organizationName}/event/${eventId}`);
    const archivedEventRef = doc(firestore, `events/${organizationName}/archivedEvents/${eventId}`);

    // Fetch the event details
    const eventSnapshot = await getDoc(eventRef);
    if (!eventSnapshot.exists()) {
      console.error("Event not found in Firestore.");
      return;
    }

    // Get the event data
    const eventData = eventSnapshot.data();

    // Save the event to the "archivedEvents" collection
    await setDoc(archivedEventRef, eventData);

    // Copy the attendance subcollection
    const attendanceRef = collection(firestore, `events/${organizationName}/event/${eventId}/attendance`);
    const attendanceSnapshot = await getDocs(attendanceRef);
    const attendancePromises = attendanceSnapshot.docs.map((attendanceDoc) =>
      setDoc(
        doc(
          firestore,
          `events/${organizationName}/archivedEvents/${eventId}/attendance/${attendanceDoc.id}`
        ),
        attendanceDoc.data()
      )
    );
    await Promise.all(attendancePromises);

    // Copy the forum subcollection
    const forumRef = collection(firestore, `events/${organizationName}/event/${eventId}/forum`);
    const forumSnapshot = await getDocs(forumRef);
    const forumPromises = forumSnapshot.docs.map((forumDoc) =>
      setDoc(
        doc(
          firestore,
          `events/${organizationName}/archivedEvents/${eventId}/forum/${forumDoc.id}`
        ),
        forumDoc.data()
      )
    );
    await Promise.all(forumPromises);

    const attendeesRef = collection(firestore, `events/${organizationName}/event/${eventId}/attendees`);
    const attendeesSnapshot = await getDocs(attendeesRef);
    const attendeesPromises = attendeesSnapshot.docs.map((attendeeDoc) =>
      setDoc(
        doc(
          firestore,
          `events/${organizationName}/archivedEvents/${eventId}/attendees/${attendeeDoc.id}`
        ),
        attendeeDoc.data()
      )
    );
    await Promise.all(attendeesPromises);
    const rsvpRef = collection(firestore, `events/${organizationName}/event/${eventId}/rsvps`);
    const rsvpSnapshot = await getDocs(rsvpRef);
    const rsvpPromises = rsvpSnapshot.docs.map((rsvpDoc) =>
      setDoc(
        doc(
          firestore,
          `events/${organizationName}/archivedEvents/${eventId}/rsvps/${rsvpDoc.id}`
        ),
        rsvpDoc.data()
      )
    );
    await Promise.all(rsvpPromises);

    // Copy associated tasks to "archivedTasks"
    const tasksRef = collection(firestore, `tasks/${organizationName}/AllTasks`);
    const tasksQuery = query(tasksRef, where("event", "==", eventId));
    const tasksSnapshot = await getDocs(tasksQuery);

    const taskArchivePromises = tasksSnapshot.docs.map((taskDoc) =>
      setDoc(
        doc(
          firestore,
          `tasks/${organizationName}/archivedTasks/${taskDoc.id}` // Copy to archivedTasks
        ),
        taskDoc.data()
      )
    );
    await Promise.all(taskArchivePromises);

    // Delete original tasks from "AllTasks"
    const taskDeletePromises = tasksSnapshot.docs.map((taskDoc) =>
      deleteDoc(doc(firestore, `tasks/${organizationName}/AllTasks/${taskDoc.id}`))
    );
    await Promise.all(taskDeletePromises);

    // Delete the original event document
    await deleteDoc(eventRef);

    console.log("Event archived and associated tasks moved to archivedTasks successfully.");

    // Navigate to events page and show success message
    await logActivity(`Archived event "${eventDetails?.title}".`);
    showToast("Event archived successfully.", "success");
    navigate(`/organization/${organizationName}/events`);
  } catch (error) {
    console.error("Error archiving event:", error);
    showToast("Failed to archive the event. Please try again.", "error");
  }
};

const handleSaveAttendance = async (
  dayIndex: number,
  updatedAttendance: { userId: string; name: string; role: string; status: string }[]
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
      `day-${dayIndex}`
    );

    // Update Firestore with enriched attendance data
    await setDoc(attendanceRef, {
      dayIndex,
      attendees: updatedAttendance, // Ensure all fields are present
    });

    const isSingleDayEvent = eventDetails?.eventDates.length === 1;
    const logMessage = isSingleDayEvent
      ? `Updated attendance for event "${eventDetails?.title}".`
      : `Updated attendance for event "${eventDetails?.title}" on Day ${dayIndex + 1}.`;

      await logActivity(logMessage);
      await logAttendees(dayIndex, updatedAttendance);

    setAttendance((prev) =>
      prev.map((a) =>
        a.dayIndex === dayIndex
          ? { ...a, attendees: updatedAttendance }
          : a
      )
    );
    
    setAttendanceSaved(true);
    setShowAttendanceModal(false);
  } catch (error) {
    console.error("Error saving attendance to Firestore:", error);
  }
};

const logAttendees = async (dayIndex: number, attendees: { userId: string; name: string; role: string; status: string }[]) => {
  if (!organizationName || !eventDetails) return;

  try {
    const isSingleDayEvent = eventDetails?.eventDates.length === 1;
    const logMessage = isSingleDayEvent
    ? `Attendance for the event "${eventDetails?.title}" has been successfully saved.`
    : `Attendance for the event "${eventDetails?.title}" on Day ${dayIndex + 1} has been successfully saved.`;


    await logActivity(logMessage);
    console.log("Attendee log saved:", logMessage);
  } catch (error) {
    console.error("Error logging attendees:", error);
  }
};

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const data = event.target?.result;
    if (!data) return;

    const workbook = XLSX.read(data, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const parsedData = XLSX.utils.sheet_to_json(sheet, { header: ["fullName", "section"] });

    if (selectedDayIndex !== null && organizationName && eventId) {
      const attendeesRef = doc(
        firestore,
        "events",
        decodeURIComponent(organizationName),
        "event",
        decodeURIComponent(eventId),
        "attendees",
        `day-${selectedDayIndex}` // Store attendees by day
      );

      await setDoc(attendeesRef, { attendees: parsedData });
      const isSingleDayEvent = eventDetails?.eventDates.length === 1;
      const logMessage = isSingleDayEvent
      ? `Uploaded attendee list for the event "${eventDetails?.title}".`
      : `Uploaded attendee list for the event "${eventDetails?.title}" on Day ${selectedDayIndex + 1}.`;

    await logActivity(logMessage);
      console.log("Attendees uploaded successfully!");
      showToast("Attendees uploaded successfully.", "success");
    }
  };

  reader.readAsBinaryString(file);
};

const handleViewAttendees = async (dayIndex: number) => {
  if (!organizationName || !eventId) return;

  const attendeesRef = doc(
    firestore,
    "events",
    decodeURIComponent(organizationName),
    "event",
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

const canUpload = (dayIndex: number): boolean => {
  if (!eventDetails) return false;

  const currentDate = new Date();
  const eventDay = eventDetails.eventDates[dayIndex];
  const endDate = new Date(eventDay.endDate);

  return currentDate > endDate; // Allow upload only after the day ends
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
           const eventData = eventDoc.data();
           setEventDetails(eventData as Event);
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
            } else if (orgData.facultyAdviser?.id === user.uid) { // Check for faculty adviser
              setUserRole("faculty");
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

  const handleOpenAttendanceModal = async (dayIndex: number) => {
    try {
      if (!organizationName || !eventId || !organizationData) {
        console.error("Missing organization data, organizationName, or eventId.");
        return;
      }
  
      const attendanceDocRef = doc(
        firestore,
        "events",
        organizationName,
        "event",
        eventId,
        "attendance",
        `day-${dayIndex}`
      );
  
      const attendanceDoc = await getDoc(attendanceDocRef);
  
      let dayAttendance;
  
      if (attendanceDoc.exists()) {
        // Use existing data
        dayAttendance = attendanceDoc.data();
      } else {
        // Initialize data with `profilePicUrl`
        dayAttendance = {
          dayIndex,
          attendees: [
            {
              userId: organizationData.president.id,
              name: organizationData.president.name,
              role: "President",
              profilePicUrl: organizationData.president.profilePicUrl || "",
              status: "",
            },
            ...organizationData.officers.map((officer: any) => ({
              userId: officer.id,
              name: officer.name,
              role: "Officer",
              profilePicUrl: officer.profilePicUrl || "",
              status: "",
            })),
            ...organizationData.members.map((member: any) => ({
              userId: member.id,
              name: member.name,
              role: "Member",
              profilePicUrl: member.profilePicUrl || "",
              status: "",
            })),
          ],
        };
      }
  
      setModalDayIndex(dayIndex);
      setEditable(true);
      setShowAttendanceModal(true);
  
      setAttendance((prev) =>
        prev.map((a) =>
          a.dayIndex === dayIndex
            ? { ...a, attendees: dayAttendance.attendees }
            : a
        )
      );
    } catch (error) {
      console.error("Error fetching or initializing attendance data:", error);
    }
  };
  
  
  
  const AttendanceModal: React.FC<{
    attendees: { id: string; name: string; role: string; status?: string; profilePicUrl?: string }[];
    dayIndex: number;
    onClose: () => void;
    onSave: (updatedAttendance: { userId: string; name: string; role: string; status: string }[]) => void;
  }> = ({ attendees, dayIndex, onClose, onSave }) => {
    const [attendanceData, setAttendanceData] = useState(
      attendees.map((attendee) => ({
        ...attendee,
        status: attendee.status || "No response",
      }))
    );
    const isMember = userRole === "member";
    const isOfficer = userRole === "officer";

    const handleStatusChange = (userId: string, newStatus: string) => {
      setAttendanceData((prev) =>
        prev.map((attendee) =>
          attendee.id === userId ? { ...attendee, status: newStatus } : attendee
        )
      );
    };
  
    return (
      <div className="attendance-modal-overlay">
        <div className="attendance-modal-content">
          <h3>Attendance for Day {dayIndex + 1}</h3>
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
              {attendanceData.map((attendee) => (
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
                      <button
                        className={`status-button present ${
                          attendee.status === "Present" ? "active" : ""
                        }`}
                        onClick={() => handleStatusChange(attendee.id, "Present")}
                        disabled={isMember || userRole === "faculty" || (isOfficer && attendanceSaved)}
                      >
                        <FontAwesomeIcon icon={faCheck} className="custom-icon" />
                      </button>
                      <button
                        className={`status-button late ${
                          attendee.status === "Late" ? "active" : ""
                        }`}
                        onClick={() => handleStatusChange(attendee.id, "Late")}
                        disabled={isMember || userRole === "faculty" || (isOfficer && attendanceSaved)}
                      >
                        <FontAwesomeIcon icon={faClock} className="custom-icon" />
                      </button>
                      <button
                        className={`status-button absent ${
                          attendee.status === "Absent" ? "active" : ""
                        }`}
                        onClick={() => handleStatusChange(attendee.id, "Absent")}
                        disabled={isMember || userRole === "faculty" || (isOfficer && attendanceSaved)}
                      >
                        <FontAwesomeIcon icon={faTimes} className="custom-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="modal-actionszxc">
            <button onClick={onClose}>Cancel</button>
            {canSaveAttendance() && (
              <button
                onClick={() =>
                  onSave(
                    attendanceData.map((attendee) => ({
                      userId: attendee.id,
                      name: attendee.name,
                      role: attendee.role,
                      status: attendee.status || "No response",
                    }))
                  )
                }
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
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
 
  

  
  const getSidebarComponent = () => {
    switch (userRole) {
      case "president":
        return <StudentPresidentSidebar />;
      case "officer":
        return <StudentPresidentSidebar  />;
        case "faculty":
          return <StudentPresidentSidebar  />;
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

  if (isEventCompleted() && window.location.pathname.includes("edit-event")) {
    return <Navigate to={`/organization/${organizationName}/events`} replace />;
  }
  //MAIN RETURN CODE RETURNHERE
  return (
    <div className="organization-announcements-page">
      <Header />
      <div className="organization-announcements-container">    
        <div className="sidebar-section">{getSidebarComponent()}</div>

        <div className="organization-announcements-content">


          <div className="header-container">
            <h1 className="headtitle">{eventDetails.title}</h1>
            
            {isEventCompleted() && (userRole === "president" || currentUser?.uid === eventDetails?.eventHead) && (
 <button
 className="create-new-btn"
 onClick={() => setShowArchiveModal(true)}
>
 Archive Event
</button>
)}

{showArchiveModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Are you sure you want to archive this event?</h3>
      <p>Once archived, this action cannot be undone.</p>
      <div className="modal-actions">
        <button onClick={() => setShowArchiveModal(false)}>Cancel</button>
        <button
          className="confirm-button"
          onClick={() => {
            confirmArchiveEvent();
            setShowArchiveModal(false);
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}


{!isEventCompleted() && (userRole === "president" || currentUser?.uid === eventDetails?.eventHead) && (
  <button
    onClick={() =>
      eventId && organizationName
        ? handleEditEventButtonClick(eventId, organizationName)
        : console.error("eventId or organizationName is missing")
    }
    className="create-new-btn"
  >
    Edit Event
  </button>
)}

        
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
                    const status = userResponse ? userResponse.status : "No response yet";

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


{showRSVPModal && (
  <div className="EVXD-modal-overlay">
    <div className="EVXD-modal-content">
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
      <button className="EVXD-cancel-button" onClick={() => setShowRSVPModal(false)}>Cancel</button>
      <button className="EVXD-save-button" onClick={handleRSVP}>Save</button>
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
    
    <p>No QR code link has been set yet.</p>
  )}
</div>
    <div className="qr-code-rightside">
    <a href={qrLink} target="_blank" rel="noopener noreferrer" className="qr-code-link">
  {qrLink}
</a>

{userRole !== "member" && userRole !== "faculty" && (

    <div className="qr-code-input">
      <input
        type="text"
        placeholder="Enter new QR code link"
        value={newQrLink}
        onChange={(e) => setNewQrLink(e.target.value)}
      />
      <button onClick={saveQrLink}>Update QR Code</button>
    </div>
  )}
      </div>
    </div></div></div>
 




          
          <div className="event-side-cards">

          <div className="card-left">
  <h3>Attendance for Organization Members</h3>
  {eventDetails?.eventDates.map((_, dayIndex) => (
    <div key={dayIndex} className="attendance-day">
      {canUpload(dayIndex) || canInteractWithAttendance(dayIndex) ? (
        <>
          <span className="day-label">Day {dayIndex + 1}</span>
          <button
            className="view-button"
            onClick={() => handleOpenAttendanceModal(dayIndex)}
          >
           {userRole === "member" || userRole === "faculty" ? "View" : "Edit"}

          </button>
        </>
      ) : (
        <p className="inactive-text">
          Attendance details will be available after the event schedule.
        </p>
      )}
    </div>
  ))}
</div>


{/* Attendees Section */}
<div className="card-left">
  <h3>Attendees</h3>
  {eventDetails?.eventDates.map((date, index) => (
    <div key={index} className="attendance-day">
      {canUpload(index) ? (
        <>
          <span>Day {index + 1}</span>
          {userRole !== "member" && userRole !== "faculty" && (

            <button
              className="action-button upload-button"
              onClick={() => {
                setSelectedDayIndex(index);
                document.getElementById("fileInput")?.click();
              }}
            >
              Upload
            </button>
          )}
          <button
            className="action-button view-button"
            onClick={() => {
              handleViewAttendees(index);
              setShowAttendeesModal(true);
            }}
          >
            View
          </button>
        </>
      ) : (
        <p className="inactive-text">
          Attendees will be available after the event schedule.
        </p>
      )}
    </div>
  ))}
  {/* Hidden File Input */}
  <input
    type="file"
    id="fileInput"
    accept=".xlsx, .xls"
    style={{ display: "none" }}
    onChange={handleFileUpload}
  />
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
    onSave={(updatedAttendance) =>
      handleSaveAttendance(modalDayIndex!, updatedAttendance)
    }
  />
  


)}

{userRole !== "member" && userRole !== "faculty" && ( 

  <div className="card-left">
    <button
      onClick={() => setShowRSVPResponsesModal(true)}
      className="view-rsvp-responses-button"
    >
      View RSVP Responses
    </button>
  </div>
)}

  <div className="card-right">
    
  <h3>Participation Status</h3>
<div className="rsvp-section">
  {eventDetails?.eventDates.length === 1 ? (
    <div className="rsvp-single-day">
      <span
        className={`rsvp-status-label ${getStatusClass(
          rsvps.find((rsvp) => rsvp.userId === currentUser?.uid)?.responses[0]?.status || "No response"
        )}`}
      >
        {rsvps.find((rsvp) => rsvp.userId === currentUser?.uid)?.responses[0]?.status || "No response"}
      </span>
    </div>
  ) : (
    eventDetails?.eventDates.map((_, idx) => {
      const userRSVP = rsvps.find((rsvp) => rsvp.userId === currentUser?.uid);
      const dayResponse = userRSVP?.responses?.find((r) => r.dayIndex === idx);

      return (
        <div key={idx} className="rsvp-day">
          <p>
            <strong>Day {idx + 1}:</strong>{" "}
            <span
              className={`rsvp-status-label ${getStatusClass(
                dayResponse?.status || "No response"
              )}`}
            >
              {dayResponse?.status || "No response"}
            </span>
          </p>
        </div>
      );
    })
  )}
  
  {dickeditable && !showAttendanceModal && (
    <div className="rsvp-actions">
      <button onClick={handleOpenRSVPModal} className="create-new-btn">
        Edit RSVP
      </button>
    </div>
  )}
</div>



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
