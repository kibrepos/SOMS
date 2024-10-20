import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, firestore } from '../../services/firebaseConfig'; 
import { doc, getDoc } from 'firebase/firestore';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar'; 
import StudentOfficerSidebar from './StudentOfficerSidebar'; 
import StudentMemberSidebar from './StudentMemberSidebar'; 
import '../../styles/OrganizationDashboard.css'; 

const OrganizationDashboard: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>(); // Get organization name from URL
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null); // Track user's role (president, officer, or member)
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        const user = auth.currentUser;

        if (user) {
        
          const userDocRef = doc(firestore, 'students', user.uid); 
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Get the organization data
            const orgDocRef = doc(firestore, 'organizations', organizationName || '');
            const orgDoc = await getDoc(orgDocRef);

            if (orgDoc.exists()) {
              const orgData = orgDoc.data();
              setOrganizationData(orgData);

              // Determine the user's role in the organization
              if (orgData.president?.id === user.uid) {
                setUserRole('president');
              } else if (orgData.officers?.some((officer: any) => officer.id === user.uid)) {
                setUserRole('officer');
              } else if (orgData.members?.some((member: any) => member.id === user.uid)) {
                setUserRole('member');
              } else {
                setUserRole(null); // User is not part of the organization
              }

              // Automatically navigate to the dashboard of the organization
              if (organizationName) {
                navigate(`/Organization/${organizationName}/dashboard`); // Adjust the role and path as needed
              }
            }
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

  if (loading) {
    return <div>Loading organization data...</div>;
  }

  if (!organizationData) {
    return <div>No organization data found.</div>;
  }

  // Render the correct sidebar based on the user's role
  let SidebarComponent = null;
  if (userRole === 'president') {
    SidebarComponent = <StudentPresidentSidebar />;
  } else if (userRole === 'officer') {
    SidebarComponent = <StudentOfficerSidebar />;
  } else if (userRole === 'member') {
    SidebarComponent = <StudentMemberSidebar />;
  }

  return (
    <div className="organization-dashboard-wrapper">
      <Header />

      <div className="dashboard-container">
        <div className="sidebar-section">{SidebarComponent}</div>

        <div className="main-content">
          <div className="dashboard-content">
            <h1>Welcome to the {organizationData?.name || 'Organization'} Dashboard</h1>
            <p>{organizationData?.description || 'No description available.'}</p>

            <div className="stats-section">
              <div className="stat-card">
                <h3>Total Members</h3>
                <p>{organizationData?.members?.length || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Organization Head</h3>
                <p>{organizationData?.head || 'No head assigned'}</p>
              </div>
              <div className="stat-card">
                <h3>Upcoming Events</h3>
                <p>{organizationData?.events?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDashboard;
