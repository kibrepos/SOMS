import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firestore,auth } from '../../services/firebaseConfig';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import StudentMemberSidebar from "./StudentMemberSidebar";
import '../../styles/ManageCommittees.css';
import { useParams } from 'react-router-dom';

interface Committee {
  id: string;
  name: string;
  head: Officer;
  members: Member[];
}
// Define the structure for a student or member
interface Member {
  email: string;
  id: string;
  name: string;
  profilePicUrl: string | null; // It can be null
}

// Define the structure for an officer
interface Officer {
  email: string;
  id: string;
  name: string;
  profilePicUrl: string | null; // It can be null
  role: string;
}

// Define the structure for the faculty adviser
interface FacultyAdviser {
  email: string;
  id: string;
  name: string;
  profilePicUrl: string | null; // It can be null
}

// Define the structure for the president
interface President {
  email: string;
  id: string;
  name: string;
  profilePicUrl: string | null; // It can be null
}

// Define the structure for the organization
interface Organization {
  coverImagePath: string; // URL to the cover image
  description: string;     // Description of the organization
  facultyAdviser: FacultyAdviser; // Faculty adviser details
  id: string;             // Unique identifier for the organization
  name: string;           // Name of the organization
  invitedStudents: string[]; // Array of invited student IDs
  members: Member[];      // Array of members
  officers: Officer[];    // Array of officers
  president: President;   
  committees: Committee[];
}

const ManageCommittees: React.FC = () => {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [availableOfficers, setAvailableOfficers] = useState<Officer[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [isCreateCommitteeModalOpen, setIsCreateCommitteeModalOpen] = useState(false);
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedHead, setSelectedHead] = useState<Officer | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [newCommitteeName, setNewCommitteeName] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organizationData, setOrganizationData] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    const fetchRole = async () => {
      if (!organizationName) return;
  
      try {
        const orgDocRef = doc(firestore, 'organizations', organizationName);
        const orgDoc = await getDoc(orgDocRef);
  
        if (orgDoc.exists()) {
          const orgData = orgDoc.data();
          const userId = auth.currentUser?.uid;
  
          if (orgData.president?.id === userId) {
            setRole('president');
          } else if (orgData.officers.some((officer: any) => officer.id === userId)) {
            setRole('officer');
          } else if (orgData.members.some((member: any) => member.id === userId)) {
            setRole('member');
          } else {
            setRole('guest');
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
  
    fetchRole();
  }, [organizationName]);
  const renderSidebar = () => {
    switch (role) {
      case 'president':
        return <StudentPresidentSidebar />;
      case 'officer':
        return <StudentPresidentSidebar  />;
      case 'member':
        return <StudentMemberSidebar />;
      default:
        return null; // No sidebar for guests
    }
  };
  const toggleDropdown = (id: string) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };
  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!organizationName) return;
    
      try {
        const orgDoc = await getDoc(doc(firestore, 'organizations', organizationName));
        if (orgDoc.exists()) {
          const data = orgDoc.data() as Organization;
          setOrganizationData(data);
    
          // Fetch and set officers
          const officers: Officer[] = data.officers.map(officer => ({
            id: officer.id,
            name: officer.name,
            email: officer.email,
            profilePicUrl: officer.profilePicUrl,
            role: officer.role,
          }));
          setAvailableOfficers(officers);
    
          // Fetch and set members
          const members: Member[] = data.members.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            profilePicUrl: member.profilePicUrl,
          }));
          setAvailableMembers(members);
    
          // Fetch and set committees
          if (data.committees) {
            setCommittees(data.committees.map((committee: any) => ({
              id: committee.id,
              name: committee.name,
              head: committee.head,
              members: committee.members,
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching organization data:', error);
      } finally {
        setLoading(false);
      }
    };
    
  
    fetchOrganizationData();
  }, [organizationName]);
  
  const handleCreateCommittee = async () => {
    if (!newCommitteeName || !selectedHead || selectedMembers.length < 1) {
        alert('Please provide all details and select at least one member.');
        return;
    }

    const newCommittee: Committee = {
        id: Date.now().toString(),
        name: newCommitteeName,
        head: selectedHead,
        members: selectedMembers,
    };

    try {
        const orgDocRef = doc(firestore, 'organizations', organizationName!);
        await updateDoc(orgDocRef, {
            committees: arrayUnion(newCommittee),
        });

        setCommittees((prev) => [...prev, newCommittee]); // Only if Firestore update is successful
        closeCreateCommitteeModal();
        alert('Committee created successfully!');
    } catch (error) {
        console.error('Failed to create the committee:', error); // Log the error for debugging
        alert('Failed to create the committee. Please try again.');
    }
};

  

  const toggleMemberSelection = (member: Member) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    );
  };

  const openCreateCommitteeModal = () => setIsCreateCommitteeModalOpen(true);
  const closeCreateCommitteeModal = () => setIsCreateCommitteeModalOpen(false);
  const openHeadModal = () => setIsHeadModalOpen(true);
  const closeHeadModal = () => setIsHeadModalOpen(false);
  const openMemberModal = () => setIsMemberModalOpen(true);
  const closeMemberModal = () => setIsMemberModalOpen(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);

  const openEditModal = (committee: Committee) => {
    setSelectedCommittee(committee);
    setSelectedHead(committee.head); // Prepopulate with current head
    setSelectedMembers(committee.members); // Prepopulate members
    setNewCommitteeName(committee.name); // Prepopulate name
    setIsEditModalOpen(true);
  };

  const handleEditCommittee = async () => {
    if (!selectedCommittee) return;

    const updatedCommittee: Committee = {
      ...selectedCommittee,
      name: newCommitteeName,
      head: selectedHead!,
      members: selectedMembers,
    };

    try {
      const orgDocRef = doc(firestore, 'organizations', organizationName!);
      const updatedCommittees = committees.map((c) =>
        c.id === selectedCommittee.id ? updatedCommittee : c
      );

      await updateDoc(orgDocRef, { committees: updatedCommittees });
      setCommittees(updatedCommittees);
      closeEditModal();
      alert('Committee updated successfully!');
    } catch (error) {
      console.error('Error updating committee:', error);
      alert('Failed to update the committee.');
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedCommittee(null);
  };

  const openDeleteModal = (committee: Committee) => {
    setSelectedCommittee(committee);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCommittee = async () => {
    if (!selectedCommittee) return;

    try {
      const orgDocRef = doc(firestore, 'organizations', organizationName!);
      const updatedCommittees = committees.filter(
        (c) => c.id !== selectedCommittee.id
      );

      await updateDoc(orgDocRef, { committees: updatedCommittees });
      setCommittees(updatedCommittees);
      closeDeleteModal();
      alert('Committee deleted successfully!');
    } catch (error) {
      console.error('Error deleting committee:', error);
      alert('Failed to delete the committee.');
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedCommittee(null);
  };

  return (
    <div className="MC-dashboard">
      <Header />
      <div className="MC-container">
        <div className="MC-sidebar-section">
        {renderSidebar()}
        </div>
        <div className="MC-main-content">
        <div className="header-container">
        <h1 className="headtitle">Manage Committees</h1>
        {(role === 'president' || role === 'officer') && (
        <button className="create-new-btn" onClick={openCreateCommitteeModal}>
          Create New Committee
        </button>
      )}
          </div>

          <div className="MC-table-wrapper">
            <h3>Committees</h3>
            <table className="MC-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Head (Officer)</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {committees.map((committee) => (
                  <tr key={committee.id}>
                    <td>{committee.name}</td>
                    <td>{committee.head.name}</td>
                    <td>{committee.members.map((m) => m.name).join(', ')}</td>
                    <td>
                      <div className="MC-dropdown">
                        <button
                          className="MC-action-btn"
                          onClick={() => toggleDropdown(committee.id)}
                        >
                          Action
                        </button>
                        {openDropdownId === committee.id && (
                          <div className="MC-dropdown-content">
                            <button onClick={() => openEditModal(committee)}>Edit</button>
                            <button onClick={() => openDeleteModal(committee)}>Delete</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

       {/* Create Committee Modal */}
{isCreateCommitteeModalOpen && (role === 'president' || role === 'officer') && (
  <div className="custom-modal-overlay">
    <div className="custom-modal-content create-committee-modal">
      <button className="modal-close-btn" onClick={closeCreateCommitteeModal}>×</button>
      <h3 className="modal-title">Create New Committee</h3>
      <input
        type="text"
        placeholder="Committee Name"
        value={newCommitteeName}
        onChange={(e) => setNewCommitteeName(e.target.value)}
        className="input-field"
      />
      <div className="modal-action">
        <button onClick={openHeadModal} className="action-btn">Select Head</button>
        <p className="selected-info">Selected Head: {selectedHead ? selectedHead.name : 'None'}</p>
      </div>
      <div className="modal-action">
        <button onClick={openMemberModal} className="action-btn">Select Members</button>
        <p className="selected-info">Selected Members: {selectedMembers.map((m) => m.name).join(', ')}</p>
      </div>
      <div className="modal-footer">
        <button className="btn-primary" onClick={handleCreateCommittee}>Create Committee</button>
      </div>
    </div>
  </div>
)}

{/* Select Head Modal */}
{isHeadModalOpen && (
  <div className="custom-modal-overlay">
    <div className="custom-modal-content select-head-modal">
      <button className="modal-close-btn" onClick={closeHeadModal}>×</button>
      <h3 className="modal-title">Select Committee Head</h3>
      <div className="officer-list">
        {availableOfficers.map((officer) => (
          <div
            key={officer.id}
            onClick={() => { setSelectedHead(officer); closeHeadModal(); }}
            className="officer-item"
          >
            <img src={officer.profilePicUrl || 'default-pic.png'} alt={officer.name} />
            <p>{officer.name}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{/* Select Members Modal */}
{isMemberModalOpen && (
  <div className="custom-modal-overlay">
    <div className="custom-modal-content select-members-modal">
      <button className="modal-close-btn" onClick={closeMemberModal}>×</button>
      <h3 className="modal-title">Select Committee Members</h3>
      <div className="member-list">
        {availableMembers.map((member) => (
          <div
            key={member.id}
            onClick={() => toggleMemberSelection(member)}
            className="member-item"
          >
            <img src={member.profilePicUrl || 'default-pic.png'} alt={member.name} />
            <p>{member.name}</p>
            {selectedMembers.some((m) => m.id === member.id) && <span className="selected-tag">Selected</span>}
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{/* Edit Committee Modal */}
{isEditModalOpen && (
  <div className="custom-modal-overlay">
    <div className="custom-modal-content edit-committee-modal">
      <button className="modal-close-btn" onClick={closeEditModal}>×</button>
      <h3 className="modal-title">Edit Committee</h3>
      <input
        type="text"
        placeholder="Committee Name"
        value={newCommitteeName}
        onChange={(e) => setNewCommitteeName(e.target.value)}
        className="input-field"
      />
      <div className="modal-action">
        <button onClick={openHeadModal} className="action-btn">Select Head</button>
        <p className="selected-info">Selected Head: {selectedHead ? selectedHead.name : 'None'}</p>
      </div>
      <div className="modal-action">
        <button onClick={openMemberModal} className="action-btn">Select Members</button>
        <p className="selected-info">Selected Members: {selectedMembers.map((m) => m.name).join(', ')}</p>
      </div>
      <div className="modal-footer">
        <button className="btn-primary" onClick={handleEditCommittee}>Update Committee</button>
      </div>
    </div>
  </div>
)}


          {/* Delete Committee Modal */}
          {isDeleteModalOpen && (
            <div className="MC-modal-overlay">
              <div className="MC-modal-content">
                <h3>Are you sure you want to delete the committee "{selectedCommittee?.name}"?</h3>
                <button onClick={handleDeleteCommittee}>Delete</button>
                <button onClick={closeDeleteModal}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCommittees;
