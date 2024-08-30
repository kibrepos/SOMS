import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (!user.emailVerified) {
          navigate("/verify-email"); // Redirect to email verification page
        }
        // Add additional checks and dashboard functionality here
      } else {
        navigate("/login"); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div>
      <h2>Faculty Dashboard</h2>
      {/* Add faculty-specific functionality here */}
    </div>
  );
};

export default FacultyDashboard;
