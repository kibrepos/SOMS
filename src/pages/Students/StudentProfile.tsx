import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage } from '../../services/firebaseConfig';
import '../../styles/StudentProfile.css';
import Header from '../../components/Header';
import Locker from '../../components/Locker';

const StudentProfile: React.FC = () => {
  const [studentData, setStudentData] = useState<any>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [previewProfilePicUrl, setPreviewProfilePicUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPicModalOpen, setIsPicModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const studentDocRef = doc(firestore, 'students', user.uid);
          const studentDoc = await getDoc(studentDocRef);

          if (studentDoc.exists()) {
            const data = studentDoc.data();
            setStudentData(data);
            setModalData(data);
            setFirstName(data.firstname || '');
            setLastName(data.lastname || '');

            const profilePicRef = ref(storage, `profilePics/${user.uid}/profile-picture.jpg`);
            try {
              const url = await getDownloadURL(profilePicRef);
              setProfilePicUrl(url);
              setPreviewProfilePicUrl(url);
            } catch (err) {
              setProfilePicUrl('/default-profile.png');
              setPreviewProfilePicUrl('/default-profile.png');
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
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png'];

      if (validTypes.includes(file.type)) {
        setNewProfilePic(file);
        setPreviewProfilePicUrl(URL.createObjectURL(file));
      } else {
        alert('Please select a JPG or PNG file.');
      }
    }
  };

  const handleProfilePicUpload = async () => {
    if (newProfilePic && auth.currentUser) {
      const profilePicRef = ref(storage, `profilePics/${auth.currentUser.uid}/profile-picture.jpg`);
      try {
        await uploadBytes(profilePicRef, newProfilePic);
        const url = await getDownloadURL(profilePicRef);
        setProfilePicUrl(url);
        await updateDoc(doc(firestore, 'students', auth.currentUser.uid), {
          profilePicUrl: url,
        });
      } catch (err) {
        console.error('Error uploading profile picture:', err);
        setError('Error uploading profile picture.');
      }
    }
  };

  const handleSaveChanges = async () => {
    if (modalData) {
      const studentDocRef = doc(firestore, 'students', auth.currentUser?.uid!);
      try {
        await updateDoc(studentDocRef, {
          firstname: firstName,
          lastname: lastName,
          department: modalData.department,
          year: modalData.year,
          studentNumber: modalData.studentNumber,
        });

        if (newProfilePic) {
          await handleProfilePicUpload();
        }

        setStudentData({
          ...modalData,
          firstname: firstName,
          lastname: lastName,
        });
        setIsModalOpen(false);
        window.location.reload();
      } catch (err) {
        console.error('Error saving changes:', err);
        setError('Error saving changes.');
      }
    }
  };

  const handlePasswordChange = async () => {
    let hasError = false;
    setPasswordError('');
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      hasError = true;
    }

    if (hasError) return;

    const user = auth.currentUser;
    if (user && user.email) {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);

      try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setPasswordSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        console.error('Error changing password:', err);
        setPasswordError('The current password is incorrect.');
      }
    }
  };

  const handleProfilePicClick = () => {
    setIsPicModalOpen(true);
  };

  const handlePicModalClose = () => {
    setIsPicModalOpen(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
    
      <div className='asd'>
        <Header />
      </div>
      <div className="page-container">
        <div className="content-wrapper">
          <div className="profile-content">
            <div className="profile-left">
              <div className="profile-pic-container" onClick={handleProfilePicClick}>
                <img src={profilePicUrl || '/default-profile.png'} alt="Profile" className="profile-pic" />
              </div>
              <h2>{studentData?.firstname} {studentData?.lastname}</h2>
              <hr></hr>
              <p>{studentData?.department}</p>
              <p>{studentData?.year} - {studentData?.studentNumber}</p>
              <p>{studentData?.email}</p>
              <button onClick={() => setIsModalOpen(true)}>Edit Profile</button>
              <button onClick={() => setIsPasswordModalOpen(true)}>Change Password</button>
              <button>Send Feedback</button>
            </div>
            <div className="locker">
              <Locker />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Component for Editing Profile */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Profile</h2>
            <div className="modal-profile-pic">
              <img src={previewProfilePicUrl || '/default-profile.png'} alt="Profile" className="modal-profile-pic-img" />
              <label htmlFor="file-upload" className="file-input-label">
                Choose File
              </label>
              <input
                type="file"
                id="file-upload"
                accept=".jpg,.jpeg,.png"
                onChange={handleProfilePicChange}
                className="file-input"
              />
            </div>
            <label>
              First Name:
              <input
                type="text"
                name="firstname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label>
              Last Name:
              <input
                type="text"
                name="lastname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
            <label>
              Department:
              <select
                name="department"
                value={modalData?.department || ''}
                onChange={(e) => setModalData({
                  ...modalData,
                  department: e.target.value
                })}
              >
                <option value="CEAT">CEAT</option>
                <option value="CICS">CICS</option>
                <option value="CBAA">CBAA</option>
                {/* Add more options as needed */}
              </select>
            </label>
            <label>
              Year and Section:
              <input
                type="text"
                name="year"
                value={modalData?.year || ''}
                onChange={(e) => setModalData({
                  ...modalData,
                  year: e.target.value
                })}
              />
            </label>
            <label>
              Student ID:
              <input
                type="text"
                name="studentNumber"
                value={modalData?.studentNumber || ''}
                onChange={(e) => setModalData({
                  ...modalData,
                  studentNumber: e.target.value
                })}
              />
            </label>
            <button onClick={handleSaveChanges}>Save</button>
            <button className="cancelB" onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Modal Component for Enlarged Profile Picture */}
      {isPicModalOpen && (
        <div className="pic-modal-overlay" onClick={handlePicModalClose}>
          <div className="pic-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="pic-modal-close" onClick={handlePicModalClose}>×</button>
            <img src={profilePicUrl || '/default-profile.png'} alt="Profile" className="pic-modal-img" />
          </div>
        </div>
      )}

      {/* Modal Component for Changing Password */}
      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Change Password</h2>
            <label>
              Current Password:
              <input
                type="password"
                name="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label>
              New Password:
              <input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label>
              Confirm Password:
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            {passwordError && <p className="error">{passwordError}</p>}
            {passwordSuccess && <p className="success">{passwordSuccess}</p>}
            <button onClick={handlePasswordChange}>Change Password</button>
            <button className="cancelB" onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentProfile;
