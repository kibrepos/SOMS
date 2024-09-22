import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import '../../styles/AdminDashboard.css'; 
import Header from '../../components/Header'; 

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (!user.emailVerified) {
          navigate("/verify-email"); // Redirect to email verification page
        }
        // Additional admin checks can be added here
      } else {
        navigate("/login"); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="admin-dashboard">
      <Header />
      <h2>Admin Dashboard</h2>
      {/* Add admin-specific functionality here */}
    </div>
  );
};

export default AdminDashboard;
