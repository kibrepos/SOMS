import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../services/firebaseConfig';
import '../styles/StudentDashboard.css'; // Import your CSS

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const studentDocRef = doc(firestore, 'students', user.uid);
          const studentDoc = await getDoc(studentDocRef);

          if (studentDoc.exists()) {
            setStudentData(studentDoc.data());
          } else {
            setError('No student data found.');
          }
        } catch (err) {
          console.error('Error fetching student data:', err);
          setError('Error fetching student data.');
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login'); // Redirect to login if no user is authenticated
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Student Dashboard</h1>
      <div className="student-info">
        <p>Name: {studentData?.firstname || 'Loading...'}</p>
        <p>ID: {studentData?.studentNumber || 'Loading...'}</p>
        <p>Major: {studentData?.department || 'Loading...'}</p>
        <p>Year: {studentData?.year || 'Loading...'}</p>
      </div>
      <div className="actions">
        <button onClick={() => alert('Update Profile')}>Update Profile</button>
        <button onClick={() => alert('View Grades')}>View Grades</button>
      </div>
    </div>
  );
};

export default StudentDashboard;
