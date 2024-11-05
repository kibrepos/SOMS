import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, DocumentSnapshot,startAfter,Timestamp  } from 'firebase/firestore';
import {  firestore } from '../../services/firebaseConfig';
import '../../styles/OrganizationActivityLogs.css'; 
import Header from '../../components/Header'; 
import StudentPresidentSidebar from './StudentPresidentSidebar'; 

interface LogEntry {
  id: string;
  userName: string;
  description: string;
  timestamp: string;
}

const OrganizationActivityLogs: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [newLogCount, setNewLogCount] = useState<number>(0);

 const fetchLogs = async () => {
  setLoading(true);
  try {
    if (organizationName) {
      const logsCollection = collection(firestore, 'studentlogs');
      const q = query(
        logsCollection,
        where('organizationName', '==', organizationName),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      const logSnapshot = await getDocs(q);
      const fetchedLogs: LogEntry[] = logSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName,
          description: data.description,
          timestamp: data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate().toLocaleString() 
            : new Date(data.timestamp).toLocaleString(), // Fallback for unexpected format
        };
      }) as LogEntry[];
      

      setLogs(fetchedLogs);
      setLastVisible(logSnapshot.docs[logSnapshot.docs.length - 1]);

      // Update new log count if there are new logs
      if (fetchedLogs.length > 0) {
        setNewLogCount(prevCount => prevCount + fetchedLogs.length);
      }
    }
  } catch (error) {
    console.error("Error fetching logs: ", error);
  } finally {
    setLoading(false);
  }
};


  const fetchMoreLogs = async () => {
    if (!lastVisible || loadingMore) return;

    setLoadingMore(true);
    try {
      const logsCollection = collection(firestore, 'studentlogs');
      const q = query(
        logsCollection,
        where('organizationName', '==', organizationName),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible), // Start fetching after the last visible document
        limit(10)
      );

      const logSnapshot = await getDocs(q);
      const fetchedLogs: LogEntry[] = logSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: new Date(doc.data().timestamp).toLocaleString(),
      })) as LogEntry[];

      setLogs(prevLogs => [...prevLogs, ...fetchedLogs]);
      setLastVisible(logSnapshot.docs[logSnapshot.docs.length - 1]); // Update lastVisible

      if (fetchedLogs.length < 10) {
        setLastVisible(null); // No more logs to load
      }
    } catch (error) {
      console.error("Error fetching more logs: ", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [organizationName]);

  return (
    <div className="OAC-organization-dashboard-wrapper">
      <Header />

      <div className="OAC-dashboard-container">
        <div className="OAC-sidebar-section">
          <StudentPresidentSidebar />
        </div>
      </div>
      
      <div className="OAC-admin-activity-logs">
        <div className="OAC-activity-logs-content">
          <h2>Activity Logs for {organizationName}</h2>
          {loading ? (
            <p>Loading logs...</p>
          ) : (
            <div className="OAC-logs-container">
              <ul className="OAC-logs-list">
                {logs.length === 0 ? (
                  <p>No logs available for this organization.</p>
                ) : (
                  logs.map(log => (
                    <li key={log.id} className="OAC-log-item">
                      <div className="OAC-log-user-name">{log.userName}</div>
                      <p className="OAC-log-message">{log.description}</p>
                      <span className="OAC-log-timestamp">{log.timestamp}</span>
                    </li>
                  ))
                )}
              </ul>
              {lastVisible ? (
                <button onClick={fetchMoreLogs} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load More Logs"}
                </button>
              ) : (
                <button disabled>
                  All logs loaded
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationActivityLogs;
