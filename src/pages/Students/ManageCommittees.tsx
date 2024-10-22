import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import '../../styles/ManageCommittees.css';

interface Member {
  id: string;
  name: string;
  email: string;
  profilePicUrl?: string;
}

interface Officer {
  id: string;
  name: string;
  email: string;
  profilePicUrl?: string;
  role: string;
}

interface Committee {
  id: string;
  name: string;
  head: Officer;
  members: Member[];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Toggle dropdown on click
  const toggleDropdown = (id: string) => {
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };
  
  useEffect(() => {
    
    const fetchOrganizationData = async () => {
      const orgDoc = await getDoc(doc(firestore, 'organizations', 'Bruno Mars'));

      if (orgDoc.exists()) {
        const data = orgDoc.data();

        const officers = [
          ...(data.president ? [data.president] : []),
          ...(Array.isArray(data.officers) ? data.officers : []),
        ];

        setAvailableOfficers(officers);
        const allMembers = [...(data.members || []), ...officers];
        setAvailableMembers(allMembers);
        setCommittees(data.committees || []);
      }
    };

    fetchOrganizationData();
  }, [selectedHead]);

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
      const orgDocRef = doc(firestore, 'organizations', 'Bruno Mars');
      await updateDoc(orgDocRef, {
        committees: arrayUnion(newCommittee),
      });

      setCommittees((prev) => [...prev, newCommittee]);
      closeCreateCommitteeModal();
      alert('Committee created successfully!');
    } catch (error) {
      console.error('Error creating committee:', error);
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
      const orgDocRef = doc(firestore, 'organizations', 'Bruno Mars');
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
  
  // Open the Delete Confirmation Modal
  const openDeleteModal = (committee: Committee) => {
    setSelectedCommittee(committee);
    setIsDeleteModalOpen(true);
  };
  
  // Handle Deletion of the Committee
  const handleDeleteCommittee = async () => {
    if (!selectedCommittee) return;
  
    try {
      const orgDocRef = doc(firestore, 'organizations', 'Bruno Mars');
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
          <StudentPresidentSidebar />
        </div>
        <div className="MC-main-content">
          <div className="MC-header-actions">
            <h2>Manage Committees</h2>
            
            <button className="MC-add-committee-btn" onClick={openCreateCommitteeModal}>
              Create New Committee
            </button>
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

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isCreateCommitteeModalOpen && (
            <div className="MC-modal-overlay">
              <div className="MC-modal-content">
                <h3>Create New Committee</h3>
                <input
                  type="text"
                  placeholder="Committee Name"
                  value={newCommitteeName}
                  onChange={(e) => setNewCommitteeName(e.target.value)}
                />
                <div>
                  <button onClick={openHeadModal}>
                    {selectedHead ? `Head: ${selectedHead.name}` : 'Select Head (Officer)'}
                  </button>
                </div>
                <div>
                  <button onClick={openMemberModal}>Select Members</button>
                </div>
                <div>
                  <button onClick={handleCreateCommittee}>Create</button>
                  <button onClick={closeCreateCommitteeModal}>Cancel</button>
                </div>
              </div>
            </div>
          )}
{isEditModalOpen && selectedCommittee && (
  <div className="MC-modal-overlay">
    <div className="MC-modal-content">
      <h3>Edit Committee</h3>
      <input
        type="text"
        value={newCommitteeName}
        onChange={(e) => setNewCommitteeName(e.target.value)}
        placeholder="Committee Name"
      />
      <button onClick={openHeadModal}>
        {selectedHead ? `Head: ${selectedHead.name}` : 'Select Head'}
      </button>
      <button onClick={openMemberModal}>Select Members</button>
      <div>
        <button onClick={handleEditCommittee}>Save</button>
        <button onClick={closeEditModal}>Cancel</button>
      </div>
    </div>
  </div>
)}

{isDeleteModalOpen && selectedCommittee && (
  <div className="MC-modal-overlay">
    <div className="MC-modal-content">
      <h3>Are you sure you want to delete "{selectedCommittee.name}"?</h3>
      <div>
        <button onClick={handleDeleteCommittee}>Yes</button>
        <button onClick={closeDeleteModal}>No</button>
      </div>
    </div>
  </div>
)}
          {isHeadModalOpen && (
            <div className="MC-modal-overlay">
              <div className="MC-modal-content">
                <h3>Select Head (Officer)</h3>
                <input
                  type="text"
                  placeholder="Search Officers"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <ul>
                  {availableOfficers
                    .filter((officer) =>
                      officer.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((officer) => (
                      <li
                        key={officer.id}
                        onClick={() => {
                          setSelectedHead(officer);
                          closeHeadModal();
                        }}
                      >
                        {officer.name}
                      </li>
                    ))}
                </ul>
                <button onClick={closeHeadModal}>Close</button>
              </div>
            </div>
          )}

          {isMemberModalOpen && (
            <div className="MC-modal-overlay">
              <div className="MC-modal-content">
                <h3>Select Members</h3>
                <input
                  type="text"
                  placeholder="Search Members"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <ul>
  {availableMembers
    .filter(
      (member) =>
        !selectedHead || member.id !== selectedHead.id // Exclude selected head
    )
    .filter((member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map((member) => (
      <li key={member.id}>
        <input
          type="checkbox"
          checked={selectedMembers.some((m) => m.id === member.id)}
          onChange={() => toggleMemberSelection(member)}
        />
        {member.name}
      </li>
    ))}
</ul>

                <button onClick={closeMemberModal}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCommittees;
