import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { firestore } from '../../services/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import StudentMemberSidebar from './StudentMemberSidebar';
import '../../styles/OrganizationReports.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface Params {
  organizationName: string; // This will match the route parameter
}

const OrganizationReports: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organization, setOrganization] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('member'); // Default role set to 'member'

  // Dynamically assign the Sidebar component based on user role
  let SidebarComponent = null;
  if (userRole === 'president') {
    SidebarComponent = <StudentPresidentSidebar />;
  } else if (userRole === 'officer') {
    SidebarComponent = <StudentPresidentSidebar  />;
  } else if (userRole === 'member') {
    SidebarComponent = <StudentMemberSidebar />;
  }

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        // Fetch organization details using the organization name from the URL params
        const organizationRef = collection(firestore, 'organizations');
        const q = query(organizationRef, where('name', '==', organizationName));
        const orgSnapshot = await getDocs(q);

        if (!orgSnapshot.empty) {
          const orgData = orgSnapshot.docs[0].data();
          setOrganization(orgData);

          // Determine the user's role based on the committees data
          const committees = orgData.committees || [];
          const userId = 'yourUserId'; // Replace this with the actual user ID logic
          let role = 'member'; // Default role
          
          // Check if the user is part of any committee and find their role
          committees.forEach((committee: any) => {
            if (committee.members && committee.members.includes(userId)) {
              role = committee.role || 'member'; // Set the role
            }
          });

          setUserRole(role);

          // Now, fetch tasks and events related to this organization
          fetchTasksAndEvents(orgData.name);
        } else {
          setError('Organization not found.');
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization data.');
      }
    };

    const fetchTasksAndEvents = async (organizationName: string) => {
      try {
        // Fetch tasks related to the organization
        const taskCollectionRef = collection(firestore, `tasks/${organizationName}/AllTasks`);
        const taskSnapshot = await getDocs(taskCollectionRef);
        const fetchedTasks: any[] = taskSnapshot.docs.map((doc) => doc.data());
        setTasks(fetchedTasks);

        // Fetch events related to the organization
        const eventCollectionRef = collection(firestore, `events/${organizationName}/AllEvents`);
        const eventSnapshot = await getDocs(eventCollectionRef);
        const fetchedEvents: any[] = eventSnapshot.docs.map((doc) => doc.data());
        setEvents(fetchedEvents);
      } catch (err) {
        console.error('Error fetching tasks and events:', err);
        setError('Failed to load tasks and events.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationData();
  }, [organizationName]); // Fetch again if the organizationName changes

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Task Data Processing (Task Status and Completion)
  const taskStatusCounts = tasks.reduce(
    (acc, task) => {
      acc[task.taskStatus] = (acc[task.taskStatus] || 0) + 1;
      return acc;
    },
    { 'In-Progress': 0, 'Completed': 0, 'Overdue': 0, 'Started': 0, 'Extended': 0 }
  );

  const taskCompletionByDate = tasks.reduce((acc, task) => {
    const dueDate = new Date(task.dueDate);
    const dateString = dueDate.toLocaleDateString();
    
    if (!acc[dateString]) {
      acc[dateString] = 0;
    }

    if (task.taskStatus === 'Completed') {
      acc[dateString] += 1;
    }
    
    return acc;
  }, {});

  // Event Data Processing (RSVP and Attendance)
  const rsvpCounts = events.reduce(
    (acc, event) => {
      if (event.rsvpStatus) {
        acc[event.rsvpStatus] = (acc[event.rsvpStatus] || 0) + 1;
      }
      return acc;
    },
    { Attending: 0, NotAttending: 0, Pending: 0 }
  );

  const attendanceByEvent = events.reduce((acc, event) => {
    const eventDate = new Date(event.eventDate);
    const dateString = eventDate.toLocaleDateString();
    
    if (!acc[dateString]) {
      acc[dateString] = 0;
    }

    if (event.attendanceStatus === 'Confirmed') {
      acc[dateString] += 1;
    }
    
    return acc;
  }, {});

  // Pie chart data for task status distribution
  const taskPieData = {
    labels: ['In-Progress', 'Completed', 'Overdue', 'Started', 'Extended'],
    datasets: [
      {
        label: 'Task Status Distribution',
        data: [
          taskStatusCounts['In-Progress'],
          taskStatusCounts['Completed'],
          taskStatusCounts['Overdue'],
          taskStatusCounts['Started'],
          taskStatusCounts['Extended'],
        ],
        backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#cc65fe', '#ff5733'],
        hoverOffset: 4,
      },
    ],
  };

  // Bar chart data for task completion by date
  const taskBarData = {
    labels: Object.keys(taskCompletionByDate),
    datasets: [
      {
        label: 'Completed Tasks by Date',
        data: Object.values(taskCompletionByDate),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Pie chart data for RSVP status distribution
  const rsvpPieData = {
    labels: ['Attending', 'Not Attending', 'Pending'],
    datasets: [
      {
        label: 'RSVP Distribution',
        data: [
          rsvpCounts['Attending'],
          rsvpCounts['NotAttending'],
          rsvpCounts['Pending'],
        ],
        backgroundColor: ['#FF9F40', '#FFCD56', '#FF5C8D'],
        hoverOffset: 4,
      },
    ],
  };

  // Bar chart data for attendance by event date
  const attendanceBarData = {
    labels: Object.keys(attendanceByEvent),
    datasets: [
      {
        label: 'Confirmed Attendance by Date',
        data: Object.values(attendanceByEvent),
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="organization-reports-page">
      <Header />
      <div className="layout-container">
        {SidebarComponent} {/* Sidebar is dynamically rendered based on user role */}
        <div className="reports-container">
          <h1>Organization Reports for {organizationName}</h1>

          <div className="charts-container">
            <div className="chart">
              <h2>Task Status Distribution</h2>
              <Pie data={taskPieData} />
            </div>

            <div className="chart">
              <h2>Task Completion Over Time</h2>
              <Bar data={taskBarData} />
            </div>

            <div className="chart">
              <h2>RSVP Status Distribution</h2>
              <Pie data={rsvpPieData} />
            </div>

            <div className="chart">
              <h2>Confirmed Attendance by Date</h2>
              <Bar data={attendanceBarData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationReports;
