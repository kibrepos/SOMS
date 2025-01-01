import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { firestore } from "../../services/firebaseConfig";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import "../../styles/OrganizationReports.css";
import { Chart } from "chart.js/auto";
import { useParams } from "react-router-dom";

const OrganizationReports: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [attendeesByDay, setAttendeesByDay] = useState<any>({});
  const [attendanceByDay, setAttendanceByDay] = useState<any>({});
  const [eventHead, setEventHead] = useState<string>("Loading...");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationData, setOrganizationData] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate(); // Initialize navigate
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!organizationName) return;
      try {
        const organizationDoc = doc(
          firestore,
          `organizations/${organizationName}`
        );
        const organizationSnapshot = await getDoc(organizationDoc);
        setOrganizationData(organizationSnapshot.data() || {});
      } catch (error) {
        console.error("Error fetching organization data:", error);
      }
    };
  
    fetchOrganizationData();
  }, [organizationName]);
  

  useEffect(() => {
    const fetchEvents = async () => {
      if (!organizationName) return;
    
      try {
        // Fetch active events
        const eventCollection = collection(
          firestore,
          `events/${organizationName}/event`
        );
        const eventSnapshot = await getDocs(eventCollection);
        const fetchedEvents = eventSnapshot.docs.map((doc) => ({
          id: doc.id,
          isArchived: false, // Mark as active event
          ...doc.data(),
        }));
    
        // Fetch archived events
        const archivedEventCollection = collection(
          firestore,
          `events/${organizationName}/archivedEvents`
        );
        const archivedEventSnapshot = await getDocs(archivedEventCollection);
        const fetchedArchivedEvents = archivedEventSnapshot.docs.map((doc) => ({
          id: doc.id,
          isArchived: true, // Mark as archived event
          ...doc.data(),
        }));
    
        // Combine active and archived events
        setEvents([...fetchedEvents, ...fetchedArchivedEvents]);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    

    const fetchTasks = async () => {
      if (!organizationName) return;
      try {
        const taskCollection = collection(
          firestore,
          `tasks/${organizationName}/AllTasks`
        );
        const taskSnapshot = await getDocs(taskCollection);
        const fetchedTasks = taskSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTasks(fetchedTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };

    fetchEvents();
    fetchTasks();
  }, [organizationName]);

 
  const handleMemberClick = async (member: any) => {
    if (!member || !member.id) {
      console.error("Invalid member object:", member);
      return; // Exit the function if member is null or invalid
    }
  
    setSelectedEvent(null); // Clear any selected event to show only member stats
  
    let allEvents = [...events]; // Start with active events
  
    // Fetch archived events
    try {
      const archivedEventCollection = collection(
        firestore,
        `events/${organizationName}/archivedEvents`
      );
      const archivedEventSnapshot = await getDocs(archivedEventCollection);
      const archivedEvents = archivedEventSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      allEvents = [...allEvents, ...archivedEvents];
    } catch (error) {
      console.error("Error fetching archived events:", error);
    }
  
    let tasksAssigned = 0;
    let tasksCompleted = 0;
    let tasksOverdue = 0;
  
    // Calculate task statistics
    tasks.forEach((task) => {
      if (task.assignedMembers?.includes(member.id)) {
        tasksAssigned++;
        if (task.taskStatus === "Completed") tasksCompleted++;
        if (task.taskStatus === "Overdue") tasksOverdue++;
      }
    });
  
    let eventsAttended = 0;
    let eventsAbsent = 0;
    let eventsLate = 0;
  
    // Calculate attendance statistics across all events
    for (const event of allEvents) {
      try {
        const attendanceCollection = collection(
          firestore,
          `events/${organizationName}/${
            event.isArchived ? "archivedEvents" : "event"
          }/${event.id}/attendance`
        );
        const attendanceSnapshot = await getDocs(attendanceCollection);
  
        attendanceSnapshot.docs.forEach((doc) => {
          const attendees = doc.data()?.attendees || [];
          const attendanceRecord = attendees.find(
            (attendee: any) => attendee.userId === member.id
          );
  
          if (attendanceRecord) {
            if (attendanceRecord.status === "Present") eventsAttended++;
            if (attendanceRecord.status === "Absent") eventsAbsent++;
            if (attendanceRecord.status === "Late") eventsLate++;
          }
        });
      } catch (error) {
        console.error("Error fetching attendance for event:", error);
      }
    }
  
    // Render the charts
    const taskStatsCtx = document.getElementById(
      "taskStatsChart"
    ) as HTMLCanvasElement;
    const eventStatsCtx = document.getElementById(
      "eventStatsChart"
    ) as HTMLCanvasElement;
  
    if (taskStatsCtx) {
      new Chart(taskStatsCtx, {
        type: "bar",
        data: {
          labels: ["Tasks Assigned", "Tasks Completed", "Tasks Overdue"],
          datasets: [
            {
              label: `${member.name}'s Task Statistics`,
              data: [tasksAssigned, tasksCompleted, tasksOverdue],
              backgroundColor: ["#36A2EB", "#4BC0C0", "#FF6384"],
            },
          ],
        },
      });
    }
  
    if (eventStatsCtx) {
      new Chart(eventStatsCtx, {
        type: "bar",
        data: {
          labels: ["Events Attended", "Events Absent", "Events Late"],
          datasets: [
            {
              label: `${member.name}'s Event Attendance`,
              data: [eventsAttended, eventsAbsent, eventsLate],
              backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
            },
          ],
        },
      });
    }
  };
  
  
  
  const handleEventClick = (event: any) => {
    if (!event || !event.id) {
      console.error("Invalid event object:", event);
      return;
    }
    // Navigate to the specific event page
    navigate(`/Organization/${organizationName}/report/${event.id}`);
  };
  



  return (
    <div className="organization-announcements-page">
      <Header />
      <div className="organization-announcements-container">
        <div className="sidebar-section">
          <StudentPresidentSidebar />
        </div>

        <div className="organization-announcements-content">
       <div className="header-container">
         <h1 className="headtitle">organization Reports</h1>
       
      
           </div>
           <div className="event-list">
  <h2>Events</h2>

  {/* Active Events */}
  <h3>Active Events</h3>
  {events
    .filter((event) => !event.isArchived)
    .map((event) => (
      <div
        key={event.id}
        className="event-item"
        onClick={() => handleEventClick(event)}
      >
        {event.title}
      </div>
    ))}

  {/* Archived Events */}
  <h3>Archived Events</h3>
  {events
    .filter((event) => event.isArchived)
    .map((event) => (
      <div
        key={event.id}
        className="event-item"
        onClick={() => handleEventClick(event)}
      >
        {event.title}
      </div>
    ))}
</div>



          {selectedEvent && (
            <div id="event-details">
              <h2>Event Details</h2>
              <p>
                <strong>Title:</strong> {selectedEvent.title}
              </p>
              <p>
                <strong>Description:</strong> {selectedEvent.description}
              </p>
              <p>
                <strong>Venue:</strong> {selectedEvent.venue}
              </p>
              <p>
              <strong>Event Head:</strong> {eventHead} 
              </p>
              <p>
                <strong>Dates:</strong>
                <ul>
                  {selectedEvent.eventDates.map((date: any, index: number) => (
                    <li key={index}>
                      {new Date(date.startDate).toLocaleString()} -{" "}
                      {new Date(date.endDate).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </p>
           

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

            </div>
          )}

<div id="member-analytics">
  <h2>Member Analytics</h2>
  <ul>
    {organizationData?.members?.map((member: any) => (
      member?.id && (
        <li
          key={member.id}
          className="member-item"
          onClick={() => {
            handleMemberClick(member);
            openModal(); // Open modal when a member is clicked
          }}
        >
          <img
            src={member.profilePicUrl || "https://via.placeholder.com/50"}
            alt={`${member.name}'s profile`}
            style={{ width: "50px", height: "50px", borderRadius: "50%" }}
          />
          <div>
            <p>{member.name}</p>
            <p>{member.email}</p>
            <p>Role: Member</p>
          </div>
        </li>
      )
    ))}
    {organizationData?.officers?.map((officer: any) => (
      officer?.id && (
        <li
          key={officer.id}
          className="member-item"
          onClick={() => {
            handleMemberClick(officer);
            openModal(); // Open modal when an officer is clicked
          }}
        >
          <img
            src={officer.profilePicUrl || "https://via.placeholder.com/50"}
            alt={`${officer.name}'s profile`}
            style={{ width: "50px", height: "50px", borderRadius: "50%" }}
          />
          <div>
            <p>{officer.name}</p>
            <p>{officer.email}</p>
            <p>Role: {officer.role}</p>
          </div>
        </li>
      )
    ))}
    {organizationData?.president?.id && (
      <li
        key={organizationData.president.id}
        className="member-item"
        onClick={() => {
          handleMemberClick(organizationData.president);
          openModal(); // Open modal when the president is clicked
        }}
      >
        <img
          src={organizationData.president.profilePicUrl || "https://via.placeholder.com/50"}
          alt={`${organizationData.president.name}'s profile`}
          style={{ width: "50px", height: "50px", borderRadius: "50%" }}
        />
        <div>
          <p>{organizationData.president.name}</p>
          <p>{organizationData.president.email}</p>
          <p>Role: President</p>
        </div>
      </li>
    )}
  </ul>
</div>


{isModalOpen && (
  <div className="modal-overlay">
    <div className="modal">
      <button className="modal-close-button" onClick={closeModal}>
        &times;
      </button>
      <div id="member-stats-modal">
        <h2>Selected Member Statistics</h2>
        <div>
          <h3>Task Statistics</h3>
          <canvas id="taskStatsChart" width="400" height="400"></canvas>
        </div>
        <div>
          <h3>Event Attendance</h3>
          <canvas id="eventStatsChart" width="400" height="400"></canvas>
        </div>
      </div>
    </div>
  </div>
)}


        </div>
      </div>
    </div>
  );
};

export default OrganizationReports;
