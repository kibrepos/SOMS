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
  const [profileImagePreview, setProfileImagePreview] = useState(null);
const [coverImagePreview, setCoverImagePreview] = useState(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);

  const auth = getAuth();
  const user = auth.currentUser;
  const [isEditing, setIsEditing] = useState(false);
  const enterEditMode = () => setIsEditing(true);
const exitEditMode = () => setIsEditing(false);

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }
};




useEffect(() => {
  const fetchUserDetails = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      let userDocRef = doc(firestore, "students", currentUser.uid);
      let userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // If the user is not found in the "students" collection, check "faculty"
        userDocRef = doc(firestore, "faculty", currentUser.uid);
        userDoc = await getDoc(userDocRef);
      }

      if (userDoc.exists()) {
        setUserDetails(userDoc.data());
      } else {
        console.error("User not found in students or faculty collections.");
      }
    }
  };

  fetchUserDetails();
}, []);

const logActivity = async (description: string) => {
  if (organizationName && userDetails) {
    try {
      const logEntry = {
        userName: `${userDetails.firstname} ${userDetails.lastname}`,
        description,
        organizationName,
        timestamp: new Date(),
      };

      await addDoc(
        collection(firestore, `studentlogs/${organizationName}/activitylogs`),
        logEntry
      );
      console.log("Activity logged:", logEntry);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }
};


  useEffect(() => {
    const fetchOrganizationData = async () => {
      const orgDocRef = doc(firestore, 'organizations', organizationName || '');
      const orgDoc = await getDoc(orgDocRef);
      if (orgDoc.exists()) {
        const data = orgDoc.data();
        setOrganizationData(data);
        
        // Set initial image previews from the existing paths
        setProfileImagePreview(data.profileImagePath || null);
        setCoverImagePreview(data.coverImagePath || null);
      }
    };
    fetchOrganizationData();
  }, [organizationName]);
  



  const handleSaveChanges = async () => {
    try {
      const updates: any = {};
  
      if (organizationData.description) {
        updates.description = organizationData.description;
        await logActivity('Updated organization description');
      }
  
      if (newProfileImage) {
        const profileImageRef = ref(storage, `organizations/${organizationName}/profile/${newProfileImage.name}`);
        await uploadBytes(profileImageRef, newProfileImage);
        const profileImageUrl = await getDownloadURL(profileImageRef);
        updates.profileImageName = newProfileImage.name;
        updates.profileImagePath = profileImageUrl;
        await logActivity('Updated profile picture');
      }
  
      if (newCoverImage) {
        const coverImageRef = ref(storage, `organizations/${organizationName}/cover/${newCoverImage.name}`);
        await uploadBytes(coverImageRef, newCoverImage);
        const coverImageUrl = await getDownloadURL(coverImageRef);
        updates.coverImageName = newCoverImage.name;
        updates.coverImagePath= coverImageUrl;
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
    <div className="organization-announcements-page">
      <Header />

      <div className="organization-announcements-container">
        <div className="sidebar-section">
          <StudentPresidentSidebar />
        </div>

        <div className="organization-announcements-content">
          <div className="header-container">
            <h1 className="headtitle">Settings</h1>
          </div>
     
          <div className="ORGSform-group">
  <label>Organization Name</label>
  {/* Display organization name as plain text, no editing */}
  <span>{organizationData.name}</span>
</div>


<div className="ORGSform-group">
  <label>Description</label>
  {isEditing ? (
    <textarea
      value={organizationData.description}
      onChange={(e) =>
        setOrganizationData({ ...organizationData, description: e.target.value })
      }
    />
  ) : (
    <p>{organizationData.description}</p>
  )}
</div>

    <div className="ORGSform-group">
  <label>Profile Picture</label>
  {isEditing ? (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          setNewProfileImage(e.target.files?.[0] || null);
          handleImageChange(e);
        }}
      />
      {profileImagePreview && (
        <div>
          <img
            src={profileImagePreview}
            alt="Profile Preview"
            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
          />
        </div>
      )}
    </>
  ) : (
    <div>
      {organizationData.profileImageName ? (
        <img
          src={organizationData.profileImagePath}
          alt="Profile"
          style={{ width: '100px', height: '100px', objectFit: 'cover' }}
        />
      ) : (
        <span>No profile picture</span>
      )}
    </div>
  )}
</div>

<div className="ORGSform-group">
  <label>Cover Photo</label>
  {isEditing ? (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          setNewCoverImage(e.target.files?.[0] || null);
          handleImageChange(e);
        }}
      />
      {coverImagePreview && (
        <div>
          <img
            src={coverImagePreview}
            alt="Cover Preview"
            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
          />
        </div>
      )}
    </>
  ) : (
    <div>
      {organizationData.coverImageName ? (
        <img
          src={organizationData.coverImagePath}
          alt="Cover"
          style={{ width: '100px', height: '100px', objectFit: 'cover' }}
        />
      ) : (
        <span>No cover photo</span>
      )}
    </div>
  )}
</div>



<div className="form-actions">
  {isEditing ? (
    <>
      <button onClick={handleSaveChanges}>Save Changes</button>
      <button onClick={exitEditMode}>Cancel</button>
    </>
  ) : (
    <button onClick={enterEditMode}>Edit</button>
  )}
</div>

</div>
      </div>
    </div>
  );
};

export default OrganizationSettings;