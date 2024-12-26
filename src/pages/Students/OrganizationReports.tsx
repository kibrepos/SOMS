import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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

  useEffect(() => {
    const fetchEvents = async () => {
      if (!organizationName) return;
      try {
        const eventCollection = collection(
          firestore,
          `events/${organizationName}/event`
        );
        const eventSnapshot = await getDocs(eventCollection);
        const fetchedEvents = eventSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(fetchedEvents);
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

  useEffect(() => {
    if (tasks.length > 0) {
      const taskStatuses = tasks.reduce(
        (acc: any, task: any) => {
          acc[task.taskStatus] = (acc[task.taskStatus] || 0) + 1;
          return acc;
        },
        { Started: 0, "In-Progress": 0, Completed: 0, Overdue: 0, Extended: 0 }
      );

      const ctx = document.getElementById("taskPieChart") as HTMLCanvasElement;
      new Chart(ctx, {
        type: "pie",
        data: {
          labels: Object.keys(taskStatuses),
          datasets: [
            {
              label: "Task Status Distribution",
              data: Object.values(taskStatuses),
              backgroundColor: [
                "#FF6384",
                "#36A2EB",
                "#FFCE56",
                "#4BC0C0",
                "#9966FF",
              ],
            },
          ],
        },
      });
    }
  }, [tasks]);

  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    try {
      // Fetch attendees
      const attendeesCollection = collection(
        firestore,
        `events/${organizationName}/event/${event.id}/attendees`
      );
      const attendeesSnapshot = await getDocs(attendeesCollection);
      const attendeesData: any = {};
      attendeesSnapshot.docs.forEach((doc) => {
        attendeesData[doc.id] = doc.data().attendees || [];
      });
      setAttendeesByDay(attendeesData);

      // Fetch attendance
      const attendanceCollection = collection(
        firestore,
        `events/${organizationName}/event/${event.id}/attendance`
      );
      const attendanceSnapshot = await getDocs(attendanceCollection);
      const attendanceData: any = {};
      attendanceSnapshot.docs.forEach((doc) => {
        attendanceData[doc.id] = doc.data().attendees || [];
      });
      setAttendanceByDay(attendanceData);

      // Fetch event head name from committees in organization
      const committeesDoc = doc(firestore, `organizations/${organizationName}`);
      const committeesSnapshot = await getDoc(committeesDoc);
      const committeesData = committeesSnapshot.data()?.committees || [];
      const committeeWithHead = committeesData.find(
        (committee: any) => committee.head.id === event.eventHead
      );
      setEventHead(committeeWithHead?.head?.name || "N/A");
    } catch (error) {
      console.error("Error fetching event details:", error);
    }
  };

  const handlePrintEventDetails = async () => {
    const element = document.getElementById("event-details");
    if (!element) return;

    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF();
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${selectedEvent.title}_Details.pdf`);
  };

  const handlePrintAttendees = async () => {
    const element = document.getElementById("attendee-list");
    if (!element) return;

    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF();
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${selectedEvent.title}_Attendees.pdf`);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="organization-announcements-page">
      <Header />
      <div className="organization-announcements-container">
        <div className="sidebar-section">
          <StudentPresidentSidebar />
        </div>

        <div className="organization-announcements-content">
          <h1>Organization Reports</h1>
          <div className="event-list">
            <h2>Events</h2>
            {events.map((event) => (
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
              <button onClick={handlePrintEventDetails}>
                Print Event Details
              </button>

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
  <button onClick={handlePrintAttendees}>Print Attendees</button>
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

          <div id="task-chart">
            <h2>Task Status Distribution</h2>
            <canvas id="taskPieChart" width="400" height="400"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationReports;
