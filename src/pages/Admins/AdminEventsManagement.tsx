//TEMPLATE LANG TO THIS IS NOT FULLY FUNCTIONAL

import React, { useState, useEffect } from 'react';
import { firestore } from '../../services/firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

const AdminEventsManagement: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]); // Store events data
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '' });
  const [editingEvent, setEditingEvent] = useState<any>(null); // Store data of event being edited

  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch events from Firestore
  const fetchEvents = async () => {
    try {
      const eventsCollection = collection(firestore, 'events');
      const eventSnapshot = await getDocs(eventsCollection);
      const eventsList = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(eventsList);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  // Handle form submission for adding or editing events
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEvent) {
      // Edit event
      const eventDoc = doc(firestore, 'events', editingEvent.id);
      await updateDoc(eventDoc, newEvent);
      setEditingEvent(null); // Reset editing state
    } else {
      // Add new event
      await addDoc(collection(firestore, 'events'), newEvent);
    }

    // Reset new event state and fetch updated events
    setNewEvent({ title: '', description: '', date: '', location: '' });
    fetchEvents();
  };

  // Handle delete event
  const handleDelete = async (id: string) => {
    try {
      const eventDoc = doc(firestore, 'events', id);
      await deleteDoc(eventDoc);
      fetchEvents(); // Fetch updated events list
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  // Handle edit event
  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setNewEvent({ title: event.title, description: event.description, date: event.date, location: event.location });
  };

  return (
    <div className="admin-events-management">
      <h2>Manage Events</h2>
      
      {/* Event Form for Add/Edit */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Event Title</label>
          <input 
            type="text" 
            value={newEvent.title} 
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} 
            required 
          />
        </div>
        <div className="form-group">
          <label>Event Description</label>
          <textarea 
            value={newEvent.description} 
            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} 
            required 
          />
        </div>
        <div className="form-group">
          <label>Event Date</label>
          <input 
            type="date" 
            value={newEvent.date} 
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} 
            required 
          />
        </div>
        <div className="form-group">
          <label>Event Location</label>
          <input 
            type="text" 
            value={newEvent.location} 
            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} 
            required 
          />
        </div>
        <button type="submit">{editingEvent ? 'Update Event' : 'Add Event'}</button>
      </form>
      
      {/* Events List */}
      <div className="events-list">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Date</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length > 0 ? (
              events.map((event) => (
                <tr key={event.id}>
                  <td>{event.title}</td>
                  <td>{event.description}</td>
                  <td>{event.date}</td>
                  <td>{event.location}</td>
                  <td>
                    <button onClick={() => handleEdit(event)}>Edit</button>
                    <button onClick={() => handleDelete(event.id)}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>No events found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminEventsManagement;
