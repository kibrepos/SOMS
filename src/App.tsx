// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import StudentDashboard from './pages/Students/StudentDashboard';
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import Login from './pages/Login';
import SignupStudent from './components/SignupStudent';
import SignupFaculty from './components/SignupFaculty';
import StudentProfile from './pages/Students/StudentProfile';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Redirect root path to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes */}
     
          <Route path="/login" element={<Login />} />
          <Route path="/Createaccount/student" element={<SignupStudent />} />
          <Route path="/Createaccount/faculty" element={<SignupFaculty />} />
      

        {/* Private Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/Student/dashboard" element={<StudentDashboard />} />
          <Route path="/Faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="/Student/myprofile" element={<StudentProfile />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
