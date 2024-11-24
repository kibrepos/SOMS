import React, { useState, useEffect } from "react";
import { auth, firestore, storage } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AdminSidebar from './AdminSidebar';
import '../../styles/AdminSettings.css';

const AdminSettings: React.FC = () => {
  const [adminData, setAdminData] = useState({
    displayName: "",
    email: "",
    profilePicture: "", 
  });

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    profilePicture: "",
  });

  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");
  const [previewProfilePicUrl, setPreviewProfilePicUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  



  useEffect(() => {
    const fetchAdminInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const adminDoc = await getDoc(doc(firestore, "admin", user.uid));
        
        if (adminDoc.exists()) {
          const data = adminDoc.data();
          const profilePic = data.profilePicture ;  // Default placeholder if no profile picture
          
          setAdminData({
            displayName: `${data.firstname} ${data.lastname}`,
            email: data.email,
            profilePicture: profilePic,  // Ensure this URL is correct
          });
  
          setFormData({
            displayName: `${data.firstname} ${data.lastname}`,
            email: data.email,
            profilePicture: profilePic,
          });
  
          setPreviewProfilePicUrl(profilePic);  // Preview for form
        }
      }
    };
  
    fetchAdminInfo();
  }, []);
  

    

 // Handle profile picture change
 const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const validTypes = ['image/jpeg', 'image/png'];

    if (validTypes.includes(file.type)) {
      setNewProfilePic(file);
      setPreviewProfilePicUrl(URL.createObjectURL(file)); // Show preview
    } else {
      alert('Please select a JPG or PNG file.');
    }
  }
};

// Handle profile picture upload
const handleProfilePicUpload = async () => {
  if (newProfilePic && auth.currentUser) {
    const adminId = auth.currentUser.uid; // Admin's user ID
    const profilePicRef = ref(storage, `profilePics/${adminId}/profile-picture.jpg`); // Firebase Storage path

    try {
      setLoading(true);

      // Upload the new profile picture to Firebase Storage
      await uploadBytes(profilePicRef, newProfilePic);

      // Get the new download URL for the uploaded image
      const newProfilePicUrl = await getDownloadURL(profilePicRef);
      console.log("Download URL for profile picture:", newProfilePicUrl); // Log the URL to check

      // Ensure we are updating the profilePicture field with a valid URL
      if (newProfilePicUrl) {
        // Update the admin's profile picture in Firestore
        const adminDocRef = doc(firestore, 'admin', adminId);
        
        await updateDoc(adminDocRef, {
          profilePicture: newProfilePicUrl, // Update the Firestore document with the correct URL
        });

        console.log("Firestore updated with the new profile picture URL");

        // Update the form state with the new profile picture URL
        setPreviewProfilePicUrl(newProfilePicUrl);  // Update the preview for the form
        setFormData((prevState) => ({
          ...prevState,
          profilePicture: newProfilePicUrl, // Update local state for form data
        }));

        alert('Profile picture updated successfully!');
      } else {
        console.error('Error: The new profile picture URL is undefined or invalid.');
  
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
 
    } finally {
      setLoading(false);
    }
  } else {
    console.error('No new profile picture selected or user not authenticated.');
  
  }
};

  
  

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const user = auth.currentUser;

      if (user) {
        if (newProfilePic) {
          await handleProfilePicUpload(); // Ensure profile picture gets uploaded
        }

        // Update Firebase Authentication profile
        await updateProfile(user, {
          displayName: formData.displayName,
          photoURL: formData.profilePicture, // Use the updated profile picture URL
        });

        // Update Firestore with the new display name and profile picture
        const adminDocRef = doc(firestore, "admin", user.uid);
        await updateDoc(adminDocRef, {
          firstname: formData.displayName.split(" ")[0],
          lastname: formData.displayName.split(" ")[1] || "",
          profilePicture: formData.profilePicture, // Update the profile picture in Firestore
        });

        setAdminData(formData);
        setSuccessMessage("Profile updated successfully!");
        setIsProfileModalOpen(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    if (passwordStrength !== "Strong") {
      setErrorMessage("Password must be strong.");
      setLoading(false);
      return;
    }

    try {
      if (auth.currentUser && currentPassword) {
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email!,
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);

        await updatePassword(auth.currentUser, newPassword);
        setSuccessMessage("Password updated successfully!");
        setIsPasswordModalOpen(false);
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert("Failed to update password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  };

  const checkPasswordStrength = (password: string) => {
    if (password.length < 6) {
      setPasswordStrength("Too Weak");
    } else if (password.length >= 6 && password.length < 10) {
      setPasswordStrength("Moderate");
    } else {
      setPasswordStrength("Strong");
    }
  };

  const toggleProfileModal = () => {
    setIsProfileModalOpen(!isProfileModalOpen);
    setSuccessMessage(""); 
  };

  const togglePasswordModal = () => {
    setIsPasswordModalOpen(!isPasswordModalOpen);
    setSuccessMessage(""); 
  };

  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      <div className="admin-dashboard-content">
        <div className="admin-settings">
          <div className="admin-profile">
          <div className="profile-picture-wrapper">
  <img
    src={adminData.profilePicture}  // Should be correctly updated with the Firebase URL
    alt="Admin Profile"
    className="profile-picture"
  />
</div>


            <div className="admin-details">
              <h2>{adminData.displayName}</h2>
              <p>{adminData.email}</p>
              <div className="profile-buttons">
                <button onClick={toggleProfileModal} className="edit-profile-btn">Edit Profile</button>
                <button onClick={togglePasswordModal} className="change-password-btn">Change Password</button>
              </div>
            </div>
          </div>

          {successMessage && <p className="success-message">{successMessage}</p>}
          {errorMessage && <p className="error-message">{errorMessage}</p>}

          {/* Profile Edit Modal */}
          {isProfileModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Edit Profile</h3>
                <form onSubmit={handleUpdateProfile} className="profile-form">
                  <div className="form-group">
                    <label>Profile Picture</label>
                    <div className="profile-picture-container">
                    <img
  src={previewProfilePicUrl}
  alt="Profile Preview"
  className="profile-preview"
/>

                      <label className="file-input-label" htmlFor="profilePic">Choose File</label>
                      <input
                        type="file"
                        id="profilePic"
                        accept="image/*"
                        onChange={handleProfilePicChange}
                        className="file-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? "Updating..." : "Save Changes"}
                    </button>
                    <button type="button" className="cancel-btn" onClick={toggleProfileModal}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Password Change Modal */}
          {isPasswordModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Change Password</h3>
                <form onSubmit={handleChangePassword} className="password-form">
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        checkPasswordStrength(e.target.value);
                      }}
                      required
                    />
                    <p>Password Strength: <span className={`strength-indicator ${passwordStrength.toLowerCase()}`}>{passwordStrength}</span></p>
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? "Updating..." : "Change Password"}
                    </button>
                    <button type="button" className="cancel-btn" onClick={togglePasswordModal}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
