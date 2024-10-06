import React, { useState, useEffect } from "react";
import { auth, firestore, storage } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
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
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null);
  const [previewProfilePicUrl, setPreviewProfilePicUrl] = useState<string>("https://via.placeholder.com/150");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      const adminDoc = await getDoc(doc(firestore, "admin", auth.currentUser?.uid || ""));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        setAdminData({
          displayName: data.firstname + " " + data.lastname,
          email: data.email,
          profilePicture: data.profilePicture || "https://via.placeholder.com/150",
        });
        setFormData({
          displayName: data.firstname + " " + data.lastname,
          email: data.email,
          profilePicture: data.profilePicture || "https://via.placeholder.com/150",
        });
        setPreviewProfilePicUrl(data.profilePicture || "https://via.placeholder.com/150");
      }
    };

    fetchAdminInfo();
  }, []);

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
        setFormData((prevState) => ({
          ...prevState,
          profilePicture: url,
        }));
      } catch (err) {
        console.error('Error uploading profile picture:', err);
        alert('Error uploading profile picture.');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (user) {
        await handleProfilePicUpload();

        await updateProfile(user, {
          displayName: formData.displayName,
          photoURL: formData.profilePicture,
        });

        const adminDocRef = doc(firestore, "admin", user.uid);
        await updateDoc(adminDocRef, {
          firstname: formData.displayName.split(" ")[0],
          lastname: formData.displayName.split(" ")[1] || "",
          profilePicture: formData.profilePicture,
        });

        if (user.email !== formData.email) {
          await updateEmail(user, formData.email);
        }

        // Update the main state with new data after saving
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
                src={adminData.profilePicture}
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
