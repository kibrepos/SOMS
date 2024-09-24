import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, firestore } from "../../services/firebaseConfig"; // Assuming Firestore is also configured in firebaseConfig
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore methods
import '../../styles/AdminDashboard.css'; 
import AdminSidebar from './AdminSidebar'; // Import AdminSidebar from the same folder

const AdminDashboard: React.FC = () => {
  const [lastName, setLastName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) {
          navigate("/verify-email"); // Redirect to email verification page
        } else {
          // Fetch user's last name from Firestore
          try {
            const userDoc = await getDoc(doc(firestore, "admin", user.uid)); // Fetch from Firestore
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setLastName(userData.lastname); // Set the last name from Firestore data
            }
          } catch (err) {
            console.error("Error fetching user data:", err);
          }
        }
      } else {
        navigate("/login"); 
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-main">
        <AdminSidebar />
        <div className="admin-dashboard-content">
          <h2>Welcome Admin {lastName}</h2>
          {/* Add admin-specific functionality here */}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
