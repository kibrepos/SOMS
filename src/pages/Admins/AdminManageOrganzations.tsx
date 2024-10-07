import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import '../../styles/AdminManageOrganizations.css';
import AdminSidebar from './AdminSidebar';

interface Organization {
  id: string;
  name: string;
  description: string;
  facultyAdviser: string;
  status: string; // 'active' or 'archived'
}

const AdminManageOrganizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizations, setActiveOrganizations] = useState<Organization[]>([]);
  const [archivedOrganizations, setArchivedOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // Toggle between 'active' and 'archived'
  const navigate = useNavigate();

  // Fetch organizations from Firestore
  const fetchOrganizations = async () => {
    setLoading(true);
    const orgCollection = collection(firestore, "organizations");
    const orgSnapshot = await getDocs(orgCollection);
    const orgList = orgSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Organization[];

    // Filter active and archived organizations
    setActiveOrganizations(orgList.filter(org => org.status === 'active'));
    setArchivedOrganizations(orgList.filter(org => org.status === 'archived'));

    setLoading(false);
  };

  // Archive an organization
  const archiveOrganization = async (id: string) => {
    const orgDoc = doc(firestore, "organizations", id);
    await updateDoc(orgDoc, { status: "archived" });
    fetchOrganizations(); // Refresh the list after archiving
  };

  // Navigate to view organization page
  const handleViewOrganization = (organizationName: string) => {
    navigate(`/Admin/Organizations/${organizationName}`);
  };

  // Navigate to create new organization page
  const handleCreateOrganization = () => {
    navigate("/Admin/CreateOrganization");
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-main">
        <AdminSidebar />
        <div className="admin-dashboard-content">
          <h2>Manage Organizations</h2>

          <div className="organization-header">
            {/* Create New Organization Button */}
            <button onClick={handleCreateOrganization} className="create-btn">Create New Organization</button>

            {/* Tabs for Active and Archived Organizations */}
            <div className="tabs">
              <button
                className={activeTab === 'active' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('active')}
              >
                Active
              </button>
              <button
                className={activeTab === 'archived' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('archived')}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Active Organizations Table */}
          {loading ? (
            <p>Loading organizations...</p>
          ) : activeTab === 'active' ? (
            <>
              <table className="organization-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Faculty Adviser</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrganizations.map((org) => (
                    <tr key={org.id}>
                      <td>{org.name}</td>
                      <td>{org.description}</td>
                      <td>{org.facultyAdviser ? org.facultyAdviser : "Not Assigned"}</td>
                      <td>{org.status}</td>
                      <td>
                        <button onClick={() => handleViewOrganization(org.name)} className="view-btn">View</button>
                        <button onClick={() => archiveOrganization(org.id)} className="archive-btn">Archive</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            // Archived Organizations Table
            <>
              <table className="organization-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Faculty Adviser</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedOrganizations.map((org) => (
                    <tr key={org.id}>
                      <td>{org.name}</td>
                      <td>{org.description}</td>
                      <td>{org.facultyAdviser ? org.facultyAdviser : "Not Assigned"}</td>
                      <td>{org.status}</td>
                      <td>
                        <button onClick={() => handleViewOrganization(org.name)} className="view-btn">View</button>
                        <button onClick={() => archiveOrganization(org.id)} className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminManageOrganizations;
