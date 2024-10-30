import React, { useEffect, useState } from 'react';
import { useParams, NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, faUsers, faTasks, faCalendarAlt, 
  faBullhorn, faChartBar, faClipboardList, faCog, 
  faFolderOpen, faTools 
} from '@fortawesome/free-solid-svg-icons';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { auth, firestore, storage } from '../../services/firebaseConfig';
import '../../styles/OrganizationSidebar.css';

const OrganizationSidebar: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Store user role
  const location = useLocation();
  

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        if (organizationName && auth.currentUser) {
          const orgDocRef = doc(firestore, 'organizations', organizationName);
          const orgDoc = await getDoc(orgDocRef);

          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            setOrganizationData(orgData);

            // Determine the user's role
            const currentUserUID = auth.currentUser.uid;

            if (orgData.president?.id === currentUserUID) {
              setUserRole('president');
            } else if (orgData.officers?.some((officer: any) => officer.id === currentUserUID)) {
              setUserRole('officer');
            } else if (orgData.members?.some((member: any) => member.id === currentUserUID)) {
              setUserRole('member');
            }

            // Fetch cover and profile images
            if (orgData.coverImagePath) {
              const coverImageRef = ref(storage, orgData.coverImagePath);
              const coverImageUrl = await getDownloadURL(coverImageRef);
              setCoverImageUrl(coverImageUrl);
            }

            if (orgData.profileImagePath) {
              const profileImageRef = ref(storage, orgData.profileImagePath);
              const profileImageUrl = await getDownloadURL(profileImageRef);
              setProfileImageUrl(profileImageUrl);
            }
          } else {
            console.error('No organization data found.');
          }
        }
      } catch (error) {
        console.error('Error fetching organization data or images:', error);
      }
    };

    fetchOrganizationData();
  }, [organizationName]);

  return (
    <div className="student-sidebar">
      <div
        className="student-sidebar-cover-image"
        style={{
          backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : 'none',
          backgroundColor: coverImageUrl ? 'transparent' : 'gray',
        }}
      >
        <div className="profile-image-wrapper">
          {profileImageUrl ? (
            <img src={profileImageUrl} alt="Profile" className="student-sidebar-profile-image" />
          ) : (
            <FontAwesomeIcon icon={faTools} className="default-profile-icon" />
          )}
        </div>
      </div>

      <h2 className="student-sidebar-organization-name">
  {organizationData?.name || 'Untitled Organization'}
</h2>

{/* Display Current User Role FOR DEBUG PURPOSES ONLY*/}
<p className={`user-role user-role-${userRole}`}>
  {userRole 
    ? `Logged in as: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}` 
    : 'Role: Unknown'}
</p>

      <div className="student-sidebar-nav">
        <NavLink
          to={`/Organization/${organizationName}/dashboard`}
          className={({ isActive }) => 
            `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
        >
          <FontAwesomeIcon icon={faChartLine} /> Dashboard Overview
        </NavLink>

{/* PARA MA VIEW NG MEMBER, OFFICER, or PRESIDENT, need lang is i-type officer, member, or president*/}
        {['officer', 'president'].includes(userRole || '') && (
          <NavLink
            to={`/Organization/${organizationName}/manage-members`}
            className={({ isActive }) =>
              `student-sidebar-navlink ${
                isActive || location.pathname.includes('manage-committees') 
                ? 'student-active-link' : ''
              }`}
          >
            <FontAwesomeIcon icon={faUsers} /> Manage Members
          </NavLink>
        )}

        <NavLink
          to={`/Organization/${organizationName}/Alltasks`}
          className={({ isActive }) => 
            `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
        >
          <FontAwesomeIcon icon={faTasks} /> My Tasks
        </NavLink>

        {['officer', 'president'].includes(userRole || '') && (
          <>
            <NavLink
              to={`/president/event-management/${organizationName}`}
              className={({ isActive }) => 
                `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
            >
              <FontAwesomeIcon icon={faCalendarAlt} /> Event Management
            </NavLink>

            <NavLink
              to={`/president/announcements/${organizationName}`}
              className={({ isActive }) => 
                `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
            >
              <FontAwesomeIcon icon={faBullhorn} /> Announcements
            </NavLink>
          </>
        )}

        {userRole === 'president' && (
          <>
            <NavLink
              to={`/president/reporting-analytics/${organizationName}`}
              className={({ isActive }) => 
                `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
            >
              <FontAwesomeIcon icon={faChartBar} /> Reporting & Analytics
            </NavLink>

            <NavLink
              to={`/president/activity-logs/${organizationName}`}
              className={({ isActive }) => 
                `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
            >
              <FontAwesomeIcon icon={faClipboardList} /> Activity Logs
            </NavLink>

            <NavLink
              to={`/Organization/${organizationName}/settings`}
              className={({ isActive }) => 
                `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
            >
              <FontAwesomeIcon icon={faCog} /> Settings
            </NavLink>
          </>
        )}

        <NavLink
          to={`/Organization/${organizationName}/resources`}
          className={({ isActive }) => 
            `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}
        >
          <FontAwesomeIcon icon={faFolderOpen} /> Resources
        </NavLink>
      </div>
    </div>
  );
};

export default OrganizationSidebar;
