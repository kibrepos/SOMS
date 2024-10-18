import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig'; // Assuming Firebase is configured here
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import '../../styles/ManageMembers.css';
import Header from '../../components/Header'; // Import your header
import StudentPresidentSidebar from './StudentPresidentSidebar'; // Import the sidebar

const ManageMembers: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [facultyAdviser, setFacultyAdviser] = useState<any>(null);
  const [president, setPresident] = useState<any>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Fetch organization data from Firestore
  useEffect(() => {
    const fetchOrganizationData = async () => {
      const orgDocRef = doc(firestore, 'organizations', 'College of Only Fans'); // Replace with your organization name
      const orgDoc = await getDoc(orgDocRef);

      if (orgDoc.exists()) {
        const data = orgDoc.data();
        setOrganizationData(data);
        setMembers(data.members || []);
        setOfficers(data.officers || []);
        setPresident(data.president || null);
        setFacultyAdviser(data.facultyAdviser || null);
      }
    };

    fetchOrganizationData();
  }, []);

  const handleInviteMember = async () => {
    if (newMemberEmail) {
      await addDoc(collection(firestore, 'organizations/College of Only Fans/members'), { email: newMemberEmail }); // Adjust the path as needed
      setNewMemberEmail('');
      alert('Member invited successfully!');
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to kick this member?')) {
      await deleteDoc(doc(firestore, 'organizations/College of Only Fans/members', memberId)); // Adjust the path as needed
      alert('Member kicked successfully!');
      setMembers(members.filter(member => member.id !== memberId)); // Update state
    }
  };

  return (
    <div className="manage-members-wrapp5er">
      <Header />
      <div className="dashboard-container">
        <div className="sidebar-section">
          <StudentPresidentSidebar /> {/* You can conditionally render different sidebars here */}
        </div>
        <div className="main-content">
          <h2>Manage Members</h2>

          {/* Faculty Adviser */}
          <h3>Faculty Adviser</h3>
          {facultyAdviser ? (
            <div className="member-item">
              <img src={facultyAdviser.profilePicUrl || ''} alt="Faculty Adviser" className="member-profile-pic" />
              <p>{facultyAdviser.name}</p>
            </div>
          ) : (
            <p>No faculty adviser assigned.</p>
          )}

          {/* President */}
          <h3>President</h3>
          {president ? (
            <div className="member-item">
              <img src={president.profilePicUrl || ''} alt="President" className="member-profile-pic" />
              <p>{president.name}</p>
            </div>
          ) : (
            <p>No president assigned.</p>
          )}

          {/* Officers */}
          <h3>Officers</h3>
          {officers.length > 0 ? (
            officers.map(officer => (
              <div key={officer.id} className="member-item">
                <img src={officer.profilePicUrl || ''} alt="Officer" className="member-profile-pic" />
                <p>{officer.student}</p>
                <button onClick={() => handleKickMember(officer.id)} className="kick-btn">Kick</button>
              </div>
            ))
          ) : (
            <p>No officers assigned.</p>
          )}

          {/* Members */}
          <h3>Members</h3>
          {members.length > 0 ? (
            members.map(member => (
              <div key={member.id} className="member-item">
                <img src={member.profilePicUrl || ''} alt="Member" className="member-profile-pic" />
                <p>{member.name}</p>
                <button onClick={() => handleKickMember(member.id)} className="kick-btn">Kick</button>
              </div>
            ))
          ) : (
            <p>No members assigned.</p>
          )}

          {/* Invite Member Section */}
          <div className="invite-section">
            <input
              type="email"
              placeholder="Invite member by email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="invite-input"
            />
            <button className="invite-btn" onClick={handleInviteMember}>Invite Member</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageMembers;
