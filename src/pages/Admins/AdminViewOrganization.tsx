import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from './AdminSidebar';
import '../../styles/AdminViewOrganization.css';

interface Officer {
  role: string;
  student: string;
  name: string;
}

interface Organization {
  name: string;
  description: string;
  facultyAdviser: { id: string; name: string };
  status: string;
  members: { id: string; name: string }[];
  officers: Officer[];
  president: { id: string; name: string };
}


const AdminViewOrganization: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>(); 
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrganization = async () => {
    if (!organizationName) {
      console.error("Organization name is undefined");
      navigate("/Admin/ManageOrganizations");
      return;
    }

    setLoading(true);
    const orgDoc = doc(firestore, "organizations", organizationName);
    const orgSnapshot = await getDoc(orgDoc);

    if (orgSnapshot.exists()) {
      setOrganization(orgSnapshot.data() as Organization);
    } else {
      console.error("Organization does not exist");
    }
    setLoading(false);
  };

  // Navigate to the Edit Organization page
  const handleEditOrganization = () => {
    navigate(`/Admin/EditOrganization/${organizationName}`);
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
              <p>President: {organization?.president?.name}</p>
              <p>Faculty Adviser: {organization?.facultyAdviser?.name }</p>



              {/* Officers Section */}
              <h3>Officers</h3>
              {organization?.officers && organization.officers.length > 0 ? (
              <ul>
                {organization.officers.map((officer, index) => (
              <li key={index}>
               {officer.name} - {officer.role}
           </li>
         ))}
       </ul>
) : (
  <p>No officers assigned.</p>
)}


              
              <h3>Members</h3>
              <ul>
  {organization?.members.map((member) => (
    <li key={member.id}>{member.name}</li>
  ))}
          </ul>


              

              {/* Edit Organization Button */}
              <button onClick={handleEditOrganization} className="edit-button">
                Edit Organization
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminViewOrganization;
