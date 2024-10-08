import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";
import AdminSidebar from './AdminSidebar';
import '../../styles/AdminCreateOrganization.css';

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

const AdminCreateOrganization: React.FC = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [facultyAdviser, setFacultyAdviser] = useState<Faculty | null>(null);
  const [president, setPresident] = useState<Student | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Student[]>([]);
  const [officers, setOfficers] = useState<{ student: Student; role: string }[]>([]);
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

  // Fetch students and faculty from Firestore
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
    fetchData();
  }, []);

  const createOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !description || !facultyAdviser || !president || selectedMembers.length === 0) {
      alert("All fields are required.");
      return;
    }

    try {
      await setDoc(doc(firestore, "organizations", name), {
        name,
        description,
        facultyAdviser: facultyAdviser.firstname + " " + facultyAdviser.lastname,
        president: president.firstname + " " + president.lastname,
        members: selectedMembers.map(member => member.firstname + " " + member.lastname),
        officers: officers.map(officer => ({
          student: officer.student.firstname + " " + officer.student.lastname,
          role: officer.role,
        })),
        status: "active"
      });
      navigate("/Admin/ManageOrganizations");
    } catch (error) {
      console.error("Error creating organization: ", error);
    }
  };

  // Toggle member selection and prevent the president or officers from being selected as a member
  const toggleMemberSelection = (member: Student) => {
    if (member.id === president?.id || officers.some(officer => officer.student.id === member.id)) return;
    if (selectedMembers.some(selected => selected.id === member.id)) {
      setSelectedMembers(selectedMembers.filter(selected => selected.id !== member.id));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  // Remove officer
  const removeOfficer = (index: number) => {
    setOfficers(officers.filter((_, i) => i !== index));
  };

  // Filtering members who are not selected as the president or officers
  const availableMembers = students.filter(student =>
    student.id !== president?.id && !officers.some(officer => officer.student.id === student.id)
  );

  const availablePresidents = students.filter(student =>
    !selectedMembers.some(member => member.id === student.id) && !officers.some(officer => officer.student.id === student.id)
  );

  const availableOfficers = students.filter(student =>
    student.id !== president?.id && !selectedMembers.some(member => member.id === student.id) && !officers.some(officer => officer.student.id === student.id)
  );

  const filteredFaculties = faculties.filter(faculty =>
    (faculty.firstname + " " + faculty.lastname).toLowerCase().includes(facultySearch.toLowerCase())
  );

  const filteredPresidents = availablePresidents.filter(student =>
    (student.firstname + " " + student.lastname).toLowerCase().includes(presidentSearch.toLowerCase())
  );

  const filteredMembers = availableMembers.filter(student =>
    (student.firstname + " " + student.lastname).toLowerCase().includes(membersSearch.toLowerCase())
  );

  const filteredOfficers = availableOfficers.filter(student =>
    (student.firstname + " " + student.lastname).toLowerCase().includes(officerSearch.toLowerCase())
  );

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
          <h2>Create New Organization</h2>

          <form onSubmit={createOrganization} className="CNO-org-form">
            <div className="CNO-form-row">
              <div className="CNO-form-column">
                <label>Organization Name</label>
                <input
                  type="text"
                  placeholder="Enter organization name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="CNO-form-column">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Enter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="CNO-form-row">
              <div className="CNO-form-column">
                <label>Faculty Adviser</label>
                <div className="CNO-input-box" onClick={() => setIsFacultyModalOpen(true)}>
                  <div className="CNO-head-member-container">
                    {facultyAdviser && renderProfilePic(facultyAdviser.profilePicUrl)}
                    <span>
                      {facultyAdviser
                        ? facultyAdviser.firstname + " " + facultyAdviser.lastname
                        : "Select Faculty Adviser"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="CNO-form-column">
                <label>President</label>
                <div className="CNO-input-box" onClick={() => setIsPresidentModalOpen(true)}>
                  <div className="CNO-head-member-container">
                    {president ? (
                      <>
                        <img src={president.profilePicUrl} alt="President" className="CNO-p-pictures" />
                        <span>{president.firstname + " " + president.lastname}</span>
                      </>
                    ) : (
                      <span>Select President</span>
                    )}
                  </div>
                </div>
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
                {officers.map((officer, index) => (
                  <div key={index} className="CNO-officer-card">
                    {renderProfilePic(officer.student.profilePicUrl)}
                    <span>{officer.student.firstname} {officer.student.lastname} - {officer.role}</span>
                    <button className="CNO-removebtn" onClick={() => removeOfficer(index)}>×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="CNO-form-row">
              <label>Members</label>
              <div className="CNO-input-box" onClick={() => setIsMembersModalOpen(true)}>
                <span>{selectedMembers.length > 0 ? `${selectedMembers.length} members selected` : "Select Members"}</span>
              </div>

              <div className="CNO-selected-members">
  {selectedMembers.map((member, index) => (
    <div key={index} className="CNO-member-card">
      {renderProfilePic(member.profilePicUrl)}
      <div className="CNO-member-info">
        <span>{member.firstname} {member.lastname}</span>
      </div>
      <button className="CNO-removebtn" onClick={() => toggleMemberSelection(member)}>×</button>
    </div>
  ))}
</div>
  </div>
            <button type="submit" className="CNO-submit-btn">Submit</button>
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
        {filteredFaculties.length > 0 ? (
          filteredFaculties.map(faculty => (
            <li key={faculty.id}>
              {renderProfilePic(faculty.profilePicUrl)}
              {faculty.firstname} {faculty.lastname}
              <button onClick={() => {
                setFacultyAdviser(faculty);
                setIsFacultyModalOpen(false);
              }}>
                Select
              </button>
            </li>
          ))
        ) : (
          <li>No names found</li>
        )}
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
        {filteredPresidents.length > 0 ? (
          filteredPresidents.map(student => (
            <li key={student.id}>
              {renderProfilePic(student.profilePicUrl)}
              {student.firstname} {student.lastname}
              <button onClick={() => {
                setPresident(student);
                setIsPresidentModalOpen(false);
              }}>
                Select
              </button>
            </li>
          ))
        ) : (
          <li>No names found</li>
        )}
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
        {filteredMembers.length > 0 ? (
          filteredMembers.map(student => (
            <li key={student.id}>
              {renderProfilePic(student.profilePicUrl)}
              {student.firstname} {student.lastname}
              <button
                className={selectedMembers.some(member => member.id === student.id) ? "CNO-selected-btn" : ""}
                onClick={() => toggleMemberSelection(student)}
              >
                {selectedMembers.some(member => member.id === student.id) ? "Unselect" : "Select"}
              </button>
            </li>
          ))
        ) : (
          <li>No names found</li>
        )}
      </ul>
    </div>
  </div>
)}

{/* Officers Modal */}
{/* Officers Modal */}
{isOfficersModalOpen && (
  <div className="CNO-modal-overlay">
    <div className="CNO-modal-content">
      <button className="CNO-close-icon" onClick={() => setIsOfficersModalOpen(false)}>×</button>
      <h3>Select Officer</h3>

      {/* Student Selection Input */}
      <div className="CNO-officer-selection">
        <label>Select Student</label>
        <input
          type="text"
          placeholder="Search students..."
          value={officerSearch}
          onChange={(e) => {
            setOfficerSearch(e.target.value);
            setSelectedStudentForOfficer(null); // Clear the selected student while searching
          }}
          className="CNO-search-input"
        />
        
        {/* Dropdown List (only visible when a search term is present and no student is selected) */}
        {officerSearch.trim() !== "" && !selectedStudentForOfficer && (
          <ul className="CNO-dropdown">
            {filteredOfficers.length > 0 ? (
              filteredOfficers.map(student => (
                <li key={student.id} onClick={() => {
                  setSelectedStudentForOfficer(student);
                  setOfficerSearch(student.firstname + ' ' + student.lastname);
                }}>
                  {renderProfilePic(student.profilePicUrl)}
                  {student.firstname} {student.lastname}
                </li>
              ))
            ) : (
              <li>No names found</li>
            )}
          </ul>
        )}
      </div>

      {/* Role Input */}
      <div className="CNO-officer-role-input">
        <label>Officer Role</label>
        <input
          type="text"
          placeholder="Enter role"
          value={officerRole}
          onChange={(e) => setOfficerRole(e.target.value)}
        />
      </div>

      {/* Add Officer Button */}
      <button
        className="CNO-submit-btn"
        onClick={() => {
          if (selectedStudentForOfficer && officerRole) {
            setOfficers([...officers, { student: selectedStudentForOfficer, role: officerRole }]);
            setSelectedStudentForOfficer(null);
            setOfficerSearch(""); // Clear the search box after selection
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




        </div>
      </div>
    </div>
  );
};

export default AdminCreateOrganization;