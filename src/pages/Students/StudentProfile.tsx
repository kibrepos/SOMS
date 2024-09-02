import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage } from '../../services/firebaseConfig';
import '../../styles/StudentProfile.css';
import Header from '../../components/Header'; 

const StudentProfile: React.FC = () => {
  const [studentData, setStudentData] = useState<any>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const studentDocRef = doc(firestore, 'students', user.uid);
          const studentDoc = await getDoc(studentDocRef);

          if (studentDoc.exists()) {
            setStudentData(studentDoc.data());

            // Get profile picture URL
            const profilePicRef = ref(storage, `profilePics/${user.uid}/profile-picture.jpg`);
            try {
              const url = await getDownloadURL(profilePicRef);
              setProfilePicUrl(url);
            } catch (err) {
              // If profile picture does not exist, use a placeholder
              setProfilePicUrl('/default-profile.png');
            }
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

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfilePic(e.target.files[0]);
    }
  };

  const handleProfilePicUpload = async () => {
    if (newProfilePic && auth.currentUser) {
      const profilePicRef = ref(storage, `profilePics/${auth.currentUser.uid}/profile-picture.jpg`);
      try {
        await uploadBytes(profilePicRef, newProfilePic);
        const url = await getDownloadURL(profilePicRef);
        setProfilePicUrl(url);
      } catch (err) {
        console.error('Error uploading profile picture:', err);
        setError('Error uploading profile picture.');
      }
    }
  };

  const handleSaveChanges = async () => {
    if (studentData) {
      const studentDocRef = doc(firestore, 'students', auth.currentUser?.uid!);
      try {
        await updateDoc(studentDocRef, {
          department: studentData.department,
          firstname: studentData.firstname,
        });
        await handleProfilePicUpload(); // Ensure this runs after updating doc
      } catch (err) {
        console.error('Error saving changes:', err);
        setError('Error saving changes.');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="page-container">
      <Header />
      <div className="profile-content">
        <h1>Student Profile</h1>
        <div className="profile-section">
          <img src={profilePicUrl || '/default-profile.png'} alt="Profile" className="profile-pic" />
          <input type="file" onChange={handleProfilePicChange} />
        </div>
        <div className="profile-info">
          <input
            type="text"
            value={studentData?.firstname || ''}
            onChange={(e) => setStudentData({ ...studentData, firstname: e.target.value })}
          />
          <input
            type="text"
            value={studentData?.department || ''}
            onChange={(e) => setStudentData({ ...studentData, department: e.target.value })}
          />
          <button onClick={handleSaveChanges}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
