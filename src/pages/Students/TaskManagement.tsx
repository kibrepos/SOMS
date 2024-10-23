import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import Header from '../../components/Header';
import { auth } from '../../services/firebaseConfig'; 
import { getAuth } from 'firebase/auth'; 
import { onAuthStateChanged, User } from 'firebase/auth';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import '../../styles/TaskManagement.css';

interface Task {
    id: string;
    event?: string;
    title: string;
    description: string;
    assignedTo: string[];
    startDate: string;
    dueDate: string;
    taskStatus: string;
    givenBy: string; 
  }
  

interface Member {
  id: string;
  name: string;
}

interface Committee {
  id: string;
  name: string;
}

const TaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [availableCommittees, setAvailableCommittees] = useState<Committee[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const auth = getAuth();
  const openNewTaskModal = () => setIsNewTaskModalOpen(true);
  const closeNewTaskModal = () => setIsNewTaskModalOpen(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
const openDeleteModal = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };
  
  const closeDeleteModal = () => {
    setTaskToDelete(null);
    setIsDeleteModalOpen(false);
  };
  
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
  
    try {
      const orgDocRef = doc(firestore, 'organizations', 'Bruno Mars');
      await updateDoc(orgDocRef, {
        tasks: arrayRemove(taskToDelete),
      });
  
      setTasks((prev) => prev.filter((task) => task.id !== taskToDelete.id));
      closeDeleteModal();
      alert('Task deleted successfully!');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete the task. Please try again.');
    }
  };
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
  });

  return () => unsubscribe(); // Cleanup on unmount
}, []);
  useEffect(() => {
    const fetchOrganizationData = async () => {
      const orgDoc = await getDoc(doc(firestore, 'organizations', 'Bruno Mars'));

      if (orgDoc.exists()) {
        const data = orgDoc.data();
        const allMembers = [...(data.members || []), ...(data.officers || [])];
        setAvailableMembers(allMembers);
        setAvailableCommittees(data.committees || []);
      }
    };

    fetchOrganizationData();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const orgDoc = await getDoc(doc(firestore, 'organizations', 'Bruno Mars'));

        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleCheckboxChange = (id: string) => {
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
  
    try {
      const currentUser = auth.currentUser; // Get current user
  
      if (!currentUser) {
        alert('No user is currently logged in.');
        return;
      }
  
      // Fetch user details from Firestore using their UID
      const userDoc = await getDoc(doc(firestore, 'students', currentUser.uid));
  
      let givenBy = 'Unknown User';
      if (userDoc.exists()) {
        const userData = userDoc.data();
        givenBy = `${userData.firstname} ${userData.lastname}`; // Get firstname and lastname
      }
  
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        description: newTaskDescription,
        assignedTo,
        startDate: newTaskStartDate,
        dueDate: newTaskDueDate,
        taskStatus: 'Started',
        givenBy, // Store user's full name
      };
  
      // Save task to Firestore
      const orgDocRef = doc(firestore, 'organizations', 'Bruno Mars');
      await updateDoc(orgDocRef, {
        tasks: arrayUnion(newTask),
      });
  
      setTasks((prev) => [...prev, newTask]);
      closeNewTaskModal();
      alert('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create the task. Please try again.');
    }
  };
  
  
  if (loading) return <div>Loading tasks...</div>;

  return (
    <div className="task-management-dashboard">
      <Header />
      <div className="task-container">
        <div className="task-sidebar">
          <StudentPresidentSidebar />
        </div>
        <div className="task-content">
          <div className="header-actions">
            <h2>Task List</h2>
            <button className="new-task-btn" onClick={openNewTaskModal}>
              + New Task
            </button>
          </div>

          {isNewTaskModalOpen && (
            <div className="task-modal-overlay">
              <div className="task-modal-content">
                <h3>Create New Task</h3>
                <form onSubmit={handleCreateTask}>
                  <input
                    type="text"
                    placeholder="Task Title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <textarea
                    placeholder="Task Description"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    required
                  />
                  <h4>Assign to Members and Officers:</h4>
                  <ul>
                    {availableMembers.map((member) => (
                      <li key={member.id}>
                        <input
                          type="checkbox"
                          onChange={() => handleCheckboxChange(member.id)}
                        />
                        {member.name}
                      </li>
                    ))}
                  </ul>
                  <h4>Assign to Committees:</h4>
                  <ul>
                    {availableCommittees.map((committee) => (
                      <li key={committee.id}>
                        <input
                          type="checkbox"
                          onChange={() => handleCheckboxChange(committee.id)}
                        />
                        {committee.name}
                      </li>
                    ))}
                  </ul>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={newTaskStartDate}
                    onChange={(e) => setNewTaskStartDate(e.target.value)}
                    required
                  />
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    required
                  />
                  <input type="file" onChange={handleFileChange} />
                  <div className="task-modal-actions">
                    <button type="submit">Create Task</button>
                    <button type="button" onClick={closeNewTaskModal}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
{isDeleteModalOpen && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Are you sure you want to delete this task?</h3>
      <p>Task: {taskToDelete?.title}</p>
      <div className="modal-actions">
        <button onClick={handleDeleteTask}>Yes, Delete</button>
        <button onClick={closeDeleteModal}>Cancel</button>
      </div>
    </div>
  </div>
)}

          <table className="task-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Event</th>
                <th>Tasks</th>
                <th>Given by</th>
                <th>Assigned to</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
  {tasks.map((task, index) => (
    <tr key={task.id}>
      <td>{index + 1}</td>
      <td>{task.event || 'General Task'}</td>
      <td>
        <strong>{task.title}</strong>
        <p>{task.description}</p> {/* Description under title */}
      </td>
      <td>{task.givenBy}</td> {/* Display full name */}
      <td>
        {task.assignedTo
          .map((id) => {
            const member = availableMembers.find((m) => m.id === id);
            const committee = availableCommittees.find((c) => c.id === id);
            return member?.name || committee?.name || id;
          })
          .join(', ')}
      </td>
      <td>
        {new Date(task.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </td>
      <td>
        {new Date(task.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </td>
      <td>
  <span className={`status-badge ${task.taskStatus.toLowerCase()}`}>
    {task.taskStatus}
  </span>
</td>

<td>
<div className="task-dropdown">
  <button className="action-btn">Action</button>
  <div className="task-dropdown-content">
    <button>View</button>
    <button onClick={() => openDeleteModal(task)}>Delete</button>
  </div>
</div>
</td>
    </tr>
  ))}
</tbody>

          </table>
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
