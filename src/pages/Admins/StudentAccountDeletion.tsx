import React from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { firestore } from "../../services/firebaseConfig"; // Adjust the path if needed
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
      const uid = student.uid || student.userId;
      if (!uid) {
        alert("Invalid student UID. Cannot proceed with deletion.");
        console.error("Error: Student UID is missing:", student);
        return;
      }

      console.log("Attempting to delete student with UID:", uid);

      // Send request to your backend server to delete the user using Firebase Admin SDK
      const response = await fetch('/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      console.log("User deleted in Firebase Authentication");

      // Optionally, delete the student's Firestore document
      console.log("Deleting Firestore document for student ID:", student.id);
      await deleteDoc(doc(firestore, "students", student.id));

      alert(`Student ${student.firstname} ${student.lastname} has been deleted.`);
      console.log(`Successfully deleted student: ${student.firstname} ${student.lastname}`);
      onClose(); // Close the modal or dialog
    } catch (error) {
      console.error("Error during student deletion:", error);
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
      <p>Are you sure you want to permanently delete the student account for {student.firstname} {student.lastname}?</p>
      <button
        onClick={handleDelete}
        style={{
          backgroundColor: "red",
          color: "white",
          padding: "10px",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Yes, Delete
      </button>
      <button
        onClick={onClose}
        style={{
          marginLeft: "10px",
          padding: "10px",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default StudentAccountDeletion;
