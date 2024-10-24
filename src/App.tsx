import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import StudentDashboard from './pages/Students/StudentDashboard';
import OrganizationDashboard from './pages/Students/OrganizationDashboard';
import OrganizationSettings from './pages/Students/OrganizationSettings';
import ManageMembers from './pages/Students/ManageMembers';
import ManageCommittees from './pages/Students/ManageCommittees';
import TaskManagement from './pages/Students/TaskManagement';
import StudentProfile from './pages/Students/StudentProfile';
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import AdminDashboard from './pages/Admins/AdminDashboard';
import AdminSettings from './pages/Admins/AdminSettings';
import ActivityLogs from './pages/Admins/AdminActivityLogs';
import AdminManageStudent from './pages/Admins/AdminManageStudent';
import ManageOrganizations from './pages/Admins/AdminManageOrganzations';
import AdminCreateOrganization from './pages/Admins/AdminCreateOrganization';
import AdminViewOrganization from './pages/Admins/AdminViewOrganization';
import AdminEditOrganization from './pages/Admins/AdminEditOrganization';
import Login from './pages/Login';
import SignupStudent from './components/SignupStudent';
import SignupFaculty from './components/SignupFaculty';
import Messenger from './components/Messenger';
import ChatApp from './components/chat/ChatApp';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Redirect root path to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/Createaccount/student" element={<SignupStudent />} />
          <Route path="/Createaccount/faculty" element={<SignupFaculty />} />
          </Route>

        {/* Private Routes */}
        <Route element={<PrivateRoute requiredRole="student" />}>
          <Route path="/Student/dashboard" element={<StudentDashboard />} />
          <Route path="/Student/myprofile" element={<StudentProfile />} />
          <Route path="/messages" element={<Messenger />} />
          <Route path="/ChatApp" element={<ChatApp />} />
          <Route path="/Organization/:organizationName/dashboard" element={<OrganizationDashboard />} />
          <Route path="/Organization/:organizationName/settings" element={<OrganizationSettings />} />
          <Route path="/Organization/:organizationName/manage-members" element={<ManageMembers />} />
          <Route path="/Organization/:organizationName/manage-committees" element={<ManageCommittees />} />
          <Route path="/Organization/:organizationName/Alltasks" element={<TaskManagement />} />

         
          </Route>




          <Route element={<PrivateRoute requiredRole="faculty" />}>
          <Route path="/Faculty/dashboard" element={<FacultyDashboard />} />
          </Route>


          <Route element={<PrivateRoute requiredRole="admin" />}>
          <Route path="/Admin/dashboard" element={<AdminDashboard />} />
          <Route path="/Admin/Activity-Logs" element={<ActivityLogs />} />
          <Route path="/Admin/Manage-Students" element={<AdminManageStudent />} />
          <Route path="/Admin/Account-settings" element={<AdminSettings />} />
          <Route path="/Admin/ManageOrganizations" element={<ManageOrganizations />} />
          <Route path="/Admin/CreateOrganization" element={<AdminCreateOrganization />} />
          <Route path="/Admin/Organizations/:organizationName" element={<AdminViewOrganization />} /> 
          <Route path="/Admin/EditOrganization/:organizationName" element={<AdminEditOrganization />} />
          </Route>
      </Routes>
    </Router>
  );
};

export default App;
