import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import Header from '../../components/Header';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth'; 
import { onAuthStateChanged, User } from 'firebase/auth';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import { useParams } from 'react-router-dom';
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
    attachments?: string[];
    
  }
  

interface Member {
  id: string;
  name: string;
}

interface Committee {
  id: string;
  name: string;
}
interface Submission {
  memberId: string;
  memberName: string; // The member's full name
  contentType: 'text' | 'file';
  content: string; // Stores either the text or the file URL
  date: string;
}interface Task {
  // Add this line to the Task interface:
  submissions?: Submission[];
}
const TaskManagement: React.FC = () => {
  const { orgName } = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
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
const [isViewModalOpen, setIsViewModalOpen] = useState(false);
const [taskToView, setTaskToView] = useState<Task | null>(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
const storage = getStorage(); // Initialize Firebase Storage
const openEditModal = (task: Task) => {
  setTaskToEdit(task);
  setIsEditModalOpen(true);
};

const closeEditModal = () => {
  setTaskToEdit(null);
  setIsEditModalOpen(false);
};

const handleEditTask = async (e: FormEvent) => {
  e.preventDefault();
  if (!taskToEdit || !orgName) return;

  try {
    const attachmentURLs = await Promise.all(
      attachments.map(async (file) => {
        const storageRef = ref(storage, `tasks/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      })
    );

    const updatedTask: Task = {
      ...taskToEdit,
      title: newTaskTitle || taskToEdit.title,
      description: newTaskDescription || taskToEdit.description,
      assignedTo: assignedTo.length > 0 ? assignedTo : taskToEdit.assignedTo,
      startDate: newTaskStartDate || taskToEdit.startDate,
      dueDate: newTaskDueDate || taskToEdit.dueDate,
      attachments: [...(taskToEdit.attachments || []), ...attachmentURLs],
    };

    const orgDocRef = doc(firestore, 'organizations', orgName);
    const orgDoc = await getDoc(orgDocRef);

    if (orgDoc.exists()) {
      const updatedTasks = (orgDoc.data()?.tasks || []).map((task: Task) =>
        task.id === taskToEdit.id ? updatedTask : task
      );


      await updateDoc(orgDocRef, { tasks: updatedTasks });
      setTasks(updatedTasks);
      closeEditModal();
      alert('Task updated successfully!');
    }
  } catch (error) {
    console.error('Error updating task:', error);
    alert('Failed to update the task. Please try again.');
  }
};




const openViewModal = (task: Task) => {
  setTaskToView(task);
  setIsViewModalOpen(true);
};

const closeViewModal = () => {
  setTaskToView(null);
  setIsViewModalOpen(false);
};
const openDeleteModal = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };
  
  const closeDeleteModal = () => {
    setTaskToDelete(null);
    setIsDeleteModalOpen(false);
  };
  
  const handleDeleteTask = async () => {
    if (!taskToDelete || !orgName) return;
  
    try {
      const orgDocRef = doc(firestore, 'organizations', orgName);
      const orgDoc = await getDoc(orgDocRef);
  
      if (orgDoc.exists()) {
        const updatedTasks = (orgDoc.data()?.tasks || []).filter(
          (task: Task) => task.id !== taskToDelete.id
        );
  
        await updateDoc(orgDocRef, { tasks: updatedTasks });
        setTasks(updatedTasks);
        closeDeleteModal();
        alert('Task deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete the task. Please try again.');
    }
  };
  
  
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user); // Set the current logged-in user
      } else {
        setCurrentUser(null);
      }
    });
  
    return () => unsubscribe(); // Cleanup on unmount
  }, []);
  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!orgName) return;
  
      try {
        const orgDocRef = doc(firestore, 'organizations', orgName);
        const orgDoc = await getDoc(orgDocRef);
  
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          setTasks(data.tasks || []);
          setAvailableMembers([...(data.members || []), ...(data.officers || [])]);
          setAvailableCommittees(data.committees || []);
        }
      } catch (error) {
        console.error('Error fetching organization data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchOrganizationData();
  }, [orgName]);
  
  
  useEffect(() => {
    const fetchTasksForOrganization = async () => {
      try {
        const orgDocRef = orgName
  ? doc(firestore, 'organizations', orgName)
  : null;

if (!orgDocRef) {
  console.error('Invalid organization name');
  return;
}

        const orgDoc = await getDoc(orgDocRef);
  
        if (orgDoc.exists()) {
          const data = orgDoc.data();
          const organizationTasks: Task[] = data.tasks || [];
  
          // Load all tasks without filtering, as this view is for higher-ups
          setTasks(organizationTasks);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchTasksForOrganization();
  }, []);
  
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files)); // Store multiple files in state
    }
  };
  const handleCheckboxChange = (id: string) => {
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  
  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgName || !currentUser) return;
  
    try {
      const userDoc = await getDoc(doc(firestore, 'students', currentUser.uid));
      const givenBy = userDoc.exists()
        ? `${userDoc.data()?.firstname} ${userDoc.data()?.lastname}`
        : 'Unknown User';
  
      const attachmentURLs = await Promise.all(
        attachments.map(async (file) => {
          const storageRef = ref(storage, `tasks/${Date.now()}-${file.name}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );
  
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        description: newTaskDescription,
        assignedTo,
        startDate: newTaskStartDate,
        dueDate: newTaskDueDate,
        taskStatus: 'Started',
        givenBy,
        attachments: attachmentURLs,
      };
  
      const orgDocRef = doc(firestore, 'organizations', orgName);
      await updateDoc(orgDocRef, { tasks: arrayUnion(newTask) });
  
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
                 <label>File Attachment</label>
<input type="file" multiple onChange={handleFileChange} />
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
          {isViewModalOpen && taskToView && (
  <div className="modal-overlay">
    <div className="modal-content view-task-modal">
      <h3>Task Details</h3>
      <div className="modal-task-info">
        <div className="modal-row">
          <p><strong>Event:</strong> {taskToView.event || 'General Task'}</p>
          <p><strong>Title:</strong> {taskToView.title}</p>
          <p><strong>Description:</strong> {taskToView.description}</p>
        </div>
        <div className="modal-row">
          <p><strong>Given by:</strong> {taskToView.givenBy}</p>
          <p><strong>Assigned to:</strong> 
            {taskToView.assignedTo.map((id) => {
              const member = availableMembers.find((m) => m.id === id);
              const committee = availableCommittees.find((c) => c.id === id);
              return member?.name || committee?.name || id;
            }).join(', ')}
          </p>
        </div>
        <div className="modal-row">
          <p><strong>Start Date:</strong> 
            {new Date(taskToView.startDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p><strong>Due Date:</strong> 
            {new Date(taskToView.dueDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <p><strong>Status:</strong> 
          <span className={`status-badge ${taskToView.taskStatus.toLowerCase()}`}>
            {taskToView.taskStatus}
          </span>
        </p>
        
        <h4>Submissions:</h4>
        {taskToView.submissions && taskToView.submissions.length > 0 ? (
          <ul>
         
            {taskToView.submissions.map((submission, index) => (
              <li key={index}>
                <p><strong>Submitted by:</strong> {submission.memberName}</p>
                <p><strong>Date:</strong> {new Date(submission.date).toLocaleString()}</p>
                {submission.contentType === 'file' ? (
                  <a href={submission.content} target="_blank" rel="noopener noreferrer">
                    View File Submission
                  </a>
                ) : (
                  <p>Text Submission: {submission.content}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No submissions yet.</p>
        )}
<ul>
<p><strong>File Attachments:</strong></p>
  {taskToView?.attachments && taskToView.attachments.length > 0 ? (
    taskToView.attachments.map((url, index) => (
      <li key={index}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          View Attachment {index + 1}
        </a>
      </li>
    ))
  ) : (
    <p>No attachments</p>
  )}
</ul>



      </div>
      <div className="modal-actions">
        <button onClick={() => openEditModal(taskToView)}>Edit</button>
        <button onClick={closeViewModal}>Close</button>
      </div>
    </div>
  </div>
)}
{isEditModalOpen && taskToEdit && (
  <div className="modal-overlay">
    <div className="modal-content edit-task-modal">
      <h3>Edit Task</h3>
      <form onSubmit={handleEditTask}>
        <label>Task Title</label>
        <input
          type="text"
          value={newTaskTitle || taskToEdit.title}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          required
        />

        <label>Task Description</label>
        <textarea
          value={newTaskDescription || taskToEdit.description}
          onChange={(e) => setNewTaskDescription(e.target.value)}
          required
        />

        <h4>Assign to Members and Officers:</h4>
        <ul>
          {availableMembers.map((member) => (
            <li key={member.id}>
              <input
                type="checkbox"
                checked={assignedTo.includes(member.id)}
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
                checked={assignedTo.includes(committee.id)}
                onChange={() => handleCheckboxChange(committee.id)}
              />
              {committee.name}
            </li>
          ))}
        </ul>

        <label>Start Date</label>
        <input
          type="date"
          value={newTaskStartDate || taskToEdit.startDate}
          onChange={(e) => setNewTaskStartDate(e.target.value)}
          required
        />

        <label>Due Date</label>
        <input
          type="date"
          value={newTaskDueDate || taskToEdit.dueDate}
          onChange={(e) => setNewTaskDueDate(e.target.value)}
          required
        />

        <label>File Attachments</label>
        <input type="file" multiple onChange={handleFileChange} />

        <p><strong>Current Attachments:</strong></p>
        <ul>
          {taskToEdit.attachments?.map((url, index) => (
            <li key={index}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {`Attachment ${index + 1}`}
              </a>
            </li>
          ))}
        </ul>

        <div className="modal-actions">
          <button type="submit">Save Changes</button>
          <button type="button" onClick={closeEditModal}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}


{isDeleteModalOpen && taskToDelete && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Are you sure you want to delete this task?</h3>
      <p>Task: {taskToDelete.title}</p>
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
  <button onClick={() => openViewModal(task)}>View</button>
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
