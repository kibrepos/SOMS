import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc,Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore, storage } from '../../services/firebaseConfig';
import Header from '../../components/Header'; 
import StudentPresidentSidebar from './StudentPresidentSidebar'; 
import { getAuth } from 'firebase/auth';
import '../../styles/OrganizationSettings.css'; 

const OrganizationSettings: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [newCoverImage, setNewCoverImage] = useState<File | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (user) {
        const userDocRef = doc(firestore, 'students', user.uid); // Adjust collection name if necessary
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserDetails(userDoc.data());
        }
      }
    };

    fetchUserDetails();
  }, [user]);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      const orgDocRef = doc(firestore, 'organizations', organizationName || '');
      const orgDoc = await getDoc(orgDocRef);
      if (orgDoc.exists()) setOrganizationData(orgDoc.data());
    };
    fetchOrganizationData();
  }, [organizationName]);

  const logActivity = async (description: string) => {
    if (userDetails) {
      const logEntry = {
        userName: `${userDetails.firstname} ${userDetails.lastname}`,
        description,
        organizationName: organizationName,
        timestamp: Timestamp.now(),
        profilePicture: userDetails.profilePicUrl || 'defaultProfilePictureUrl',
      };
  
      await addDoc(collection(firestore, 'studentlogs'), logEntry);
    }
  };

  const handleImageUpload = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSaveChanges = async () => {
    try {
      const updates: any = {};
  
      if (organizationData.description) {
        updates.description = organizationData.description;
        await logActivity('Updated organization description');
      }
  
      if (newProfileImage) {
        const profileUrl = await handleImageUpload(
          newProfileImage,
          `organizations/${organizationName}/profile.jpg`
        );
        updates.profileImagePath = profileUrl;
        await logActivity('Updated profile picture');
      }
  
      if (newCoverImage) {
        const coverUrl = await handleImageUpload(
          newCoverImage,
          `organizations/${organizationName}/cover.jpg`
        );
        updates.coverImagePath = coverUrl;
        await logActivity('Updated cover photo');
      }
  
      const orgDocRef = doc(firestore, 'organizations', organizationName || '');
      await updateDoc(orgDocRef, updates);
  
      alert('Changes saved successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes.');
    }
  };
  
  if (!organizationData) return <div>Loading organization data...</div>;

  return (
    <div className="gitners">
      <Header /> 
      
      <div className="dashboard-container">
        <div className="sidebar-section">
          <StudentPresidentSidebar />
        </div>

        <div className="ORGSsettings-content">
          <h2>Organization Settings</h2>

          <div className="ORGSform-group">
            <label>Organization Name</label>
            <input
              type="text"
              value={organizationData.name}
              disabled 
            />
          </div>

          <div className="ORGSform-group">
            <label>Description</label>
            <textarea
              value={organizationData.description} // Use 'value' to bind state properly
              onChange={(e) =>
                setOrganizationData({ ...organizationData, description: e.target.value })
              }
            />
          </div>

          <div className="ORGSform-group">
            <label>Profile Picture</label>
            <input 
              type="file" 
              onChange={(e) => setNewProfileImage(e.target.files?.[0] || null)} 
            />
          </div>

          <div className="ORGSform-group">
            <label>Cover Photo</label>
            <input 
              type="file" 
              onChange={(e) => setNewCoverImage(e.target.files?.[0] || null)} 
            />
          </div>

          <button onClick={handleSaveChanges}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
