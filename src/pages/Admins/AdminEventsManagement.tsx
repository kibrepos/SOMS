import React, { useState, useEffect } from 'react';
import { firestore } from '../../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

const AdminEventsManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all organizations
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const orgCollection = collection(firestore, 'organizations');
      const orgSnapshot = await getDocs(orgCollection);
      const orgList = orgSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOrganizations(orgList);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch events for a selected organization
  const fetchEvents = async (orgName: string) => {
    setLoading(true);
    try {
      const eventsCollection = collection(firestore, `events/${orgName}/event`);
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventList = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventList);
      setSelectedOrg(orgName);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <div className="admin-events-management">
      <h2>Admin Events Management</h2>

      {/* 1. Organization List */}
      {!selectedOrg && !selectedEvent && (
        <>
          <h3>Organizations</h3>
          {loading ? (
            <p>Loading organizations...</p>
          ) : (
            <ul>
              {organizations.map((org) => (
                <li key={org.id}>
                  <span>{org.id}</span>
                  <button onClick={() => fetchEvents(org.id)}>View Events</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* 2. Event List */}
      {selectedOrg && !selectedEvent && (
        <>
          <h3>Events for Organization: {selectedOrg}</h3>
          <button onClick={() => setSelectedOrg(null)}>Back to Organizations</button>
          {loading ? (
            <p>Loading events...</p>
          ) : events.length > 0 ? (
            <ul>
              {events.map((event) => (
                <li key={event.id}>
                  <span>{event.title || 'No Title'}</span>
                  <button onClick={() => setSelectedEvent(event)}>View Details</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No events found for this organization.</p>
          )}
        </>
      )}

      {/* 3. Event Details */}
      {selectedEvent && (
        <>
          <h3>Event Details</h3>
          <p><strong>Title:</strong> {selectedEvent.title || 'N/A'}</p>
          <p><strong>Description:</strong> {selectedEvent.description || 'N/A'}</p>
          <p><strong>Venue:</strong> {selectedEvent.venue || 'N/A'}</p>
          <p><strong>Event Head:</strong> {selectedEvent.eventHead || 'N/A'}</p>
          <p><strong>Created By:</strong> {selectedEvent.createdBy || 'N/A'}</p>
          <p>
            <strong>Created At:</strong>{' '}
            {selectedEvent.createdAt?.toDate
              ? selectedEvent.createdAt.toDate().toLocaleString()
              : selectedEvent.createdAt || 'N/A'}
          </p>
          {/* Display event dates */}
          {selectedEvent.eventDates && (
            <div>
              <strong>Event Dates:</strong>
              <ul>
                {selectedEvent.eventDates.map((date: any, index: number) => (
                  <li key={index}>
                    Start: {new Date(date.startDate).toLocaleString()} | End: {new Date(date.endDate).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Display image */}
          {selectedEvent.imageUrl && (
            <div>
              <strong>Event Image:</strong>
              <br />
              <img
                src={selectedEvent.imageUrl}
                alt="Event"
                style={{ width: '300px', marginTop: '10px' }}
              />
            </div>
          )}
          <br />
          <button onClick={() => setSelectedEvent(null)}>Back to Events</button>
        </>
      )}
    </div>
  );
};

export default AdminEventsManagement;
