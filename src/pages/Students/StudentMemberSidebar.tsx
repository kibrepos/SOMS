import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {faChartLine, faUsers, faTasks,faCalendarAlt,faBullhorn,faChartBar,faClipboardList,faCog,faFolderOpen,faTools ,} from '@fortawesome/free-solid-svg-icons';
import { NavLink } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { firestore, storage } from '../../services/firebaseConfig';
import '../../styles/StudentPresidentSidebar.css'; 

const StudentMemberSidebar: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>(); 
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        if (organizationName) {
          const orgDocRef = doc(firestore, 'organizations', organizationName);
          const orgDoc = await getDoc(orgDocRef);

          if (orgDoc.exists()) {
            const orgData = orgDoc.data();
            setOrganizationData(orgData);

            if (orgData.coverImagePath) {
              const coverImageRef = ref(storage, orgData.coverImagePath);
              const coverImageUrl = await getDownloadURL(coverImageRef);
              setCoverImageUrl(coverImageUrl);
            } else {
              setCoverImageUrl(null);
            }

            if (orgData.profileImagePath) {
              const profileImageRef = ref(storage, orgData.profileImagePath);
              const profileImageUrl = await getDownloadURL(profileImageRef);
              setProfileImageUrl(profileImageUrl);
            } else {
              setProfileImageUrl(null);
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
      <div className="student-sidebar-cover-image" style={{ backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : 'none', backgroundColor: coverImageUrl ? 'transparent' : 'gray' }}>
        <div className="profile-image-wrapper">
          {profileImageUrl ? (
            <img src={profileImageUrl} alt="Profile" className="student-sidebar-profile-image" />
          ) : (
            <FontAwesomeIcon icon={faTools } className="default-profile-icon" />
          )}
        </div>
      </div>

      <h2 className="student-sidebar-organization-name">{organizationData?.name || 'Untitled Organization'}</h2>

      <div className="student-sidebar-nav">
        <NavLink to={`/Organization/${organizationName}/dashboard`} className={({ isActive }) => `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}>
          <FontAwesomeIcon icon={faChartLine} /> Dashboard Overview
        </NavLink>
        <NavLink
    to={`/Organization/${organizationName}/manage-members`}
    className={({ isActive }) =>
      `student-sidebar-navlink ${
        isActive || location.pathname.includes('manage-committees') ? 'student-active-link' : ''
      }`
    }
  >
    <FontAwesomeIcon icon={faUsers} /> Members
  </NavLink>
        <NavLink to={`/Organization/${organizationName}/mytasks`} className={({ isActive }) => `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}>
          <FontAwesomeIcon icon={faTasks} /> My Tasks
        </NavLink>
        <NavLink to={`/Organization/${organizationName}/events`} className={({ isActive }) => `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}>
          <FontAwesomeIcon icon={faCalendarAlt} /> Event Management
        </NavLink>
        <NavLink to={`/Organization/${organizationName}/announcements`} className={({ isActive }) => `student-sidebar-navlink ${isActive ? 'student-active-link' : ''}`}>
        <FontAwesomeIcon icon={faBullhorn} /> Announcements
        </NavLink>
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

export default StudentMemberSidebar;
