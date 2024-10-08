import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from './AdminSidebar';
import '../../styles/AdminCreateOrganization.css';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Officer {
  student: string;
  role: string;
}

interface Student {
  id: string;
  firstname: string;
  lastname: string;
  profilePicUrl?: string;
}

interface Faculty {
  id: string;
  firstname: string;
  lastname: string;
  profilePicUrl?: string;
}

interface Organization {
  name: string;
  description: string;
  facultyAdviser: string;
  members: string[];
  president: string;
  officers: Officer[];
}

const AdminEditOrganization: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [editedOrganization, setEditedOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isPresidentModalOpen, setIsPresidentModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isOfficersModalOpen, setIsOfficersModalOpen] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [presidentSearch, setPresidentSearch] = useState("");
  const [membersSearch, setMembersSearch] = useState("");
  const [officerSearch, setOfficerSearch] = useState("");
  const [selectedStudentForOfficer, setSelectedStudentForOfficer] = useState<Student | null>(null);
  const [officerRole, setOfficerRole] = useState("");
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
      const data = orgSnapshot.data() as Organization;
      setEditedOrganization(data);
    } else {
      console.error("Organization does not exist");
      navigate("/Admin/ManageOrganizations");
    }
    setLoading(false);
  };

  const fetchData = async () => {
    try {
      const studentCollection = await getDocs(collection(firestore, "students"));
      const studentList = studentCollection.docs.map(doc => ({
        id: doc.id,
        firstname: doc.data().firstname,
        lastname: doc.data().lastname,
        profilePicUrl: doc.data().profilePicUrl || "",
      }));

      const facultyCollection = await getDocs(collection(firestore, "faculty"));
      const facultyList = facultyCollection.docs.map(doc => ({
        id: doc.id,
        firstname: doc.data().firstname,
        lastname: doc.data().lastname,
        profilePicUrl: doc.data().profilePicUrl || "",
      }));

      setStudents(studentList);
      setFaculties(facultyList);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  useEffect(() => {
    fetchOrganization();
    fetchData();
  }, [organizationName]);

  const handleSaveChanges = async () => {
    if (!editedOrganization) return;

    try {
      if (organizationName !== editedOrganization.name) {
        await deleteDoc(doc(firestore, "organizations", organizationName!));
      }
      await setDoc(doc(firestore, "organizations", editedOrganization.name), editedOrganization);
      navigate(`/Admin/Organizations/${editedOrganization.name}`);
    } catch (error) {
      console.error("Error updating organization: ", error);
    }
  };

  const toggleMemberSelection = (member: Student) => {
    if (member.id === editedOrganization?.president || editedOrganization?.officers.some(officer => officer.student === `${member.firstname} ${member.lastname}`)) return;
    const updatedMembers = editedOrganization?.members.includes(`${member.firstname} ${member.lastname}`)
      ? editedOrganization.members.filter(m => m !== `${member.firstname} ${member.lastname}`)
      : [...(editedOrganization?.members || []), `${member.firstname} ${member.lastname}`];
    setEditedOrganization({ ...editedOrganization!, members: updatedMembers });
  };

  const removeOfficer = (index: number) => {
    const updatedOfficers = editedOrganization?.officers.filter((_, i) => i !== index);
    setEditedOrganization({ ...editedOrganization!, officers: updatedOfficers! });
  };

  const renderProfilePic = (profilePicUrl?: string) => {
    return profilePicUrl ? (
      <img src={profilePicUrl} alt="Profile" className="CNO-p-pictures" />
    ) : (
      <FontAwesomeIcon icon={faUserCircle} className="CNO-default-icon" />
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-main">
        <AdminSidebar />
        <div className="admin-dashboard-content">
          {loading ? (
            <p>Loading organization details...</p>
          ) : (
            <>
              <h2>Edit Organization</h2>
              <form className="CNO-org-form">
                <div className="CNO-form-row">
                  <div className="CNO-form-column">
                    <label>Organization Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editedOrganization?.name}
                      onChange={(e) => setEditedOrganization({ ...editedOrganization!, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="CNO-form-column">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={editedOrganization?.description}
                      onChange={(e) => setEditedOrganization({ ...editedOrganization!, description: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="CNO-form-row">
                  <div className="CNO-form-column">
                    <label>Faculty Adviser</label>
                    <div className="CNO-input-box" onClick={() => setIsFacultyModalOpen(true)}>
                      <div className="CNO-head-member-container">
                        {editedOrganization?.facultyAdviser && renderProfilePic()}
                        <span>
                          {editedOrganization?.facultyAdviser || "Select Faculty Adviser"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="CNO-form-column">
                    <label>President</label>
                    <div className="CNO-input-box" onClick={() => setIsPresidentModalOpen(true)}>
                      <div className="CNO-head-member-container">
                        {editedOrganization?.president && renderProfilePic()}
                        <span>
                          {editedOrganization?.president || "Select President"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="CNO-form-row">
                  <label>Members</label>
                  <div className="CNO-input-box" onClick={() => setIsMembersModalOpen(true)}>
                    <span>{editedOrganization?.members && editedOrganization.members.length > 0 ? `${editedOrganization.members.length} members selected` : "Select Members"}</span>
                  </div>

                  <div className="CNO-selected-members">
                    {editedOrganization?.members.map((member, index) => (
                      <div key={index} className="CNO-member-card">
                        {renderProfilePic()}
                        <div className="CNO-member-info">
                          <span>{member}</span>
                        </div>
                        <button className="CNO-removebtn" onClick={() => toggleMemberSelection({ id: "", firstname: member.split(" ")[0], lastname: member.split(" ")[1] })}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="CNO-form-row">
                  <label>Officers</label>
                  <button
                    type="button"
                    className="CNO-add-officer-btn"
                    onClick={() => setIsOfficersModalOpen(true)}
                  >
                    Add Officer
                  </button>
                  <div className="CNO-selected-officers">
                    {editedOrganization?.officers.map((officer, index) => (
                      <div key={index} className="CNO-officer-card">
                        {renderProfilePic()}
                        <span>{officer.student} - {officer.role}</span>
                        <button className="CNO-removebtn" onClick={() => removeOfficer(index)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="button" className="CNO-submit-btn" onClick={handleSaveChanges}>
                  Save Changes
                </button>
              </form>

              {/* Faculty Adviser Modal */}
              {isFacultyModalOpen && (
                <div className="CNO-modal-overlay">
                  <div className="CNO-modal-content">
                    <button className="CNO-close-icon" onClick={() => setIsFacultyModalOpen(false)}>×</button>
                    <h3>Select Faculty Adviser</h3>
                    <input
                      type="text"
                      placeholder="Search faculty..."
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                    />
                    <ul>
                      {faculties.filter(faculty => (faculty.firstname + ' ' + faculty.lastname).toLowerCase().includes(facultySearch.toLowerCase())).map(faculty => (
                        <li key={faculty.id} onClick={() => {
                          setEditedOrganization({ ...editedOrganization!, facultyAdviser: `${faculty.firstname} ${faculty.lastname}` });
                          setIsFacultyModalOpen(false);
                        }}>
                          {renderProfilePic(faculty.profilePicUrl)}
                          {faculty.firstname} {faculty.lastname}
                          <button>Select</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* President Modal */}
              {isPresidentModalOpen && (
                <div className="CNO-modal-overlay">
                  <div className="CNO-modal-content">
                    <button className="CNO-close-icon" onClick={() => setIsPresidentModalOpen(false)}>×</button>
                    <h3>Select President</h3>
                    <input
                      type="text"
                      placeholder="Search presidents..."
                      value={presidentSearch}
                      onChange={(e) => setPresidentSearch(e.target.value)}
                    />
                    <ul>
                      {students.filter(student => (student.firstname + ' ' + student.lastname).toLowerCase().includes(presidentSearch.toLowerCase()) && !editedOrganization?.members.includes(`${student.firstname} ${student.lastname}`) && !editedOrganization?.officers.some(officer => officer.student === `${student.firstname} ${student.lastname}`)).map(student => (
                        <li key={student.id} onClick={() => {
                          setEditedOrganization({ ...editedOrganization!, president: `${student.firstname} ${student.lastname}` });
                          setIsPresidentModalOpen(false);
                        }}>
                          {renderProfilePic(student.profilePicUrl)}
                          {student.firstname} {student.lastname}
                          <button>Select</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Members Modal */}
              {isMembersModalOpen && (
                <div className="CNO-modal-overlay">
                  <div className="CNO-modal-content">
                    <button className="CNO-close-icon" onClick={() => setIsMembersModalOpen(false)}>×</button>
                    <h3>Select Members</h3>
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={membersSearch}
                      onChange={(e) => setMembersSearch(e.target.value)}
                    />
                    <ul>
                      {students.filter(student => (student.firstname + ' ' + student.lastname).toLowerCase().includes(membersSearch.toLowerCase()) && student.id !== editedOrganization?.president && !editedOrganization?.officers.some(officer => officer.student === `${student.firstname} ${student.lastname}`)).map(student => (
                        <li key={student.id} onClick={() => toggleMemberSelection(student)}>
                          {renderProfilePic(student.profilePicUrl)}
                          {student.firstname} {student.lastname}
                          <button>{editedOrganization?.members.includes(`${student.firstname} ${student.lastname}`) ? "Unselect" : "Select"}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Officers Modal */}
              {isOfficersModalOpen && (
                <div className="CNO-modal-overlay">
                  <div className="CNO-modal-content">
                    <button className="CNO-close-icon" onClick={() => setIsOfficersModalOpen(false)}>×</button>
                    <h3>Select Officer</h3>

                    <div className="CNO-officer-selection">
                      <label>Select Student</label>
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={officerSearch}
                        onChange={(e) => setOfficerSearch(e.target.value)}
                        className="CNO-search-input"
                      />
                      {officerSearch.trim() !== "" && !selectedStudentForOfficer && (
                        <ul className="CNO-dropdown">
                          {students.filter(student => (student.firstname + ' ' + student.lastname).toLowerCase().includes(officerSearch.toLowerCase()) && student.id !== editedOrganization?.president && !editedOrganization?.members.includes(`${student.firstname} ${student.lastname}`) && !editedOrganization?.officers.some(officer => officer.student === `${student.firstname} ${student.lastname}`)).map(student => (
                            <li key={student.id} onClick={() => {
                              setSelectedStudentForOfficer(student);
                              setOfficerSearch(student.firstname + ' ' + student.lastname);
                            }}>
                              {renderProfilePic(student.profilePicUrl)}
                              {student.firstname} {student.lastname}
                              <button>Select</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="CNO-officer-role-input">
                      <label>Officer Role</label>
                      <input
                        type="text"
                        placeholder="Enter role"
                        value={officerRole}
                        onChange={(e) => setOfficerRole(e.target.value)}
                      />
                    </div>

                    <button
                      className="CNO-submit-btn"
                      onClick={() => {
                        if (selectedStudentForOfficer && officerRole) {
                          setEditedOrganization({
                            ...editedOrganization!,
                            officers: [...(editedOrganization?.officers || []), { student: `${selectedStudentForOfficer.firstname} ${selectedStudentForOfficer.lastname}`, role: officerRole }],
                          });
                          setSelectedStudentForOfficer(null);
                          setOfficerSearch("");
                          setOfficerRole("");
                          setIsOfficersModalOpen(false);
                        }
                      }}
                    >
                      Add Officer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEditOrganization;
