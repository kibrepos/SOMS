import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from './AdminSidebar';
import '../../styles/AdminViewOrganization.css';

interface Organization {
  name: string;
  description: string;
  facultyAdviser: string;
  status: string;
  members: string[];
  head: string;
}

const AdminViewOrganization: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>(); // Ensure it's of type string
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrganization = async () => {
    // Ensure organizationName exists
    if (!organizationName) {
      console.error("Organization name is undefined");
      navigate("/Admin/ManageOrganizations"); // Redirect if organizationName is undefined
      return;
    }

    setLoading(true);
    const orgDoc = doc(firestore, "organizations", organizationName); // Use organizationName after the check
    const orgSnapshot = await getDoc(orgDoc);

    if (orgSnapshot.exists()) {
      setOrganization(orgSnapshot.data() as Organization);
    } else {
      console.error("Organization does not exist");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrganization();
  }, [organizationName]);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-main">
        <AdminSidebar />
        <div className="admin-dashboard-content">
          {loading ? (
            <p>Loading organization details...</p>
          ) : (
            <>
              <h2>{organization?.name}</h2>
              <p>Description: {organization?.description}</p>
              <p>Status: {organization?.status}</p>
              <p>Head: {organization?.head || "Not Assigned"}</p>
              <p>Faculty Adviser: {organization?.facultyAdviser || "Not Assigned"}</p>

              <h3>Members</h3>
              <ul>
                {organization?.members.map((member) => (
                  <li key={member}>{member}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminViewOrganization;
