import React, { useState, useEffect } from "react";
import { firestore } from "../../services/firebaseConfig";
import { doc,setDoc, collection, getDocs } from "firebase/firestore";
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
  const [head, setHead] = useState<Student | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Student[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [facultySearch, setFacultySearch] = useState("");
  const [headSearch, setHeadSearch] = useState("");
  const [membersSearch, setMembersSearch] = useState("");
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
  
    if (!name || !description || !facultyAdviser || !head || selectedMembers.length === 0) {
      alert("All fields are required.");
      return;
    }
  
    try {
      // Using the organization name as the document ID
      await setDoc(doc(firestore, "organizations", name), {
        name,
        description,
        facultyAdviser: facultyAdviser.firstname + " " + facultyAdviser.lastname,
        head: head.firstname + " " + head.lastname,
        members: selectedMembers.map(member => member.firstname + " " + member.lastname),
        status: "active"
      });
      navigate("/Admin/ManageOrganizations");
    } catch (error) {
      console.error("Error creating organization: ", error);
    }
  };

  // Toggle member selection and prevent the head from being selected as a member
  const toggleMemberSelection = (member: Student) => {
    if (member.id === head?.id) return;
    if (selectedMembers.some(selected => selected.id === member.id)) {
      setSelectedMembers(selectedMembers.filter(selected => selected.id !== member.id));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  // Filtering members who are not selected as the head
  const availableMembers = students.filter(student => student.id !== head?.id);
  const availableHeads = students.filter(student => !selectedMembers.some(member => member.id === student.id));

  const filteredFaculties = faculties.filter(faculty =>
    (faculty.firstname + " " + faculty.lastname).toLowerCase().includes(facultySearch.toLowerCase())
  );
  const filteredHeads = availableHeads.filter(student =>
    (student.firstname + " " + student.lastname).toLowerCase().includes(headSearch.toLowerCase())
  );
  const filteredMembers = availableMembers.filter(student =>
    (student.firstname + " " + student.lastname).toLowerCase().includes(membersSearch.toLowerCase())
  );

  // Faculty adviser and head profile picture handling
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
                <label>Organization Head</label>
                <div className="CNO-input-box" onClick={() => setIsHeadModalOpen(true)}>
                  <div className="CNO-head-member-container">
                    {head ? (
                      <>
                        <img src={head.profilePicUrl} alt="Head" className="CNO-p-pictures" />
                        <span>{head.firstname + " " + head.lastname}</span>
                      </>
                    ) : (
                      <span>Select Organization Head</span>
                    )}
                  </div>
                </div>
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
                    <span>{member.firstname} {member.lastname}</span>
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
                <button onClick={() => setIsFacultyModalOpen(false)}>Close</button>
              </div>
            </div>
          )}

          {/* Organization Head Modal */}
          {isHeadModalOpen && (
            <div className="CNO-modal-overlay">
              <div className="CNO-modal-content">
                <h3>Select Organization Head</h3>
                <input
                  type="text"
                  placeholder="Search heads..."
                  value={headSearch}
                  onChange={(e) => setHeadSearch(e.target.value)}
                />
                <ul>
                  {filteredHeads.length > 0 ? (
                    filteredHeads.map(student => (
                      <li key={student.id}>
                        {renderProfilePic(student.profilePicUrl)}
                        {student.firstname} {student.lastname}
                        <button onClick={() => {
                          setHead(student);
                          setIsHeadModalOpen(false);
                        }}>
                          Select
                        </button>
                      </li>
                    ))
                  ) : (
                    <li>No names found</li>
                  )}
                </ul>
                <button onClick={() => setIsHeadModalOpen(false)}>Close</button>
              </div>
            </div>
          )}

          {/* Members Modal */}
          {isMembersModalOpen && (
            <div className="CNO-modal-overlay">
              <div className="CNO-modal-content">
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
                <button onClick={() => setIsMembersModalOpen(false)}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCreateOrganization;
