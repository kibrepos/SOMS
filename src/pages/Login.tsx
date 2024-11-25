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
  const [error, setError] = useState(""); // State for error message
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous error message
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Refresh user data to check email verification status
      await user.reload(); // Fetch the latest user data
  
      if (!user.emailVerified) {
        setError("Please verify your email before logging in.");
        return;
      }
  
      const adminDoc = await getDoc(doc(firestore, "admin", user.uid));
      const facultyDoc = await getDoc(doc(firestore, "faculty", user.uid));
      const studentDoc = await getDoc(doc(firestore, "students", user.uid));
  
      if (adminDoc.exists()) {
        navigate("/Admin/dashboard");
      } else if (facultyDoc.exists()) {
        navigate("/Faculty/dashboard");
      } else if (studentDoc.exists()) {
        navigate("/Student/dashboard");
      } else {
        setError("Your role could not be determined. Please contact support.");
      }
    } catch (error) {
      setError("Failed to log in. Please check your credentials and try again.");
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
      setError("Please enter your email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox.");
    } catch (error) {
      setError("Failed to send password reset email. Please try again.");
    }
  };

  return (
    <>
      <div className="login-container">
        <div className="logo-section">
          <h1><span className="green">GREEN</span><span className="pulse">PULSE</span></h1>
        </div>
        <div className="login-section">
        {error && <div className="errors">{error}</div>}
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
            </div>
          </form>
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
