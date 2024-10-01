import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThLarge, faUser, faBuilding, faCalendar, faUsers, faComments, faChartPie, faClipboardList, faStar, faBars, faSignOutAlt, faCog } from '@fortawesome/free-solid-svg-icons';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '../../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { NavLink } from 'react-router-dom'; // Import NavLink for active class support
import '../../styles/AdminSidebar.css';

const AdminSidebar: React.FC = () => {
  const [adminName, setAdminName] = useState<string>(''); 
  const [adminEmail, setAdminEmail] = useState<string>(''); 
  const [collapsed, setCollapsed] = useState<boolean>(false); // State for collapse

  useEffect(() => {
    // Check if sidebar state is stored in localStorage
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState) {
      setCollapsed(JSON.parse(savedState)); // Restore the collapsed state
    }

    // Fetch admin data
    const fetchAdminData = async () => {
      const adminDoc = await getDoc(doc(firestore, 'admin', auth.currentUser?.uid || ''));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        setAdminName(data.firstname + ' ' + data.lastname);
        setAdminEmail(data.email);
      } else {
        console.log('No such document!');
      }
    };

    fetchAdminData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState); // Toggle sidebar collapse
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState)); // Save state to localStorage
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <h3>GreenPulse</h3>
        <FontAwesomeIcon icon={faBars} className="toggle-button" onClick={toggleCollapse} />
      </div>

      <ul>
        <li>
          <NavLink 
            to="/Admin/dashboard" 
            className={({ isActive }) => (isActive ? 'active' : '')} 
          >
            <FontAwesomeIcon icon={faThLarge} />
            <span> Dashboard Overview</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/Admin/Manage-Students" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faUser} />
            <span> Manage Students</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/manage-organizations" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faBuilding} />
            <span> Manage Organizations</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/events-management" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faCalendar} />
            <span> Events Management</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/user-management" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faUsers} />
            <span> User Management</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/announcements" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faComments} />
            <span> Announcements</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/reporting-analytics" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faChartPie} />
            <span> Reporting & Analytics</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/Admin/Activity-Logs" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faClipboardList} />
            <span> Activity Logs</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/feedback-support" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faStar} />
            <span> Feedback & Support</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/settings" 
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <FontAwesomeIcon icon={faCog} />
            <span> Settings</span>
          </NavLink>
        </li>
      </ul>

      <div className="user-profile">
        <img src="https://via.placeholder.com/40" alt="User profile" />
        <div className="user-info">
          <h4>{adminName}</h4>
          <p>{adminEmail}</p>
        </div>
       
        <FontAwesomeIcon icon={faSignOutAlt} className="sign-out-icon" onClick={handleSignOut} />
      </div>
    </div>
  );
};

export default AdminSidebar;
