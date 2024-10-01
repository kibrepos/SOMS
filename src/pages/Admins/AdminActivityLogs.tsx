import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from "../../services/firebaseConfig";
import "../../styles/AdminActivityLogs.css";
import AdminSidebar from "./AdminSidebar";

// Define the type for a log entry
type LogEntry = {
  id: string;
  activity: string;
  userName: string;
  role: string; // Add role
  timestamp: string;
};

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Initial fetch of logs
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(firestore, "logs"), orderBy("timestamp", "desc"), limit(10)),
      (snapshot) => {
        const logsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          activity: doc.data().activity,
          userName: doc.data().userName,
          role: doc.data().role, // Extract the role from Firestore
          timestamp: doc.data().timestamp.toDate().toLocaleString(),
        }));

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLogs(logsData);
        setLastVisible(lastDoc);
      }
    );

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // Fetch more logs for pagination
  const fetchMoreLogs = async () => {
    if (!lastVisible) return;
    try {
      setLoading(true);
      const logsCollection = collection(firestore, "logs");
      const logsQuery = query(
        logsCollection,
        orderBy("timestamp", "desc"),
        startAfter(lastVisible),
        limit(10)
      );

      const logsSnapshot = await getDocs(logsQuery);
      const lastVisibleDoc = logsSnapshot.docs[logsSnapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);

      const newLogs: LogEntry[] = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        activity: doc.data().activity,
        userName: doc.data().userName,
        role: doc.data().role, // Extract the role from Firestore
        timestamp: doc.data().timestamp.toDate().toLocaleString(),
      }));

      setLogs((prevLogs) => [...prevLogs, ...newLogs]);
    } catch (error) {
      console.error("Error fetching more logs: ", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs based on activity description, name, and date
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const logsCollection = collection(firestore, "logs");
      let logsQuery = query(logsCollection, orderBy("timestamp", "desc"));

      // Filter by activity description
      if (searchTerm) {
        logsQuery = query(
          logsCollection,
          where("activity", ">=", searchTerm),
          where("activity", "<=", searchTerm + "\uf8ff"),
          orderBy("activity", "asc")
        );
      }

      // Filter by user name
      if (searchName) {
        logsQuery = query(
          logsCollection,
          where("userName", ">=", searchName),
          where("userName", "<=", searchName + "\uf8ff"),
          orderBy("userName", "asc")
        );
      }

      // Filter by date
      if (searchDate) {
        const startDate = Timestamp.fromDate(new Date(searchDate));
        const endDate = Timestamp.fromDate(new Date(searchDate + "T23:59:59"));
        logsQuery = query(
          logsCollection,
          where("timestamp", ">=", startDate),
          where("timestamp", "<=", endDate)
        );
      }

      const logsSnapshot = await getDocs(logsQuery);
      const logsData: LogEntry[] = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        activity: doc.data().activity,
        userName: doc.data().userName,
        role: doc.data().role, // Extract the role from Firestore
        timestamp: doc.data().timestamp.toDate().toLocaleString(),
      }));

      setLogs(logsData);
    } catch (error) {
      console.error("Error searching logs: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-activity-logs">
      <AdminSidebar />
      <div className="activity-logs-content">
        <h2>Activity Logs</h2>

        {/* Search form */}
        <form onSubmit={handleSearch} className="search-filter-form">
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <input
            type="date"
            placeholder="Search by date..."
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <div className="logs-list">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="log-item">
                <p className="log-user-name">
                  {log.userName} ({log.role}) {/* Display user role here */}
                </p>
                <p>
                  {log.activity}
                  <span className="log-timestamp">{log.timestamp}</span>
                </p>
              </div>
            ))
          ) : (
            <p>No recent activities found.</p>
          )}
        </div>

        {/* Load More Logs */}
        {lastVisible && (
          <button onClick={fetchMoreLogs} disabled={loading}>
            {loading ? "Loading..." : "Load More Logs"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
