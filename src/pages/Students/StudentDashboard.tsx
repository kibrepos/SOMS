import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, firestore } from '../../services/firebaseConfig';
import '../../styles/StudentDashboard.css';
import Header from '../../components/Header';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faBuilding } from '@fortawesome/free-solid-svg-icons';

interface Organization {
  name: string;
  description: string;
  head: string;
  members: string[];
  officers: { role: string; student: string }[];
  president: string;
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
          const studentDocRef = doc(firestore, 'students', user.uid);
          const studentDoc = await getDoc(studentDocRef);

          if (studentDoc.exists()) {
            const student = studentDoc.data();
            setStudentData(student);

            const studentFullName = `${student.firstname} ${student.lastname}`;

            const organizationsRef = collection(firestore, 'organizations');

            const memberQuery = query(
              organizationsRef,
              where('members', 'array-contains', studentFullName)
            );

            const presidentQuery = query(
              organizationsRef,
              where('president', '==', studentFullName)
            );

            const [memberSnapshot, presidentSnapshot] = await Promise.all([
              getDocs(memberQuery),
              getDocs(presidentQuery),
            ]);

            const orgList: Organization[] = [];

            memberSnapshot.forEach((doc) => {
              const orgData = doc.data() as Organization;
              if (!orgList.some((org) => org.name === orgData.name)) {
                orgList.push(orgData);
              }
            });

            presidentSnapshot.forEach((doc) => {
              const orgData = doc.data() as Organization;
              if (!orgList.some((org) => org.name === orgData.name)) {
                orgList.push(orgData);
              }
            });

            const organizationsDocs = await getDocs(collection(firestore, 'organizations'));

            organizationsDocs.forEach((orgDoc) => {
              const orgData = orgDoc.data() as Organization;

              const isOfficer = orgData.officers?.some(
                (officer) => officer.student === studentFullName
              );

              if (isOfficer && !orgList.some((org) => org.name === orgData.name)) {
                orgList.push(orgData);
              }
            });

            const sortedOrganizations = orgList.sort((a, b) => {
              if (a.status === 'archived' && b.status !== 'archived') return 1;
              if (a.status !== 'archived' && b.status === 'archived') return -1;
              return 0;
            });

            setOrganizations(sortedOrganizations);
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
                  className={`organization-card ${
                    org.status === 'archived' ? 'organization-card-archived' : ''
                  }`}
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
                        <p>{org.description}</p>
                        <p className="org-department">{org.department}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>You are not a member, officer, or head of any organizations.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
