// src/pages/Students/OrganizationSettings.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore, storage } from '../../services/firebaseConfig';
import Header from '../../components/Header'; 
import StudentPresidentSidebar from './StudentPresidentSidebar'; 
import '../../styles/OrganizationSettings.css'; 

const OrganizationSettings: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [newCoverImage, setNewCoverImage] = useState<File | null>(null);

  // Fetch organization data when the component loads
  useEffect(() => {
    const fetchOrganizationData = async () => {
      const orgDocRef = doc(firestore, 'organizations', organizationName || '');
      const orgDoc = await getDoc(orgDocRef);
      if (orgDoc.exists()) setOrganizationData(orgDoc.data());
    };
    fetchOrganizationData();
  }, [organizationName]);

  // Handle uploading an image to Firebase Storage
  const handleImageUpload = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    try {
      const updates: any = {
        description: organizationData.description, // Ensure description gets updated
      };

      if (newProfileImage) {
        const profileUrl = await handleImageUpload(
          newProfileImage,
          `organizations/${organizationName}/profile.jpg`
        );
        updates.profileImagePath = profileUrl;
      }

      if (newCoverImage) {
        const coverUrl = await handleImageUpload(
          newCoverImage,
          `organizations/${organizationName}/cover.jpg`
        );
        updates.coverImagePath = coverUrl;
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
