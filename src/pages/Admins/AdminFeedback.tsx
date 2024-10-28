import React, { useEffect, useState } from 'react';
import { firestore } from '../../services/firebaseConfig';
import { collection, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import '../../styles/AdminFeedback.css'; // Import your CSS file
import AdminSidebar from './AdminSidebar'; // Import AdminSidebar

// Define the structure of Feedback
interface Feedback {
  id: string;
  userId: string;
  feedbackText: string;
  timestamp: string;
  student?: Student | null;
}

// Define the structure of Student
interface Student {
  firstname: string;
  lastname: string;
  profilePicUrl: string;
  email: string;
}

const AdminFeedback: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch student details from Firestore using the userId
  const fetchStudentDetails = async (userId: string): Promise<Student | null> => {
    try {
      const studentRef = doc(firestore, 'students', userId);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        return studentSnap.data() as Student;
      } else {
        console.warn(`No student found with ID: ${userId}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      return null;
    }
  };

  // Real-time listener for feedback collection
  useEffect(() => {
    const feedbackCollection = collection(firestore, 'feedback');
    const unsubscribe = onSnapshot(feedbackCollection, async (snapshot) => {
      const feedbackData: Feedback[] = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const timestamp = (data.timestamp as Timestamp).toDate().toLocaleString();
          const student = await fetchStudentDetails(data.userId);

          return {
            id: doc.id,
            userId: data.userId,
            feedbackText: data.feedbackText,
            timestamp,
            student,
          };
        })
      );

      // Sort by timestamp (newest first)
      const sortedFeedback = feedbackData.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setFeedbackList(sortedFeedback);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  return (
    <div className="admin-container">
      <AdminSidebar /> {/* AdminSidebar component */}
      <div className="admin-content">
        <h2>Admin Feedback</h2>
        {loading ? (
          <p>Loading feedback...</p>
        ) : feedbackList.length === 0 ? (
          <p>No feedback available.</p>
        ) : (
          <ul className="feedback-list">
            {feedbackList.map((feedback) => (
              <li key={feedback.id} className="feedback-item fade-in">
                {feedback.student ? (
                  <div className="student-info">
                    <img
                      src={feedback.student.profilePicUrl || 'https://via.placeholder.com/50'}
                      alt={`${feedback.student.firstname} ${feedback.student.lastname}`}
                      className="student-profile-pic"
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/50')} // Fallback for broken image
                    />
                    <p className="student-name">
                      <strong>User:</strong> {feedback.student.firstname} {feedback.student.lastname}
                    </p>
                    <p className="student-email">
                      <strong>Email:</strong> {feedback.student.email}
                    </p>
                  </div>
                ) : (
                  <p>User information not available</p>
                )}
                <p className="feedback-message">
                  <strong>Message:</strong> {feedback.feedbackText}
                </p>
                <p className="feedback-timestamp">
                  <strong>Submitted on:</strong> {feedback.timestamp}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminFeedback;
