import React from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "../../services/firebaseConfig"; // Adjust the path if needed
import { FirebaseError } from "firebase/app";

// Props for the component
interface StudentAccountDeletionProps {
  student: {
    id: string; // Firestore document ID
    uid: string; // Firebase Authentication UID
    userId?: string; // Optional: Include userId if it exists in Firestore
    firstname: string;
    lastname: string;
  };
  onClose: () => void; // Function to close the dialog/modal
}


const StudentAccountDeletion: React.FC<StudentAccountDeletionProps> = ({ student, onClose }) => {
  const handleDelete = async () => {
    try {
      // Use uid or fallback to userId if uid is undefined
      const uid = student.uid || student.userId;
      if (!uid) {
        alert("Invalid student UID. Cannot proceed with deletion.");
        console.error("Error: Student UID is missing:", student); // Log the invalid student object
        return;
      }
  
      console.log("Attempting to delete student with UID:", uid); // Log the UID being used for deletion
  
      // Call Firebase Admin Cloud Function to delete the student account
      const deleteStudentAccount = httpsCallable(functions, "deleteStudentAccount");
      const response = await deleteStudentAccount({ uid }); // Pass the UID to the function
      console.log("Cloud Function response:", response); // Log the response from the Cloud Function
  
      // Remove the student record from Firestore
      console.log("Deleting Firestore document for student ID:", student.id); // Log Firestore deletion
      await deleteDoc(doc(firestore, "students", student.id));
  
      alert(`Student ${student.firstname} ${student.lastname} deleted successfully.`);
      console.log(`Successfully deleted student: ${student.firstname} ${student.lastname}`); // Log success
      onClose(); // Close the modal or dialog
    } catch (error) {
      console.error("Error during student deletion:", error); // Log detailed error for debugging
      if (error instanceof FirebaseError) {
        alert(`Firebase error: ${error.message}`);
      } else if (error instanceof Error) {
        alert(`Unexpected error: ${error.message}`);
      } else {
        alert("An unknown error occurred. Please try again.");
      }
    }
  };
  

  return (
    <div>
      <p>Are you sure you want to delete the student account for {student.firstname} {student.lastname}?</p>
      <button onClick={handleDelete} style={{ backgroundColor: "red", color: "white", padding: "10px", border: "none", borderRadius: "5px" }}>
        Yes, Delete
      </button>
      <button onClick={onClose} style={{ marginLeft: "10px", padding: "10px", border: "none", borderRadius: "5px" }}>
        Cancel
      </button>
    </div>
  );
};

export default StudentAccountDeletion;
