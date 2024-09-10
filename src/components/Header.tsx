import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, storage } from '../services/firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';
import '../styles/Header.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope } from '@fortawesome/free-solid-svg-icons';

const Header: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const profilePicRef = ref(storage, `profilePics/${user.uid}/profile-picture.jpg`);
        try {
          const url = await getDownloadURL(profilePicRef);
          setProfilePicUrl(url);
        } catch (err) {
          console.error('Error fetching profile picture URL:', err);
          setProfilePicUrl('/default-profile.png');
        }
      } else {
        setProfilePicUrl('/default-profile.png');
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleProfileVisit = () => {
    navigate('/Student/myprofile');
  };
  const handleNavigateToMessages = () => {
    console.log('Navigating to messages...');
    navigate('/Student/messages');
  };
  
  return (
    <div className="header">
      <div className="header-left">
        <div className="logo" onClick={() => navigate('/Student/Dashboard')}>GreenPulse</div>
      </div>
      <div className="header-right">
        <div className="icon" onClick={() => alert('No new notifications')}>
          <FontAwesomeIcon icon={faBell} />
        </div>
        <div className="icon" onClick={handleNavigateToMessages}>
          <FontAwesomeIcon icon={faEnvelope} />
        </div>
        <div className="profile" onClick={toggleDropdown}>
          <img
            src={profilePicUrl || '/default-profile.png'}
            alt="Profile"
            className="profile-icon"
          />
          {showDropdown && (
            <div className="header-dropdown" onMouseLeave={() => setShowDropdown(false)}>
              <ul>
                <li onClick={handleProfileVisit}>Visit Profile</li>
                <li onClick={handleLogout}>Logout</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
