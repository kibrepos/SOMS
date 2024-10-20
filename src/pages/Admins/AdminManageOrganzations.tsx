import React, { useState, useEffect } from "react";
import { auth } from "../../services/firebaseConfig"; 
import { firestore } from "../../services/firebaseConfig";
import { collection, getDocs, updateDoc, deleteDoc, doc,Timestamp,addDoc,getDoc  } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import '../../styles/AdminManageOrganizations.css';
import AdminSidebar from './AdminSidebar';

interface Organization {
  id: string;
  name: string;
  description: string;
  facultyAdviser: { id: string; name: string };
  president: { id: string; name: string };
  status: string; 
}


const AdminManageOrganizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizations, setActiveOrganizations] = useState<Organization[]>([]);
  const [archivedOrganizations, setArchivedOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // Toggle between 'active' and 'archived'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [organizationToModify, setOrganizationToModify] = useState<Organization | null>(null);
  const [actionType, setActionType] = useState<string>(''); // 'delete', 'archive', 'unarchive'
  const navigate = useNavigate();

  const logActivity = async (activity: string) => {
    const admin = auth.currentUser;
    if (!admin) return;
  
    try {
      const adminDoc = await getDoc(doc(firestore, "admin", admin.uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        const adminName = `${data.firstname} ${data.lastname}`;
  
        await addDoc(collection(firestore, "logs"), {
          activity,
          userName: adminName,
          timestamp: Timestamp.now(),
          role: data.role || "admin",
        });
      }
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };
  const fetchOrganizations = async () => {
    setLoading(true);
    const orgCollection = collection(firestore, "organizations");
    const orgSnapshot = await getDocs(orgCollection);
    const orgList = orgSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Organization[];
  
    // Filter active and archived organizations
    setActiveOrganizations(orgList.filter((org) => org.status === 'active'));
    setArchivedOrganizations(orgList.filter((org) => org.status === 'archived'));
  
    setLoading(false);
  };
  

  // Archive an organization
  const archiveOrganization = async () => {
    if (!organizationToModify) return;
    const orgDoc = doc(firestore, "organizations", organizationToModify.id);
    await updateDoc(orgDoc, { status: "archived" });
    await logActivity(`Archived organization "${organizationToModify.name}".`);
    fetchOrganizations(); // Refresh the list after archiving
    closeModal(); // Close the modal after action
  };

  // Unarchive an organization
  const unarchiveOrganization = async () => {
    if (!organizationToModify) return;
    const orgDoc = doc(firestore, "organizations", organizationToModify.id);
    await updateDoc(orgDoc, { status: "active" });
    await logActivity(`Unarchived organization "${organizationToModify.name}".`);
    fetchOrganizations(); // Refresh the list after unarchiving
    closeModal(); // Close the modal after action
  };

  // Delete an organization
  const deleteOrganization = async () => {
    if (!organizationToModify) return;
    try {
      const orgDoc = doc(firestore, "organizations", organizationToModify.id);
      await deleteDoc(orgDoc); 
      await logActivity(`Deleted organization "${organizationToModify.name}".`);
      fetchOrganizations(); // Refresh the list after deletion
      closeModal(); // Close the modal after action
    } catch (error) {
      console.error("Error deleting organization:", error);
    }
  };

  // Open modal and set the organization and action to be performed
  const confirmAction = (organization: Organization, type: 'delete' | 'archive' | 'unarchive') => {
    setOrganizationToModify(organization);
    setActionType(type);
    setShowConfirmModal(true);
  };

  // Close the modal
  const closeModal = () => {
    setShowConfirmModal(false);
    setShowArchiveModal(false);
    setOrganizationToModify(null);
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
  
          <div className="MO-organization-header">
            {/* Create New Organization Button */}
            <button onClick={handleCreateOrganization} className="MO-create-btn">Create New Organization</button>
  
            {/* Tabs for Active and Archived Organizations */}
            <div className="MO-tabs">
              <button
                className={activeTab === 'active' ? 'MO-tab MO-active' : 'MO-tab'}
                onClick={() => setActiveTab('active')}
              >
                Active
              </button>
              <button
                className={activeTab === 'archived' ? 'MO-tab MO-active' : 'MO-tab'}
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
              <table className="MO-organization-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Faculty Adviser</th>
                    <th>President</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                {activeOrganizations.map((org) => (
    <tr key={org.id}>
      <td>{org.name}</td>
      <td>{org.description}</td>
      <td>{org.facultyAdviser ? org.facultyAdviser.name : "Not Assigned"}</td>
      <td>{org.president ? org.president.name : "Not Assigned"}</td>
      <td>
        <button onClick={() => handleViewOrganization(org.name)} className="MO-view-btn">View</button>
        <button onClick={() => confirmAction(org, 'archive')} className="MO-archive-btn">Archive</button>
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </>
          ) : (
            // Archived Organizations Table
            <>
              <table className="MO-organization-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Faculty Adviser</th>
                    <th>President</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
  {archivedOrganizations.map((org) => (
    <tr key={org.id}>
      <td>{org.name}</td>
      <td>{org.description}</td>
      <td>{org.facultyAdviser ? org.facultyAdviser.name : "Not Assigned"}</td>
      <td>{org.president ? org.president.name : "Not Assigned"}</td>
      <td>
        <button onClick={() => handleViewOrganization(org.name)} className="MO-view-btn">View</button>
        <button onClick={() => confirmAction(org, 'unarchive')} className="MO-unarchive-btn">Unarchive</button>
        <button onClick={() => confirmAction(org, 'delete')} className="MO-delete-btn">Delete</button>
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </>
          )}
  
          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="MO-modal-overlay">
              <div className="MO-modal">
                <h3>Are you sure you want to {actionType === 'delete' ? 'delete' : actionType === 'archive' ? 'archive' : 'unarchive'} this organization?</h3>
                <p>This action cannot be undone.</p>
                <button
                  onClick={
                    actionType === 'delete'
                      ? deleteOrganization
                      : actionType === 'archive'
                      ? archiveOrganization
                      : unarchiveOrganization
                  }
                  className="MO-confirm-button"
                >
                  Yes, {actionType === 'delete' ? 'Delete' : actionType === 'archive' ? 'Archive' : 'Unarchive'}
                </button>
                <button onClick={closeModal} className="MO-cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
};

export default AdminManageOrganizations;
