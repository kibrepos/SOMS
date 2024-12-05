//TEMPLATE LANG TO THE CODE DOESN'T REALLY WORK

import React, { useState, useEffect } from 'react';
import { firestore } from '../../services/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

const AdminReportingAnalytics: React.FC = () => {
  const [userStats, setUserStats] = useState<any>({ labels: [], data: [] }); // User engagement statistics (e.g., sign-ups, logins)
  const [eventStats, setEventStats] = useState<any>({ labels: [], data: [] }); // Event stats (e.g., attendance over time)

  useEffect(() => {
    fetchUserStats();
    fetchEventStats();
  }, []);

  // Fetch user engagement stats (e.g., daily sign-ups or logins)
  const fetchUserStats = async () => {
    try {
      const usersCollection = collection(firestore, 'logs');
      const logsSnapshot = await getDocs(usersCollection);
      
      const userActivityData: any = {
        labels: [],
        data: []
      };

      // Assuming logs contain timestamps and some activity type
      logsSnapshot.docs.forEach(doc => {
        const log = doc.data();
        const date = new Date(log.timestamp.seconds * 1000).toLocaleDateString(); // convert Firestore timestamp to date string

        if (!userActivityData.labels.includes(date)) {
          userActivityData.labels.push(date);
          userActivityData.data.push(1);
        } else {
          const index = userActivityData.labels.indexOf(date);
          userActivityData.data[index]++;
        }
      });

      setUserStats(userActivityData);
    } catch (err) {
      console.error('Error fetching user activity stats:', err);
    }
  };

  // Fetch event statistics (e.g., number of participants per event or over time)
  const fetchEventStats = async () => {
    try {
      const eventsCollection = collection(firestore, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
      
      const eventParticipationData: any = {
        labels: [],
        data: []
      };

      // Assuming each event has a 'participants' field (an array of user ids or count)
      eventsSnapshot.docs.forEach(doc => {
        const event = doc.data();
        const eventDate = new Date(event.startDate.seconds * 1000).toLocaleDateString();

        if (!eventParticipationData.labels.includes(eventDate)) {
          eventParticipationData.labels.push(eventDate);
          eventParticipationData.data.push(event.participants ? event.participants.length : 0);
        } else {
          const index = eventParticipationData.labels.indexOf(eventDate);
          eventParticipationData.data[index] += event.participants ? event.participants.length : 0;
        }
      });

      setEventStats(eventParticipationData);
    } catch (err) {
      console.error('Error fetching event stats:', err);
    }
  };

  // User engagement chart (Line Chart)
  const userEngagementChart = {
    labels: userStats.labels,
    datasets: [
      {
        label: 'User Activity',
        data: userStats.data,
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66, 165, 245, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  // Event participation chart (Line Chart)
  const eventParticipationChart = {
    labels: eventStats.labels,
    datasets: [
      {
        label: 'Event Participation',
        data: eventStats.data,
        borderColor: '#66BB6A',
        backgroundColor: 'rgba(102, 187, 106, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="admin-reporting-analytics">
      <h2>Reporting & Analytics</h2>

      <div className="analytics-container">
        {/* User Engagement Chart */}
        <div className="chart-container">
          <h3>User Engagement Over Time</h3>
        </div>

        {/* Event Participation Chart */}
        <div className="chart-container">
          <h3>Event Participation Over Time</h3>
        </div>
      </div>

      <div className="analytics-summary">
        <div className="summary-card">
          <h4>Total Users</h4>
          <p>500</p> {/* You can fetch the real number of users from Firestore */}
        </div>
        <div className="summary-card">
          <h4>Total Events</h4>
          <p>20</p> {/* You can fetch the real number of events from Firestore */}
        </div>
        <div className="summary-card">
          <h4>Total Participants</h4>
          <p>1500</p> {/* You can calculate total participants based on your events data */}
        </div>
      </div>
    </div>
  );
};

export default AdminReportingAnalytics;
