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
    firstname: string;
    lastname: string;
  };
  onClose: () => void; // Function to close the dialog/modal
}

const StudentAccountDeletion: React.FC<StudentAccountDeletionProps> = ({ student, onClose }) => {
  const handleDelete = async () => {
    try {
      // Ensure the student UID is provided
      if (!student.uid) {
        alert("Invalid student UID. Cannot proceed with deletion.");
        return;
      }

      // Call Firebase Admin Cloud Function to delete the student account
      const deleteStudentAccount = httpsCallable(functions, "deleteStudentAccount");
      await deleteStudentAccount({ uid: student.uid });

      // Remove the student record from Firestore
      await deleteDoc(doc(firestore, "students", student.id));

      alert(`Student ${student.firstname} ${student.lastname} deleted successfully.`);
      onClose(); // Close the modal or dialog
    } catch (error) {
      if (error instanceof FirebaseError) {
        alert(`Firebase error: ${error.message}`);
      } else if (error instanceof Error) {
        alert(`Unexpected error: ${error.message}`);
      } else {
        console.error("Unknown error occurred:", error);
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
