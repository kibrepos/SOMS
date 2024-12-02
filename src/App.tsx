import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import ProtectedOrgRoute from './components/ProtectedOrgRoute';
import StudentDashboard from './pages/Students/StudentDashboard';
import OrganizationDashboard from './pages/Students/OrganizationDashboard';
import OrganizationSettings from './pages/Students/OrganizationSettings';
import OrganizationActivityLogs from './pages/Students/OrganizationActivityLogs';
import ManageMembers from './pages/Students/ManageMembers';
import ManageCommittees from './pages/Students/ManageCommittees';
import CreateEvent from './pages/Students/CreateEvent';
import EventsManagement from './pages/Students/EventsManagement';
import EventsView from './pages/Students/EventsView';
import TaskManagement from './pages/Students/TaskManagement';
import MyTasks from './pages/Students/MyTasks';
import StudentProfile from './pages/Students/StudentProfile';
import FacultyDashboard from './pages/Faculty/FacultyDashboard';
import AdminDashboard from './pages/Admins/AdminDashboard';
import AdminSettings from './pages/Admins/AdminSettings';
import ActivityLogs from './pages/Admins/AdminActivityLogs';
import AdminManageStudent from './pages/Admins/AdminManageStudent';
import ManageOrganizations from './pages/Admins/AdminManageOrganzations';
import AdminCreateOrganization from './pages/Admins/AdminCreateOrganization';
import AdminAnnouncements from './pages/Admins/AdminAnnouncements';
import AdminViewOrganization from './pages/Admins/AdminViewOrganization';
import AdminEditOrganization from './pages/Admins/AdminEditOrganization';
import AdminFeedback from './pages/Admins/AdminFeedback';
import Login from './pages/Login';
import SignupStudent from './components/SignupStudent';
import SignupFaculty from './components/SignupFaculty';
import Messenger from './components/Messenger';
import OrganizationResources from './pages/Students/OrganizationResources';
import OrganizationAnnouncement from './pages/Students/OrganizationAnnouncement';


const App: React.FC = () => {
  return (
    <>
      <div id="toast-container" className="toast-container"></div>
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
         




            {/* Shared Organization Routes */}
            <Route element={<ProtectedOrgRoute />}>
            <Route path="/Organization/:organizationName/dashboard" element={<OrganizationDashboard />} />
            <Route path="/Organization/:organizationName/resources" element={<OrganizationResources />} />
            <Route path="/Organization/:organizationName/mytasks" element={<MyTasks />} />
            <Route path="/Organization/:organizationName/events" element={<EventsManagement />} />
            <Route path="/Organization/:organizationName/create-event" element={<CreateEvent />} />
            <Route path="/Organization/:organizationName/events/:eventName" element={<EventsView />} />
        
            
          </Route>
         {/* President Routes */}
          <Route element={<ProtectedOrgRoute requiredRole="president" />}>
          <Route path="/Organization/:organizationName/settings" element={<OrganizationSettings />} />
          <Route path="/Organization/:organizationName/manage-members" element={<ManageMembers />} />
          <Route path="/Organization/:organizationName/manage-committees" element={<ManageCommittees />} />
          <Route path="/Organization/:organizationName/Alltasks" element={<TaskManagement />} />
          <Route path="/Organization/:organizationName/activity-logs" element={<OrganizationActivityLogs />} />
          <Route  path="/Organization/:organizationName/announcements" element={<OrganizationAnnouncement />} />

          </Route>


          {/* Officer Routes */}
          <Route element={<ProtectedOrgRoute requiredRole="officer" />}>
          
         
          </Route>

          {/* Member Routes */}
          <Route element={<ProtectedOrgRoute requiredRole="member" />}>
         
          </Route>

          </Route>



          <Route element={<PrivateRoute requiredRole="faculty" />}>
          <Route path="/Faculty/dashboard" element={<FacultyDashboard />} />
          </Route>


          <Route element={<PrivateRoute requiredRole="admin" />}>
          <Route path="/Admin/dashboard" element={<AdminDashboard />} />
          <Route path="/Admin/Activity-Logs" element={<ActivityLogs />} />
          <Route path="/Admin/Manage-Students" element={<AdminManageStudent />} />
          <Route path="/Admin/Announcements" element={<AdminAnnouncements />} />
          <Route path="/Admin/Account-settings" element={<AdminSettings />} />
          <Route path="/Admin/ManageOrganizations" element={<ManageOrganizations />} />
          <Route path="/Admin/CreateOrganization" element={<AdminCreateOrganization />} />
          <Route path="/Admin/Organizations/:organizationName" element={<AdminViewOrganization />} /> 
          <Route path="/Admin/EditOrganization/:organizationName" element={<AdminEditOrganization />} />
          <Route path="/Admin/feedback-support" element={<AdminFeedback/>} />
         
          </Route>
        </Routes>
      </Router>
    </>
  );
};

/* 
//CODE FOR DELETION UNCOMMENTING THIS WILL CRASH THE PROGRAM
import express from 'express';
import { adminAuth } from './services/firebaseAdminConfig'; // Importing the adminAuth
import { adminFirestore } from './services/firebaseAdminConfig'; // Importing the adminFirestore

const app = express();
const port = 3001; // Your server port

app.use(express.json()); // For parsing JSON request bodies

// Deactivate user endpoint
app.post('/deactivate-user', async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).send('UID is required');
  }

  try {
    // Deactivate user in Firebase Authentication
    await adminAuth.updateUser(uid, { disabled: true });

    // Optionally: Update Firestore to reflect deactivation status
    const userDocRef = adminFirestore.collection('students').doc(uid);
    await userDocRef.update({
      isDeactivated: true,
      deactivatedAt: new Date(),
    });

    res.status(200).send({ message: `User with UID ${uid} has been deactivated.` });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).send({ message: 'Error deactivating user' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
*/


export default App;
