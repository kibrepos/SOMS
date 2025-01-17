import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc,getDocs,updateDoc,collection,setDoc,arrayUnion,addDoc  } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import Header from '../../components/Header'; 
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import '../../styles/ManageMembers.css'; 

interface Member {
  id: string;
  name: string;
  profilePicUrl?: string;
  email?: string;
}

interface Officer {
  id: string;
  name: string;
  role: string;
  profilePicUrl?: string;
  email?: string;
}

interface FacultyAdviser {
  id: string;
  name: string;
  profilePicUrl?: string;
  email?: string;
}

interface Organization {
  facultyAdviser: FacultyAdviser;
  president: Officer;
  officers: Officer[];
  members: Member[];
}

const ManageMembers: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [organizationData, setOrganizationData] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const goToManageCommittees = () => {
    navigate(`/Organization/${organizationName}/manage-committees`);
  };
  const [isKickModalOpen, setKickModalOpen] = useState(false);
const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
const [availableRoles, setAvailableRoles] = useState<string[]>([]);
const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false); // Manage promote modal state
const [selectedMember, setSelectedMember] = useState<Member | null>(null); // Holds selected member for promotion
const [selectedRole, setSelectedRole] = useState<string>(''); 
const [isDemoteModalOpen, setIsDemoteModalOpen] = useState(false); // State to manage demote modal
const [officerToDemote, setOfficerToDemote] = useState<Officer | null>(null); 
const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Manage edit modal state
const [officerToEdit, setOfficerToEdit] = useState<Officer | null>(null); // Holds selected officer
const [newRole, setNewRole] = useState<string>(''); // Holds the new role for the officer
const [roleError, setRoleError] = useState<string | null>(null);
const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
const [allStudents, setAllStudents] = useState<Member[]>([]);
const [searchQuery, setSearchQuery] = useState('');
const [invitedStudents, setInvitedStudents] = useState<string[]>([]);
const [availableStudents, setAvailableStudents] = useState<Member[]>([]);
const openInviteModal = () => setIsInviteModalOpen(true);
const closeInviteModal = () => setIsInviteModalOpen(false);
const [role, setRole] = useState<string>('');
const [userDetails, setUserDetails] = useState<any>(null);

const auth = getAuth();
const user = auth.currentUser;

useEffect(() => {
  const fetchUserDetails = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      let userDocRef = doc(firestore, "students", currentUser.uid);
      let userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // If the user is not found in the "students" collection, check "faculty"
        userDocRef = doc(firestore, "faculty", currentUser.uid);
        userDoc = await getDoc(userDocRef);
      }

      if (userDoc.exists()) {
        setUserDetails(userDoc.data());
      } else {
        console.error("User not found in students or faculty collections.");
      }
    }
  };

  fetchUserDetails();
}, []);

const logActivity = async (description: string) => {
  if (organizationName && userDetails) {
    try {
      const logEntry = {
        userName: `${userDetails.firstname} ${userDetails.lastname}`,
        description,
        organizationName,
        timestamp: new Date(),
      };

      await addDoc(
        collection(firestore, `studentlogs/${organizationName}/activitylogs`),
        logEntry
      );
      console.log("Activity logged:", logEntry);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }
};


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
        } else if (orgData.facultyAdviser?.id === userId) {
          setRole('faculty'); // Assign role as 'faculty'
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
      return <StudentPresidentSidebar />;
    case 'faculty': // Add case for faculty
      return <StudentPresidentSidebar />;
    case 'member':
      return <StudentMemberSidebar />;
    default:
      return null; // No sidebar for guests
  }
};


useEffect(() => {
  const fetchAvailableStudents = async () => {
    try {
      const studentsRef = collection(firestore, 'students');
      const snapshot = await getDocs(studentsRef);

      const allStudents = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: `${doc.data().firstname} ${doc.data().lastname}`,
      })) as Member[];

      const eligibleStudents = filterEligibleStudents(allStudents);
      setAvailableStudents(eligibleStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  fetchAvailableStudents();
}, [organizationData]);

useEffect(() => {
  const fetchStudents = async () => {
    const studentsSnapshot = await getDocs(collection(firestore, 'students'));
    const studentsList: Member[] = studentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: `${doc.data().firstname} ${doc.data().lastname}`,
    }));
    
    const filteredStudents = studentsList.filter(
      (student) =>
        !organizationData?.members.some((member) => member.id === student.id) &&
        !invitedStudents.includes(student.id)
    );

    setAllStudents(filteredStudents);
  };

  fetchStudents();
}, [organizationData, invitedStudents]);

const filteredStudents = availableStudents.filter((student) =>
  student.name.toLowerCase().includes(searchQuery.toLowerCase())
);


const filterEligibleStudents = (students: Member[]) => {
  if (!organizationData) return [];

  const { president, officers, members } = organizationData;

  const excludedIds = new Set([
    president.id,
    ...officers.map((officer) => officer.id),
    ...members.map((member) => member.id),
  ]);

  return students.filter((student) => !excludedIds.has(student.id));
};




const allRoles = [
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Public Relations Officer",
  "Sergeant-at-Arms",
];
const openEditModal = (officer: Officer) => {
  const assignedRoles = organizationData?.officers.map((officer) => officer.role) || [];
  const remainingRoles = allRoles.filter((role) => !assignedRoles.includes(role) || role === officer.role);

  if (remainingRoles.length === 0) {
    setRoleError('All officer roles are filled.');
    return;
  }

  setAvailableRoles(remainingRoles);
  setOfficerToEdit(officer);
  setNewRole(officer.role); // Set the current role as the initial value
  setIsEditModalOpen(true);
};
useEffect(() => {
  const fetchInvitedStudents = async () => {
    try {
      const orgDocRef = doc(firestore, 'organizations', organizationName!);
      const orgDoc = await getDoc(orgDocRef);

      if (orgDoc.exists()) {
        const data = orgDoc.data();
        const invited = data.invitedStudents || [];
        setInvitedStudents(invited);
      }
    } catch (error) {
      console.error('Error fetching invited students:', error);
    }
  };

  fetchInvitedStudents();
}, [organizationName]);

const inviteStudent = async (studentId: string) => {
  try {
    // Fetch the invited student's details
    const studentDoc = await getDoc(doc(firestore, 'students', studentId));
    let studentName = 'Unknown Student';

    if (studentDoc.exists()) {
      const studentData = studentDoc.data();
      studentName = `${studentData.firstname} ${studentData.lastname}` || studentName;
    }

    // Fetch organization data from Firestore
    const orgDocRef = doc(firestore, 'organizations', organizationName!);
    const orgDoc = await getDoc(orgDocRef);

    let senderName = organizationName || 'Unknown Organization';
    let senderProfilePic = '/default-profile.png'; // Default profile picture

    if (orgDoc.exists()) {
      const orgData = orgDoc.data();
      senderName = orgData.name || senderName; // Use the organization name
      senderProfilePic = orgData.profileImagePath || senderProfilePic; // Use the organization's profile image
    }

    const notification = {
      subject: `You have been invited to join ${organizationName}.`,
      timestamp: new Date(),
      isRead: false,
      senderName,
      senderProfilePic,
      organizationName: organizationName,
      status: 'pending',
      type: 'invite',
    };

    // Save the notification to the invited student's notifications sub-collection
    const notificationRef = doc(
      firestore,
      `notifications/${studentId}/userNotifications`,
      uuidv4() // Generate a unique ID for each notification
    );

    await setDoc(notificationRef, notification);

    // Add student to invited students in the organization document
    await updateDoc(orgDocRef, {
      invitedStudents: arrayUnion(studentId),
    });

    setInvitedStudents((prev) => [...prev, studentId]);

    // Log activity with the student's name
    await logActivity(`Invited ${studentName} to join the organization.`);

  } catch (error) {
    console.error('Error inviting student:', error);
    alert('Failed to send the invite. Please try again.');
  }
};


const handleRoleUpdate = async () => {
  if (!officerToEdit || !newRole) return;

  try {
    // Fetch organization data from Firestore
    const orgDocRef = doc(firestore, 'organizations', organizationName!);
    const orgDoc = await getDoc(orgDocRef);

    let senderName = organizationName || 'Unknown Organization';
    let senderProfilePic = '/default-profile.png'; // Default profile picture

    if (orgDoc.exists()) {
      const orgData = orgDoc.data();
      senderName = orgData.name || senderName; // Use the organization name
      senderProfilePic = orgData.profileImagePath || senderProfilePic; // Use the organization's profile image
    }

    // Update the officer's role in the officers list
    const updatedOfficers = organizationData!.officers.map((officer) =>
      officer.id === officerToEdit.id ? { ...officer, role: newRole } : officer
    );

    // Update Firestore with the new officer roles
    await updateDoc(orgDocRef, { officers: updatedOfficers });

    // Refresh the state with the updated officers
    setOrganizationData((prev) => ({
      ...prev!,
      officers: updatedOfficers,
    }));

    // Log the role update activity
    await logActivity(`Updated role of ${officerToEdit.name} to ${newRole}.`);

    // Send a notification to the officer about their updated role
    const notification = {
      subject: `Your role has been updated to ${newRole}`,
      timestamp: new Date(),
      isRead: false,
      senderName,
      senderProfilePic,
      organizationName: organizationName,
      status: 'role-updated',
      type: 'role-change',
    };

    const notificationRef = doc(
      firestore,
      `notifications/${officerToEdit.id}/userNotifications`,
      uuidv4()
    );

    await setDoc(notificationRef, notification);

    // Close the edit modal
    closeEditModal();
   
  } catch (error) {
    console.error('Error updating officer role:', error);
  }
};





const closeEditModal = () => {
  setOfficerToEdit(null);
  setNewRole('');
  setIsEditModalOpen(false);
  setRoleError(null); 
};

const openDemoteModal = (officer: Officer) => {
  setOfficerToDemote(officer);
  setIsDemoteModalOpen(true);
};


const handleDemote = async () => {
  if (!organizationData || !organizationName || !officerToDemote) return;

  try {
    // Filter out the demoted officer from the officers list
    const updatedOfficers = organizationData.officers.filter(
      (officer) => officer.id !== officerToDemote.id
    );

    // Add the demoted officer to the members list
    const updatedMembers = [
      ...organizationData.members,
      {
        id: officerToDemote.id,
        name: officerToDemote.name,
        email: officerToDemote.email,
        profilePicUrl: officerToDemote.profilePicUrl,
      },
    ];

    // Fetch organization data from Firestore
    const orgDocRef = doc(firestore, 'organizations', organizationName);
    const orgDoc = await getDoc(orgDocRef);

    let senderName = organizationName || 'Unknown Organization';
    let senderProfilePic = '/default-profile.png'; // Default profile picture

    if (orgDoc.exists()) {
      const orgData = orgDoc.data();
      senderName = orgData.name || senderName; // Use the organization name
      senderProfilePic = orgData.profileImagePath || senderProfilePic; // Use the organization's profile image
    }

    // Update Firestore with the new officers and members lists
    await updateDoc(orgDocRef, {
      officers: updatedOfficers,
      members: updatedMembers,
    });

    // Refresh the state with the updated organization data
    setOrganizationData((prev) => ({
      ...prev!,
      officers: updatedOfficers,
      members: updatedMembers,
    }));

    // Log the demotion activity
    await logActivity(`Demoted ${officerToDemote.name} to a member.`);

    // Send a notification to the demoted officer
    const notification = {
      subject: `You have been demoted to a member.`,
      timestamp: new Date(),
      isRead: false,
      senderName,
      senderProfilePic,
      organizationName: organizationName,
      status: 'demoted',
      type: 'role-change',
    };

    const notificationRef = doc(
      firestore,
      `notifications/${officerToDemote.id}/userNotifications`,
      uuidv4()
    );

    await setDoc(notificationRef, notification);

    // Close the demote modal
    closeDemoteModal();
  
  } catch (error) {
    console.error('Error demoting officer:', error);
    alert('Failed to demote the officer. Please try again.');
  }
};

const closeDemoteModal = () => {
  setOfficerToDemote(null);
  setIsDemoteModalOpen(false);
};

const openPromoteModal = (member: Member) => {
  const assignedRoles = organizationData?.officers.map((officer) => officer.role) || [];
  const remainingRoles = allRoles.filter((role) => !assignedRoles.includes(role));

  if (remainingRoles.length === 0) {
    setRoleError("All officer roles are filled.");
    return;
  }

  setAvailableRoles(remainingRoles);
  setSelectedMember(member);
  setIsPromoteModalOpen(true);
};


const handlePromote = async () => {
  if (!selectedMember || !selectedRole) return;

  try {
    // Update the list of officers
    const updatedOfficers = [
      ...organizationData!.officers,
      {
        id: selectedMember.id,
        name: selectedMember.name,
        role: selectedRole,
        email: selectedMember.email,
        profilePicUrl: selectedMember.profilePicUrl,
      },
    ];

    // Remove the promoted member from the members list
    const updatedMembers = organizationData!.members.filter(
      (member) => member.id !== selectedMember.id
    );

    // Fetch organization data from Firestore
    const orgDocRef = doc(firestore, 'organizations', organizationName!);
    const orgDoc = await getDoc(orgDocRef);

    let senderName = organizationName || 'Unknown Organization';
    let senderProfilePic = '/default-profile.png'; // Default profile picture

    if (orgDoc.exists()) {
      const orgData = orgDoc.data();
      senderName = orgData.name || senderName; // Use the organization name
      senderProfilePic = orgData.profileImagePath || senderProfilePic; // Use the organization's profile image
    }

    // Update Firestore with the new officer and member lists
    await updateDoc(orgDocRef, {
      officers: updatedOfficers,
      members: updatedMembers,
    });

    // Refresh the state with the updated organization data
    setOrganizationData((prev) => ({
      ...prev!,
      officers: updatedOfficers,
      members: updatedMembers,
    }));

    // Log the promotion activity
    await logActivity(`Promoted ${selectedMember.name} to the role of ${selectedRole}.`);

    // Send a notification to the promoted member
    const notification = {
      subject: `Congratulations! You have been promoted to ${selectedRole}.`,
      timestamp: new Date(),
      isRead: false,
      senderName,
      senderProfilePic,
      organizationName: organizationName,
      status: 'promoted',
      type: 'role-change',
    };

    const notificationRef = doc(
      firestore,
      `notifications/${selectedMember.id}/userNotifications`,
      uuidv4()
    );

    await setDoc(notificationRef, notification);

    // Close the promote modal
    closePromoteModal();

    // Reload the page to reflect changes (if needed)
    window.location.reload();
  } catch (error) {
    console.error('Error promoting member:', error);
    alert('Failed to promote the member. Please try again.');
  }
};


const closePromoteModal = () => {
  setSelectedMember(null);
  setSelectedRole('');
  setIsPromoteModalOpen(false);
  setRoleError(null); 
};


const openKickModal = (userId: string, userName: string) => {
  setSelectedUser({ id: userId, name: userName });
  setKickModalOpen(true);
};

// Function to close the modal
const closeKickModal = () => {
  setSelectedUser(null);
  setKickModalOpen(false);
};

// Kick handling function
const handleKick = async () => {
  if (!organizationData || !organizationName || !selectedUser) return;

  try {
    const orgDocRef = doc(firestore, 'organizations', organizationName);
    const orgDoc = await getDoc(orgDocRef);

    let orgProfilePic = '/default-profile.png';
    let orgDisplayName = organizationName;

    // Fetch the organization's profile picture and name if available
    if (orgDoc.exists()) {
      const orgData = orgDoc.data();
      orgProfilePic = orgData.profileImagePath || '/default-profile.png';
      orgDisplayName = orgData.name || organizationName;
    }

    // Filter out the kicked member or officer
    const updatedMembers = organizationData.members.filter(
      (member) => member.id !== selectedUser.id
    );
    const updatedOfficers = organizationData.officers.filter(
      (officer) => officer.id !== selectedUser.id
    );

    const updatedData = {
      ...organizationData,
      members: updatedMembers,
      officers: updatedOfficers,
    };

    // Update the Firestore document with new members and officers
    await updateDoc(orgDocRef, updatedData);

    // Create a notification for the kicked user
    const subject = `You have been kicked from ${orgDisplayName}.`;

    const notifRef = doc(
      firestore,
      `notifications/${selectedUser.id}/userNotifications`,
      uuidv4()
    );

    await setDoc(notifRef, {
      subject,
      organizationName: orgDisplayName,
      timestamp: new Date(),
      isRead: false,
      status: 'kicked',
      type: 'general',
      senderProfilePic: orgProfilePic,
      senderName: orgDisplayName,
    });

    await logActivity(
      `Kicked ${selectedUser.name} from the organization.`,

    );
    // Update local state and close the modal
    setOrganizationData(updatedData);
    closeKickModal();

   
  } catch (error) {
    console.error('Error kicking user:', error);
    alert('Failed to kick the user. Please try again.');
  }
};


  const toggleDropdown = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };
  const fetchUserData = async (userId: string) => {
    try {
      const studentDoc = await getDoc(doc(firestore, 'students', userId));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        return {
          email: data.email || 'N/A',
          name: `${data.firstname} ${data.lastname}` || 'Unknown', // Combine first and last names
          profilePicUrl: data.profilePicUrl || null,
        };
      }
  
      const facultyDoc = await getDoc(doc(firestore, 'faculty', userId));
      if (facultyDoc.exists()) {
        const data = facultyDoc.data();
        return {
          email: data.email || 'N/A',
          name: `${data.firstname} ${data.lastname}` || 'Unknown', // Combine first and last names for faculty
          profilePicUrl: data.profilePicUrl || null,
        };
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return { email: 'N/A', name: 'Unknown', profilePicUrl: null };
  };
  

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (!organizationName) return;

        const orgDocRef = doc(firestore, 'organizations', organizationName);
        const orgDoc = await getDoc(orgDocRef);

        if (orgDoc.exists()) {
          const orgData = orgDoc.data() as Organization;

          const updatedPresident = {
            ...orgData.president,
            ...(await fetchUserData(orgData.president.id)),
          };

          const updatedFacultyAdviser = {
            ...orgData.facultyAdviser,
            ...(await fetchUserData(orgData.facultyAdviser.id)),
          };

          const updatedOfficers = await Promise.all(
            orgData.officers.map(async (officer) => ({
              ...officer,
              ...(await fetchUserData(officer.id)),
            }))
          );

          const updatedMembers = await Promise.all(
            orgData.members.map(async (member) => ({
              ...member,
              ...(await fetchUserData(member.id)),
            }))
          );

          setOrganizationData({
            ...orgData,
            president: updatedPresident,
            facultyAdviser: updatedFacultyAdviser,
            officers: updatedOfficers,
            members: updatedMembers,
          });
        } else {
          console.error('Organization not found');
        }
      } catch (error) {
        console.error('Error fetching organization data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [organizationName]);

  const renderProfilePic = (profilePicUrl?: string) => (
    profilePicUrl ? (
      <img src={profilePicUrl} alt="Profile" className="member-profile-pic" />
    ) : (
      <FontAwesomeIcon icon={faUserCircle} className="default-profile-icon" />
    )
  );

  if (loading) {
    return <div>Loading members...</div>;
  }

  if (!organizationData) {
    return <div>No organization data found.</div>;
  }
  
  return (
    <div className="organization-announcements-page">
    <Header />
    <div className="organization-announcements-container">
    <div className="sidebar-section">
        {renderSidebar()}
        </div>
        <div className="main-content">
        <div className="header-container">
        <h1 className="headtitle">Organization Members</h1>
        <button
  className="create-new-btn"
  onClick={goToManageCommittees}
>
  {role === 'member' ? 'View Committees' : 'Manage Committees'}
</button>

          

          </div>
          {role !== 'member' && (
  <button onClick={() => setIsInviteModalOpen(true)}>Invite a member</button>
)}
          {isInviteModalOpen && (
  <div className="MM-modal-overlay">
    <div className="MM-modal-content">
      <h3>Invite a Member</h3>

      <input
        type="text"
        placeholder="Search for a student..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="MM-search-bar"
      />

      <ul className="student-list">
        {filteredStudents.map((student) => (
          <li key={student.id} className="student-item">
            <span>{student.name}</span>
            <button
              onClick={() => inviteStudent(student.id)}
              disabled={invitedStudents.includes(student.id)}
              style={{
                backgroundColor: invitedStudents.includes(student.id) ? 'gray' : '#4CAF50',
                color: 'white',
                cursor: invitedStudents.includes(student.id) ? 'not-allowed' : 'pointer',
              }}
            >
              {invitedStudents.includes(student.id) ? 'Invited' : 'Invite'}
            </button>
          </li>
        ))}
      </ul>

      <button onClick={closeInviteModal}>Close</button>
    </div>
  </div>
)}





          {/* Faculty Adviser Table */}
          <div className="MM-table-wrapper">
            <h3>Faculty Adviser</h3>
            <table className="MM-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{renderProfilePic(organizationData.facultyAdviser.profilePicUrl)}</td>
                  <td>{organizationData.facultyAdviser.name}</td>
                  <td>{organizationData.facultyAdviser.email}</td>
                </tr>
              </tbody>
            </table>
          </div>
  
          {/* Officers Table */}
          <div className="MM-table-wrapper">
            <h3>Officers</h3>
            <table className="MM-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  {role !== 'member' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
  {/* President Row */}
  <tr>
    <td>{renderProfilePic(organizationData.president.profilePicUrl)}</td>
    <td>{organizationData.president.name}</td>
    <td>President</td>
    <td>{organizationData.president.email}</td>
    {role !== 'member' && <td></td>}
  </tr>

  {/* Officers Table */}
 {/* Officers Table */}
{organizationData.officers
  .sort((a, b) => (a.role === 'Vice President' ? -1 : 1)) // Vice President first
  .map((officer) => (
    <tr key={officer.id}>
      <td>{renderProfilePic(officer.profilePicUrl)}</td>
      <td>{officer.name}</td>
      <td>{officer.role}</td>
      <td>{officer.email}</td>
      {role !== 'member' && (
        <td>
          {/* No actions for Vice President */}
          {officer.role !== 'Vice President' ? (
            <div className={`MM-dropdown ${openDropdown === officer.id ? 'open' : ''}`}>
              <button className="MM-action-btn" onClick={() => toggleDropdown(officer.id)}>
                Action
              </button>
              <div className="MM-dropdown-content">
                <button onClick={() => openEditModal(officer)}>Edit</button>
                <button onClick={() => openDemoteModal(officer)}>Demote</button>
                <button onClick={() => openKickModal(officer.id, officer.name)}>Kick</button>
              </div>
            </div>
          ) : (
            <div></div> /* No actions for Vice President */
          )}
        </td>
      )}
    </tr>
  ))}
</tbody>


            </table>
          </div>
  
          {/* Members Table */}
          <div className="MM-table-wrapper">
            <h3>Members</h3>
            <table className="MM-table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Email</th>
                  {role !== 'member' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
  {organizationData.members.map((member) => (
    <tr key={member.id}>
      <td>{renderProfilePic(member.profilePicUrl)}</td>
      <td>{member.name}</td>
      <td>{member.email}</td>
      {role !== 'member' && (
        <td>
          <div className={`MM-dropdown ${openDropdown === member.id ? 'open' : ''}`}>
            <button className="MM-action-btn" onClick={() => toggleDropdown(member.id)}>
              Action
            </button>
            <div className="MM-dropdown-content">
              <button onClick={() => openPromoteModal(member)}>Promote</button>
              <button onClick={() => openKickModal(member.id, member.name)}>Kick</button>
            </div>
          </div>
        </td>
      )}
    </tr>
  ))}
</tbody>

            </table>


          </div>


          
          {isPromoteModalOpen && selectedMember && (
          <div className="MM-modal-overlay">
            <div className="MM-modal-content">
              <h3>Promote {selectedMember.name} to Officer</h3>

              {roleError ? (
                <p className="MM-error-message">{roleError}</p>
              ) : (
                <>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="MM-role-dropdown"
                  >
                    <option value="" disabled>Select Role</option>
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>

                  <div className="MM-modal-actions">
                    <button className="MM-confirm-btn" onClick={handlePromote}>
                      Confirm
                    </button>
                    <button className="MM-cancel-btn" onClick={closePromoteModal}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {isDemoteModalOpen && officerToDemote && (
  <div className="MM-modal-overlay">
    <div className="MM-modal-content">
      <h3>Are you sure you want to demote {officerToDemote.name} to a member?</h3>
      <div className="MM-modal-actions">
        <button className="MM-confirm-btn" onClick={handleDemote}>
          Yes
        </button>
        <button className="MM-cancel-btn" onClick={closeDemoteModal}>
          No
        </button>
      </div>
    </div>
  </div>
)}
{isEditModalOpen && officerToEdit && (
  <div className="MM-modal-overlay">
    <div className="MM-modal-content">
      <h3>Edit Role for {officerToEdit.name}</h3>

      {roleError ? (
        <p className="MM-error-message">{roleError}</p>
      ) : (
        <>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="MM-role-dropdown"
          >
            <option value="" disabled>Select Role</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <div className="MM-modal-actions">
            <button className="MM-confirm-btn" onClick={handleRoleUpdate}>
              Confirm
            </button>
            <button className="MM-cancel-btn" onClick={closeEditModal}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}

       {/* Kick Confirmation Modal */}
        {isKickModalOpen && selectedUser && (
          <div className="MM-modal-overlay">
            <div className="MM-modal-content">
              <h3>Are you sure you want to kick {selectedUser.name}?</h3>
              <div className="MM-modal-actions">
                <button className="MM-confirm-btn" onClick={handleKick}>
                  Yes
                </button>
                <button className="MM-cancel-btn" onClick={closeKickModal}>
                  No
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  </div>
);
  
};

export default ManageMembers;
