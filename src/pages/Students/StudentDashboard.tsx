import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../../services/firebaseConfig';
import '../../styles/StudentDashboard.css';
import Header from '../../components/Header';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faBuilding } from '@fortawesome/free-solid-svg-icons';

interface Member {
  id: string;
}

interface Officer {
  role: string;
  id: string;
}

interface President {
  id: string;
}

interface Organization {
  name: string;
  description: string;
  head: string;
  members: Member[];
  officers: Officer[];
  president: President;
  facultyAdviser?: { id: string };
  department: string;
  status: string;
  coverImagePath?: string;
  profileImagePath?: string;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          let userDoc = await getDoc(doc(firestore, 'students', user.uid));
          let userData;
  
          if (userDoc.exists()) {
            userData = userDoc.data();
            console.log("Student Data:", userData);
          } else {
            userDoc = await getDoc(doc(firestore, 'faculty', user.uid));
            if (userDoc.exists()) {
              userData = userDoc.data();
              console.log("Faculty Data:", userData);
            } else {
              setError('No data found for this user.');
              return;
            }
          }
  
          setStudentData(userData);
  
          const organizationsRef = collection(firestore, 'organizations');
          const organizationsDocs = await getDocs(organizationsRef);
  
          const orgList: Organization[] = [];
  
          organizationsDocs.forEach((orgDoc) => {
            const orgData = orgDoc.data() as Organization;
            console.log("Organization Data:", orgData);
  
            const isMember = orgData.members?.some((member) => member.id === user.uid);
            const isPresident = orgData.president.id === user.uid;
            const isOfficer = orgData.officers?.some((officer) => officer.id === user.uid);
            const isFacultyAdviser = orgData.facultyAdviser?.id === user.uid;
  
            console.log(
              `Checking org: ${orgData.name} - Member: ${isMember}, President: ${isPresident}, Officer: ${isOfficer}, Faculty Adviser: ${isFacultyAdviser}`
            );
  
            if (isMember || isPresident || isOfficer || isFacultyAdviser) {
              orgList.push(orgData);
            }
          });
  
          console.log("Filtered Organization List:", orgList);
  
          const sortedOrganizations = orgList.sort((a, b) => {
            if (a.status === 'archived' && b.status !== 'archived') return 1;
            if (a.status !== 'archived' && b.status === 'archived') return -1;
            return 0;
          });
  
          setOrganizations(sortedOrganizations);
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Error fetching user data.');
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login');
      }
    });
  
    return () => unsubscribe();
  }, [navigate]);
  

  const handleOrganizationClick = (organization: Organization) => {
    if (organization.status === 'archived') {
      alert('This organization is not available as it has been archived.');
    } else {
      navigate(`/Organization/${organization.name}/dashboard`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  const truncateText = (text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.slice(0, maxLength) + '...';
    }
    return text;
  };
  return (
    <div className="dashboard-wrapper">
      <Header />

      <div className="dashboard-container">
        <div className="organizations-section">
          <h3>Organizations</h3>
          {organizations.length > 0 ? (
            <div className="organization-list">
              {organizations.map((org) => (
                <div
                  key={org.name}
                  className={`organization-card ${org.status === 'archived' ? 'organization-card-archived' : ''}`}
                  onClick={() => handleOrganizationClick(org)}
                >
                  <div className="organization-card-image">
                    {/* Cover Photo */}
                    {org.coverImagePath ? (
                      <img
                        src={org.coverImagePath}
                        alt={`${org.name} Cover`}
                        className="organization-cover-image"
                      />
                    ) : (
                      <div className="organization-placeholder">
                        <FontAwesomeIcon icon={faBuilding} className="organization-placeholder-icon" />
                      </div>
                    )}

                    {/* Profile Picture */}
                    <div className="organization-profile-pic">
                      {org.profileImagePath ? (
                        <img
                          src={org.profileImagePath}
                          alt={`${org.name} Profile`}
                          className="organization-profile-image"
                        />
                      ) : (
                        <FontAwesomeIcon icon={faUserCircle} className="organization-placeholder-icon" />
                      )}
                    </div>
                  </div>

                  <div className="organization-card-details">
                    <h4>{org.name}</h4>
                    {org.status === 'archived' ? (
                      <p className="organization-archived-message">
                        This organization is no longer available.
                      </p>
                    ) : (
                      <>
                       <p>{truncateText(org.description, 80)}</p>
                        <p className="org-department">{org.department}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>You are not a part of any student organizations.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
