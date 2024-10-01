import React, { useState, useEffect } from "react";
import { collection, getDocs, setDoc,addDoc, getDoc,deleteDoc, updateDoc, doc,Timestamp  } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendEmailVerification,signInWithEmailAndPassword ,signOut} from "firebase/auth"; // Firebase auth imports
import { firestore, auth } from "../../services/firebaseConfig"; // Assuming Firebase is configured here
import { CSVLink } from "react-csv";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import AdminSidebar from "./AdminSidebar";
import '../../styles/AdminManageStudent.css'; 

const AdminManageStudent: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [newStudent, setNewStudent] = useState({
    firstname: "",
    lastname: "",
    department: "",
    studentNumber: "",
    year: "",
    email: "",
    password: "DLSUD123", // Default password
    userId: "" // Initialize userId
  });

  // Fetch students from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      const querySnapshot = await getDocs(collection(firestore, "students"));
      const studentsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
      setFilteredStudents(studentsList); 
      setLoading(false);
    };
    fetchStudents();
  }, []);

  // Log activity to Firestore
  const logActivity = async (activity: string) => {
    const admin = auth.currentUser; // Get the current admin user
    if (!admin) return;
  
    try {
      // Fetch admin document from Firestore
      const adminDoc = await getDoc(doc(firestore, "admin", admin.uid)); // Assuming the admin's data is stored in the "admins" collection
  
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        const adminName = `${data.firstname} ${data.lastname}`; // Combine first name and last name
  
        // Log the activity in Firestore
        await addDoc(collection(firestore, "logs"), {
          activity: activity,
          userName: adminName, // Use the fetched admin name
          timestamp: Timestamp.now(), // Current timestamp
          role: data.role || "admin", // Default role to 'admin' if not available
        });
  
        console.log("Activity logged successfully");
      } else {
        console.error("Admin document not found");
      }
    } catch (error) {
      console.error("Error logging activity: ", error);
    }
  };
  

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = students.filter(student =>
      student.firstname.toLowerCase().includes(query) ||
      student.lastname.toLowerCase().includes(query) ||
      student.studentNumber.includes(query) ||
      student.department.toLowerCase().includes(query) ||
      student.year.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      const student = students.find((s) => s.id === id);
      await deleteDoc(doc(firestore, "students", id));
      
      // Log the activity
      await logActivity(`Deleted student: ${student.firstname} ${student.lastname}`);
      
      window.location.reload(); // Reload page to reflect changes
    }
  };

  const openEditModal = (student: any) => {
    setSelectedStudent(student);
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };


  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get the current admin user (before creating a new student)
    const adminUser = auth.currentUser;

    try {
        const { email, password, firstname, lastname, studentNumber, department, year } = newStudent;

        // Step 1: Create the user with Firebase Authentication and default password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Step 2: Send email verification
        await sendEmailVerification(newUser);
        alert("Verification email sent to the student.");

        // Step 3: Sign out the newly created user
        await signOut(auth);

        // Step 4: Re-authenticate the admin to ensure they remain logged in
        if (adminUser) {
            await signInWithEmailAndPassword(auth, "eboysalgado@gmail.com", "admin123"); // Replace with your admin's password securely
        }

        // Step 5: Add student info to Firestore using the Firebase Auth UID as document ID
        const studentDocRef = doc(firestore, 'students', newUser.uid);
        await setDoc(studentDocRef, {
            firstname,
            lastname,
            email,
            studentNumber,
            department,
            year,
            userId: newUser.uid,  // Make userId and document ID the same
        });

        // Step 6: Log the activity
        await logActivity(`Added new student: ${firstname} ${lastname}`);

        // Close modal and refresh the page
        setShowAddModal(false);
        window.location.reload();

    } catch (error) {
        console.error("Error adding student: ", error);
        alert("Failed to add student. Please check the details and try again.");
    }
  };


  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent) {
      await updateDoc(doc(firestore, "students", selectedStudent.id), selectedStudent);
      alert("Student updated");

      // Log the activity
      await logActivity(`Edited student: ${selectedStudent.firstname} ${selectedStudent.lastname}`);
      
      setShowEditModal(false);
      window.location.reload(); 
    }
  };

  const handleCSVExport = () => {
    logActivity("Exported students as CSV");
  };

  if (loading) return <p>Loading students...</p>;

  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      <div className="admin-dashboard-content">
        <div className="header-actions">
          <CSVLink data={filteredStudents} filename="students.csv" className="export-btn" onClick={handleCSVExport}>
            Export as CSV
          </CSVLink>
          <button className="add-student-btn" onClick={openAddModal}>Add Student</button>
        </div>

        <input
          type="text"
          placeholder="Search by name, student number, department, etc."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
        />

        <div className="student-table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Full Name</th>
                <th>Student Number</th>
                <th>Department</th>
                <th>Year Level</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id}>
                  <td>
                    {student.profilePicUrl ? (
                      <img 
                        src={student.profilePicUrl} 
                        alt={student.firstname} 
                        className="profilepicture" 
                      />
                    ) : (
                      <FontAwesomeIcon icon={faUserCircle} className="default-profilepicture" />
                    )}
                  </td>
                  <td>{student.firstname} {student.lastname}</td>
                  <td>{student.studentNumber}</td>
                  <td>{student.department}</td>
                  <td>{student.year}</td>
                  <td>{student.email}</td>
                  <td>
                    <button onClick={() => openEditModal(student)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDelete(student.id)} className="delete-btn">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Edit Student</h3>
              <form onSubmit={handleEditStudent}>
                <input type="text" value={selectedStudent?.firstname} onChange={(e) => setSelectedStudent({ ...selectedStudent, firstname: e.target.value })} />
                <input type="text" value={selectedStudent?.lastname} onChange={(e) => setSelectedStudent({ ...selectedStudent, lastname: e.target.value })} />
                <input type="text" value={selectedStudent?.department} onChange={(e) => setSelectedStudent({ ...selectedStudent, department: e.target.value })} />
                <input type="text" value={selectedStudent?.studentNumber} onChange={(e) => setSelectedStudent({ ...selectedStudent, studentNumber: e.target.value })} />
                <input type="text" value={selectedStudent?.year} onChange={(e) => setSelectedStudent({ ...selectedStudent, year: e.target.value })} />
                <input type="text" value={selectedStudent?.email} onChange={(e) => setSelectedStudent({ ...selectedStudent, email: e.target.value })} />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowEditModal(false)}>Close</button>
              </form>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Add New Student</h3>
              <form onSubmit={handleAddStudent}>
                <input type="text" placeholder="First Name" value={newStudent.firstname} onChange={(e) => setNewStudent({ ...newStudent, firstname: e.target.value })} required />
                <input type="text" placeholder="Last Name" value={newStudent.lastname} onChange={(e) => setNewStudent({ ...newStudent, lastname: e.target.value })} required />
                <input type="text" placeholder="Department" value={newStudent.department} onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} required />
                <input type="text" placeholder="Student Number" value={newStudent.studentNumber} onChange={(e) => setNewStudent({ ...newStudent, studentNumber: e.target.value })} required />
                <input type="text" placeholder="Year Level" value={newStudent.year} onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })} required />
                <input type="email" placeholder="Email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} required />
                <button type="submit">Add Student</button>
                <button type="button" onClick={() => setShowAddModal(false)}>Close</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManageStudent;
