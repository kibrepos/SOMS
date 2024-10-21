import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header'; 
import StudentPresidentSidebar from './StudentPresidentSidebar'; 
import '../../styles/ManageCommittees.css'; 
const ManageCommittees: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();

  return (
    <div className="MC-dashboard">
      <Header />
      <div className="MC-container">
        <div className="MC-sidebar-section">
          <StudentPresidentSidebar />
        </div>
        <div className="MC-main-content">
          <h2>Manage Committees</h2>
          <p>Here you can view, create, and manage committees for {organizationName}.</p>
          {/* Committees Table or List will go here */}
        </div>
      </div>
    </div>
  );
};

export default ManageCommittees;
