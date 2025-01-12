import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, firestore } from '../../services/firebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import StudentMemberSidebar from './StudentMemberSidebar';
import '../../styles/OrganizationDashboard.css';


interface Task {
  id: string;
  title: string;
  dueDate: string;
  taskStatus: string;
  assignedCommittees: string[];
  assignedMembers: string[];
  assignedTo: string[];
}

interface Announcement {
  id: string;
  subject: string;
  timestamp: {
    seconds: number;
  };
}

const OrganizationDashboard: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Store user ID
  const navigate = useNavigate();

  const limitedTasks = tasks.slice(0, 3);
  const limitedEvents = events.slice(0, 3);

  
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        // Dynamically fetch events from Firestore for the current organization
        const eventsCollectionRef = collection(firestore, `events/${organizationName}/event`);
        const eventsSnapshot = await getDocs(eventsCollectionRef);
        
        // Extract event data and filter for upcoming events
        const currentDate = new Date();
        const upcomingEvents = eventsSnapshot.docs
          .map(doc => doc.data())
          .filter((event: any) => {
            // Check if event has a startDate and if it is in the future
            return event.eventDates && event.eventDates.some((date: any) => new Date(date.startDate) > currentDate);
          });
        
        setEvents(upcomingEvents);
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
      }
    };

    if (organizationName) {
      fetchUpcomingEvents();
    }
  }, [organizationName]);
  // Fetch Organization Data and User Role
  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        const user = auth.currentUser;
  
        if (user) {
          setUserId(user.uid); // Set the logged-in user ID
  
          // Check both students and faculty collections
          let userDoc = await getDoc(doc(firestore, 'students', user.uid));
          if (!userDoc.exists()) {
            userDoc = await getDoc(doc(firestore, 'faculty', user.uid));
          }
  
          if (userDoc.exists()) {
            const orgDocRef = doc(firestore, 'organizations', organizationName || '');
            const orgDoc = await getDoc(orgDocRef);
  
            if (orgDoc.exists()) {
              const orgData = orgDoc.data();
              setOrganizationData(orgData);
  
              // Determine the role of the logged-in user
              if (orgData.president?.id === user.uid) {
                setUserRole('president');
              } else if (orgData.officers?.some((officer: any) => officer.id === user.uid)) {
                setUserRole('officer');
              } else if (orgData.members?.some((member: any) => member.id === user.uid)) {
                setUserRole('member');
              } else if (orgData.facultyAdviser?.id === user.uid) {
                setUserRole('faculty');
              } else {
                setUserRole(null);
              }
  
              if (organizationName) {
                navigate(`/Organization/${organizationName}/dashboard`);
              }
            } else {
              console.error('Organization data not found.');
            }
          } else {
            console.error('User data not found in students or faculty collections.');
          }
        }
      } catch (error) {
        console.error('Error fetching organization or user data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchOrganizationData();
  }, [organizationName, navigate]);
  

  // Fetch Tasks for the Organization and filter by assignedTo, assignedCommittees, and assignedMembers
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        if (!organizationName || !userId || !organizationData) return;  // Ensure orgData is loaded
  
        setLoading(true);
  
        const tasksCollectionRef = collection(firestore, `tasks/${organizationName}/AllTasks`);
        const snapshot = await getDocs(tasksCollectionRef);
  
        const fetchedTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
  
        // Filter tasks based on the user’s role and assigned members/committees
        const filteredTasks = fetchedTasks.filter(task => {
          // Check if the user is assigned to this task
          return (
            task.assignedTo.includes(userId) || 
            task.assignedCommittees.some((committee: string) => organizationData?.committees?.includes(committee)) || 
            task.assignedMembers.includes(userId)
          );
        });
  
        // Filter incomplete tasks and tasks that are not overdue
        const currentDate = new Date();
        const incompleteTasks = filteredTasks
          .filter(task => task.taskStatus !== "Completed")
          .filter(task => new Date(task.dueDate) >= currentDate); // Exclude overdue tasks
  
        // Sort tasks by dueDate in descending order (newest tasks first)
        const sortedTasks = incompleteTasks.sort((a, b) => {
          const dateA = new Date(a.dueDate).getTime();
          const dateB = new Date(b.dueDate).getTime();
          return dateB - dateA; // Sort in descending order
        });
  
        setTasks(sortedTasks);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setLoading(false);
      }
    };
  
    if (organizationName && userId && organizationData) {
      fetchTasks();
    }
  }, [organizationName, userId, organizationData]);
  

  // Fetch Announcements for the Organization
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        if (!organizationName) return;

        setLoading(true);

        const orgNotificationsRef = doc(firestore, "notifications", organizationName);
        const subCollectionRef = collection(orgNotificationsRef, "organizationAnnouncements");

        const snapshot = await getDocs(subCollectionRef);

        const fetchedAnnouncements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Announcement[];

        const sortedAnnouncements = fetchedAnnouncements.sort((a, b) => {
          const dateA = new Date(a.timestamp.seconds * 1000).getTime();
          const dateB = new Date(b.timestamp.seconds * 1000).getTime();
          return dateB - dateA;
        });

        const latestAnnouncements = sortedAnnouncements.slice(0, 3);

        setAnnouncements(latestAnnouncements);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        setLoading(false);
      }
    };

    if (organizationName) {
      fetchAnnouncements();
    }
  }, [organizationName]);

 

  

  let SidebarComponent = null;
  if (userRole === 'president') {
    SidebarComponent = <StudentPresidentSidebar />;
  } else if (userRole === 'officer') {
    SidebarComponent = <StudentPresidentSidebar />;
  } else if (userRole === 'faculty') { // Faculty uses the same sidebar as president
    SidebarComponent = <StudentPresidentSidebar />;
  } else if (userRole === 'member') {
    SidebarComponent = <StudentMemberSidebar />;
  }
  

  return (
    <div className="organization-announcements-page">
      <Header />

      <div className="organization-announcements-container">
        <div className="sidebar-section">{SidebarComponent}</div>



        <div className="organization-announcements-content">
  <div className="header-container">
  <h1 className="headtitle">Dashboard</h1>
</div>
<div className="dashboard-container">
  {/* Background Image Section */}
  <div className="dashboard-background-image-container">
    <div
      className="dashboard-org-cover"
      style={{
        backgroundImage: `url(${organizationData?.coverImagePath || '/default-background.jpg'})`,
      }}
    ></div>

    {/* Profile Info Section */}
    <div className="dashboard-org-profile-container">
    <img
      src={organizationData?.profileImagePath || '/default-profile.jpg'}
      alt="Profile"
      className="dashboard-org-profile"
    />
 <div className="dashboard-organization-name">
      <h1>{organizationData?.name}</h1>
    </div>
    </div>
    <div className="dashboard-org-details">
    <p>{organizationData?.description}</p>
  
  
  </div>
</div>

  {/* Right Section for To-do, Announcements, and Events */}
  <div className="dashboard-right-section">
    {/* To-do Box */}
    <div className="todo-box">
      <h4>To-do</h4>
      <ul>
        {limitedTasks.length > 0 ? (
          limitedTasks.map((task, index) => (
            <li key={index} className="todo-item">
              <strong>{task.title}</strong>
            </li>
          ))
        ) : (
          <p>No to-dos available.</p>
        )}
      </ul>
      {tasks.length > 3 && (
        <Link
          to={`/organization/${organizationName}/mytasks`}
          className="view-all-link"
        >
          View All Tasks
        </Link>
      )}
    </div>

    {/* Announcements Box */}
    <div className="announcements-box">
      <h4>Announcements</h4>
      <ul>
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <li key={announcement.id} className="announcement-item-box">
              <strong>{announcement.subject}</strong>
            </li>
          ))
        ) : (
          <p>No announcements available.</p>
        )}
      </ul>
    </div>

    <div className="upcoming-events-box">
  <h4>Upcoming Events</h4>
  <ul>
    {limitedEvents.length > 0 ? (
      limitedEvents.map((event, index) => (
        <li key={index} className="wadapman">
          <Link
            to={`/organization/${organizationName}/events/${event.title}`}
            className="clickable-box"
          >
            <span>{event.title}</span>
          </Link>
        </li>
      ))
    ) : (
      <p>No upcoming events.</p>
    )}
  </ul>
  {events.length > 3 && (
    <Link
      to={`/organization/${organizationName}/events`}
      className="view-all-link"
    >
      View All Events
    </Link>
  )}
</div>


  </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDashboard;
