import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, firestore } from '../../services/firebaseConfig';
import '../../styles/StudentDashboard.css';
import Header from '../../components/Header';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle,faBuilding  } from '@fortawesome/free-solid-svg-icons';

interface Organization {
  name: string;
  description: string;
  head: string;
  members: string[];
  department: string;
  imageUrl?: string;
  profileImageUrl?: string;
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
          const studentDocRef = doc(firestore, 'students', user.uid);
          const studentDoc = await getDoc(studentDocRef);

          if (studentDoc.exists()) {
            const student = studentDoc.data();
            setStudentData(student);

            // Fetch organizations where the student is a member or the head
            const organizationsRef = collection(firestore, 'organizations');
            const orgQuery = query(
              organizationsRef,
              where('members', 'array-contains', `${student.firstname} ${student.lastname}`)
            );

            const orgSnapshot = await getDocs(orgQuery);
            const orgList: Organization[] = [];

            orgSnapshot.forEach((doc) => {
              const orgData = doc.data() as Organization;

              // Check if student is the organization head or a member
              if (
                orgData.head === `${student.firstname} ${student.lastname}` ||
                orgData.members.includes(`${student.firstname} ${student.lastname}`)
              ) {
                orgList.push(orgData);
              }
            });

            setOrganizations(orgList);
          } else {
            setError('No student data found.');
          }
        } catch (err) {
          console.error('Error fetching student data:', err);
          setError('Error fetching student data.');
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login'); // Redirect to login if no user is authenticated
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleOrganizationClick = (organizationName: string) => {
    navigate(`/Organization/${organizationName}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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
                className="organization-card"
                onClick={() => handleOrganizationClick(org.name)}
              >
                <div className="organization-card-image">
                  {org.imageUrl ? (
                    <img src={org.imageUrl} alt={org.name} className="organization-cover-image" />
                  ) : (
                    <div className="organization-placeholder">
                      <FontAwesomeIcon icon={faBuilding} className="organization-placeholder-icon" />
                    </div>
                  )}
                  
                  {/* Profile Picture Circle */}
                  <div className="organization-profile-pic">
                    {org.profileImageUrl ? (
                      <img src={org.profileImageUrl} alt="Profile" className="organization-profile-image" />
                    ) : (
                      <FontAwesomeIcon icon={faUserCircle} className="organization-placeholder-icon" />
                    )}
                  </div>
                </div>
                <div className="organization-card-details">
                  <h4>{org.name}</h4>
                  <p>{org.description}</p>
                  <p className="org-department">{org.department}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>You are not a member or head of any organizations.</p>
        )}
      </div>   </div>
    </div>
  );
};

export default StudentDashboard;
