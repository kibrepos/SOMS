import React, { useEffect, useState } from 'react';
import {  firestore } from '../../services/firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import '../../styles/OrganizationAnnouncement.css'; // Custom styles for announcements

interface Announcement {
  id: string;
  subject: string;
  message: string;
  timestamp: string;
  pictureUrl?: string;
}

const OrganizationAnnouncement: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const announcementCollection = collection(firestore, 'announcements');
      const announcementSnapshot = await getDocs(announcementCollection);
      const announcementData = announcementSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(announcementData);
    };

    fetchAnnouncements();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'announcements', id));
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  return (
    <div className="announcement-container">
      <h1>Announcements</h1>
      {announcements.length === 0 ? (
        <p>No announcements available.</p>
      ) : (
        announcements.map((announcement) => (
          <div key={announcement.id} className="announcement-card">
            {announcement.pictureUrl && (
              <img
                src={announcement.pictureUrl}
                alt="Announcement"
                className="announcement-image"
              />
            )}
            <div className="announcement-content">
              <h2 className="announcement-subject">{announcement.subject}</h2>
              <p className="announcement-message">{announcement.message}</p>
              <p className="announcement-timestamp">{new Date(announcement.timestamp).toLocaleString()}</p>
              <button
                className="announcement-delete"
                onClick={() => handleDelete(announcement.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default OrganizationAnnouncement;
