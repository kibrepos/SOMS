import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../services/firebaseConfig";
import '../styles/Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("User signed in:", user);

      // Check if the email is verified
      if (!user.emailVerified) {
        alert("Please verify your email before logging in.");
        return;
      }

      // Check the user role
      const adminDoc = await getDoc(doc(firestore, "admin", user.uid));
      const facultyDoc = await getDoc(doc(firestore, "faculty", user.uid));
      const studentDoc = await getDoc(doc(firestore, "students", user.uid));

      console.log("Admin Doc exists:", adminDoc.exists());
      console.log("Faculty Doc exists:", facultyDoc.exists());
      console.log("Student Doc exists:", studentDoc.exists());

      // Redirect based on user role
      if (adminDoc.exists()) {
        console.log("Redirecting to admin dashboard");
        navigate("/admin-dashboard");
      } else if (facultyDoc.exists()) {
        console.log("Redirecting to faculty dashboard");
        navigate("/Faculty/dashboard");
      } else if (studentDoc.exists()) {
        console.log("Redirecting to student dashboard");
        navigate("/Student/dashboard");
      } else {
        console.error("User role not found");
        alert("Your role could not be determined. Please contact support.");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Failed to log in. Please check your credentials and try again.");
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const openPopup = (popupId: string) => {
    document.getElementById(popupId)!.style.display = "flex";
  };

  const closePopup = (popupId: string) => {
    document.getElementById(popupId)!.style.display = "none";
  };

  const handleStudentSignup = () => {
    navigate("/Createaccount/student");
  };

  const handleFacultySignup = () => {
    navigate("/Createaccount/faculty");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      alert("Failed to send password reset email. Please try again.");
    }
  };

  return (
    <>
      <div className="login-container">
        <div className="logo-section">
          <h1><span className="green">GREEN</span><span className="pulse">PULSE</span></h1>
        </div>
        <div className="login-section">
          <h2>LOGIN</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input 
                type={passwordVisible ? "text" : "password"} 
                id="password" 
                name="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <i 
                className={`fas ${passwordVisible ? "fa-eye" : "fa-eye-slash"} password-toggle`} 
                onClick={togglePasswordVisibility} 
              ></i>
            </div>
            <div className="remember-me">
              <input 
                type="checkbox" 
                id="stay-logged-in" 
                name="stay-logged-in" 
                checked={stayLoggedIn} 
                onChange={(e) => setStayLoggedIn(e.target.checked)} 
              />
              <label htmlFor="stay-logged-in">Stay logged in</label>
            </div>
            <button type="submit" className="login-btn">LOGIN</button>
            <div className="extra-links">
              <a href="#" onClick={() => openPopup("create-account-popup")}>Create Account</a>
              <a href="#" onClick={handleForgotPassword}>Forgot Password?</a>
              <a href="#" className="admin-login" onClick={() => openPopup("popup-overlay")}>Admin Log in</a>
            </div>
          </form>
        </div>
      </div>

      {/* Admin Login Popup */}
      <div id="popup-overlay" className="popup-overlay">
        <div className="popup">
          <button className="close-btn" onClick={() => closePopup("popup-overlay")}>×</button>
          <h3>Admin Log in</h3>
          <div className="input-group">
            <input type="text" placeholder="User ID" />
          </div>
          <div className="input-group">
            <input type="password" placeholder="Password" />
          </div>
          <button className="login-btn">Log in</button>
        </div>
      </div>

      {/* Create Account Popup */}
      <div id="create-account-popup" className="popup-overlay">
        <div className="popup">
          <button className="close-btn" onClick={() => closePopup("create-account-popup")}>×</button>
          <h3>Create Account</h3>
          <br />
          <div className="option-container">
            <div>
              <img src="https://cdn-icons-png.flaticon.com/512/4196/4196591.png" alt="Student Icon" />
              <button onClick={handleStudentSignup}>STUDENT</button>
            </div>
            <div>
              <img src="https://media.istockphoto.com/id/1455786460/vector/the-person-giving-the-lecture-speech-silhouette-icon-vector.jpg?s=612x612&w=0&k=20&c=FXJxAXD0XsfnLGQE5ssBnwZ3NbrsgyUXspbx_FkaQds=" alt="Faculty Icon" />
              <button onClick={handleFacultySignup}>FACULTY</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
