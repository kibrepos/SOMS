import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { doc, getDocs, updateDoc, collection,deleteDoc, setDoc,getDoc} from 'firebase/firestore';
import { firestore } from '../../services/firebaseConfig';
import Header from '../../components/Header';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth'; 
import { onAuthStateChanged, User } from 'firebase/auth';
import StudentPresidentSidebar from './StudentPresidentSidebar';
import { useParams,useNavigate  } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash,faSync } from '@fortawesome/free-solid-svg-icons';
import '../../styles/TaskManagement.css';

interface Task {
    id: string;
    event?: string;
    title: string;
    description: string;
    assignedTo: string[];
    assignedToNames: string[];
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
const [error, setError] = useState<string | null>(null);
const { organizationName } = useParams<{ organizationName: string }>();
const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
const [submissionsTask, setSubmissionsTask] = useState<Task | null>(null);
const navigate = useNavigate(); // For navigation
const [filterByEvent, setFilterByEvent] = useState("All"); // Event filter
const [filterByStatus, setFilterByStatus] = useState("All"); // Status filter
const [searchQuery, setSearchQuery] = useState(""); // For search functionality
const [sortOrder, setSortOrder] = useState("asc"); // For sorting (asc or desc) 
const [selectedDate, setSelectedDate] = useState(""); // For date filter
const [filterDate, setFilterDate] = useState("");

const openEditModal = (task: Task) => {
  setTaskToEdit(task);
  setIsEditModalOpen(true);
};

const closeEditModal = () => {
  setTaskToEdit(null);
  setIsEditModalOpen(false);
};
const openSubmissionsModal = (task: Task) => {
  setSubmissionsTask(task);
  setIsSubmissionsModalOpen(true);
};

const closeSubmissionsModal = () => {
  setSubmissionsTask(null);
  setIsSubmissionsModalOpen(false);
};
const filteredTasks = tasks
  .filter((task) => {
    // Filter by event
    if (filterByEvent === "All") return true;
    return task.event === filterByEvent;
  })
  .filter((task) => {
    // Filter by status
    if (filterByStatus === "All") return true;
    return task.taskStatus === filterByStatus;
  })
  .filter((task) => {
    // Filter by search query
    if (!searchQuery) return true;
    return (
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
  })
  .filter((task) => {
    if (!selectedDate) return true;
    return task.dueDate === selectedDate || task.startDate === selectedDate;
  })
  .sort((a, b) => {
    // Sort by due date
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

const handleEditTask = async (e: FormEvent) => {
  e.preventDefault();

  if (!taskToEdit || !organizationName) {
      alert("Missing task to edit or organization name.");
      return;
  }

  // Validate that the due date is not earlier than the start date
  if (new Date(newTaskDueDate || taskToEdit.dueDate) < new Date(newTaskStartDate || taskToEdit.startDate)) {
      alert("Due date cannot be earlier than the start date.");
      return;
  }

  try {
      // Upload attachments if any
      const attachmentURLs = await Promise.all(
          attachments.map(async (file) => {
              const storageRef = ref(storage, `tasks/${Date.now()}-${file.name}`);
              await uploadBytes(storageRef, file);
              return await getDownloadURL(storageRef);
          })
      );

      // Update only the necessary fields
      const updatedFields = {
          title: newTaskTitle.trim() || taskToEdit.title,
          description: newTaskDescription.trim() || taskToEdit.description,
          assignedTo: assignedTo.length > 0 ? assignedTo : taskToEdit.assignedTo,
          startDate: newTaskStartDate || taskToEdit.startDate,
          dueDate: newTaskDueDate || taskToEdit.dueDate,
          attachments: [...(taskToEdit.attachments || []), ...attachmentURLs],
      };

      // Reference the correct document path
      const taskDocRef = doc(
          firestore,
          `tasks/${organizationName}/AllTasks/${taskToEdit.id}`
      );

      // Update the document with the specified fields
      await updateDoc(taskDocRef, updatedFields);

      // Update local state
      setTasks((prev) =>
          prev.map((task) =>
              task.id === taskToEdit.id ? { ...task, ...updatedFields } : task
          )
      );

      closeEditModal();
      alert("Task updated successfully!");
  } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update the task. Please try again.");
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

  
  const closeDeleteModal = () => {
    setTaskToDelete(null);
    setIsDeleteModalOpen(false);
  };
  
  const handleDeleteTask = async () => {
    // Determine if it's a bulk delete or single delete
    const tasksToDelete = taskToDelete ? [taskToDelete.id] : assignedTo;
  
    if (tasksToDelete.length === 0 || !organizationName) {
      alert("No tasks selected for deletion or organization name is missing.");
      return;
    }
  
    try {
      // Delete each task document from Firestore
      await Promise.all(
        tasksToDelete.map(async (taskId) => {
          const taskDocRef = doc(
            firestore,
            `tasks/${organizationName}/AllTasks/${taskId}`
          );
          await deleteDoc(taskDocRef);
        })
      );
  
      // Update local state to remove the deleted tasks
      setTasks((prev) => prev.filter((task) => !tasksToDelete.includes(task.id)));
  
      // Clear selected tasks for bulk delete
      if (!taskToDelete) {
        setAssignedTo([]);
      }
  
      // Close the delete modal
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting task(s):", error);
      alert("Failed to delete task(s). Please try again.");
    } finally {
      // Ensure the modal is closed even if an error occurs
      closeDeleteModal();
    }
  };

  const openDeleteModalForBulk = () => {
    // If bulk delete (trash button), ensure we clear taskToDelete
    setTaskToDelete(null);
    setIsDeleteModalOpen(true);
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

  const fetchOrganizationData = async () => {
    try {
      // Ensure the organization name is decoded and trimmed
      const decodedOrganizationName = decodeURIComponent(organizationName || '').trim();
  
      if (!decodedOrganizationName) {
        console.error("Invalid organization name.");
        setError("Invalid organization name.");
        return;
      }
  
      // Reference the Firestore document
      const orgDocRef = doc(firestore, 'organizations', decodedOrganizationName);
      const orgDoc = await getDoc(orgDocRef);
  
      if (orgDoc.exists()) {
        const data = orgDoc.data();
        console.log("Fetched Organization Data:", data);
  
        // Set state with fallback defaults
        setTasks(data?.tasks || []);
        setAvailableMembers([...(data?.members || []), ...(data?.officers || [])]);
        setAvailableCommittees(data?.committees || []);
        setError(null); // Clear previous errors
      } else {
        console.error("Organization document does not exist.");
        setError("Organization not found.");
      }
    } catch (err) {
      console.error("Error fetching organization data:", err);
      setError("Failed to fetch organization data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  
  
  useEffect(() => {
    if (organizationName) {
      fetchOrganizationData(); // Fetch data when organizationName is available
    } else {
      console.error("Organization name is missing or invalid.");
      setError("Organization name is missing or invalid.");
    }
  }, [organizationName]); // Add organizationName as a dependency
  

  
  const fetchTasks = async () => {
    try {
      const taskCollectionRef = collection(
        firestore,
        `tasks/${organizationName}/AllTasks`
      );
  
      const querySnapshot = await getDocs(taskCollectionRef);
  
      const fetchedTasks: Task[] = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        submissions: doc.data().submissions || [], // Ensure submissions field is included
      })) as Task[];
  
      setTasks(fetchedTasks);
   

    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to fetch tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  
  useEffect(() => {
    if (organizationName) {
      fetchTasks(); // Fetch data when organizationName is available
    } else {
      console.error("Organization name is missing or invalid.");
      setError("Organization name is missing or invalid.");
    }
  }, [organizationName]);
  
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

    if (!organizationName || !currentUser) {
        alert("Missing organization name or user.");
        return;
    }

    // Validate that the due date is not earlier than the start date
    if (new Date(newTaskDueDate) < new Date(newTaskStartDate)) {
        alert("Due date cannot be earlier than the start date.");
        return;
    }

    try {
        // Get the current user's name
        const userDoc = await getDoc(doc(firestore, "students", currentUser.uid));
        const givenBy = userDoc.exists()
            ? `${userDoc.data()?.firstname} ${userDoc.data()?.lastname}`
            : "Unknown User";

        // Process attachments
        const attachmentURLs = await Promise.all(
            attachments.map(async (file) => {
                const storageRef = ref(storage, `tasks/${Date.now()}-${file.name}`);
                await uploadBytes(storageRef, file);
                return await getDownloadURL(storageRef);
            })
        );

        // Prepare assignedTo and assignedToNames arrays
        const assignedToWithNames = assignedTo.map((id) => {
            const member = availableMembers.find((m) => m.id === id);
            const committee = availableCommittees.find((c) => c.id === id);
            return {
                id,
                name: member?.name || committee?.name || "Unknown", // Get name or fallback to "Unknown"
            };
        });

        // Construct the new task object
        const newTask: Task = {
          id: Date.now().toString(),
          title: newTaskTitle,
          description: newTaskDescription,
          assignedTo: assignedToWithNames.map((entry) => entry.id), // Save only IDs
          assignedToNames: assignedToWithNames.map((entry) => entry.name), // Save only names
          startDate: newTaskStartDate,
          dueDate: newTaskDueDate,
          event: "General Task",
          taskStatus: "Started",
          givenBy,
          attachments: attachmentURLs,
        };
        
        

        // Save the new task to Firestore
        const taskDocRef = doc(
            firestore,
            `tasks/${organizationName}/AllTasks/${newTask.id}` // Use the new "AllTasks" structure
        );

        await setDoc(taskDocRef, newTask);

        // Update local state
        setTasks((prev) => [...prev, newTask]);
        closeNewTaskModal();
        alert("Task created successfully!");
    } catch (error) {
        console.error("Error creating task:", error);
        alert("Failed to create the task. Please try again.");
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
          <h2>All Tasks List</h2>
          <button
      className="my-tasks-btn"
      onClick={() => navigate(`/Organization/${organizationName}/mytasks`)}
    >
      View My Tasks
    </button>
          </div>
          <div className="tksks-filters">
    <select
              value={filterByEvent}
              onChange={(e) => setFilterByEvent(e.target.value)}
              className="tksks-event-dropdown"
            >
    <option value="All">All Events</option>
   

    {tasks
      .map((task) => task.event)
      .filter((event, index, self) => event && self.indexOf(event) === index) // Unique events
      .map((event) => (
        <option key={event} value={event}>
          {event}
        </option>
      ))}
  </select>

  <select
    value={filterByStatus}
    onChange={(e) => setFilterByStatus(e.target.value)}
    className="tksks-status-dropdown"
  >
    <option value="All">All Statuses</option>
    <option value="Started">Started</option>
    <option value="In Progress">In Progress</option>
    <option value="Completed">Completed</option>
    <option value="Overdue">Overdue</option>
  </select>
  <input
  type="date"
  className="tksks-date-dropdown"
  value={selectedDate} // Bind to selectedDate
  onChange={(e) => setSelectedDate(e.target.value)} // Update selectedDate state
  placeholder="Filter by Date"
/>
  <select
    value={sortOrder}
    onChange={(e) => setSortOrder(e.target.value)}
    className="tksks-sort-dropdown"
  >
    <option value="asc">ASC</option>
    <option value="desc">DESC</option>
  </select>

  <input
    type="text"
    placeholder="Search..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="tksks-search-input"
  />

  <button
    className="tksks-reset-btn"
    onClick={() => {
      setFilterByEvent("All");
      setFilterByStatus("All");
      setSearchQuery("");
      setSortOrder("asc");
      setSelectedDate(""); // Reset selected date
      setFilterDate(""); // Reset filter date
    }}
  >
    <FontAwesomeIcon icon={faSync} />
    Reset 
    
  </button>
  <button
  className={`tksks-trash-btn ${assignedTo.length > 0 ? 'enabled' : 'disabled'}`}
  onClick={() => {
    if (assignedTo.length > 0) {
      openDeleteModalForBulk(); // Open bulk delete modal
    }
  }}
  disabled={assignedTo.length === 0} // Disable if no tasks are selected
>
  <FontAwesomeIcon icon={faTrash} />
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
          <span className={`status-badge ${taskToView.taskStatus.replace(' ', '-').toLowerCase()}`}>
            {taskToView.taskStatus}
          </span>
        </p>
        
        
         
       
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
{isSubmissionsModalOpen && submissionsTask && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Submissions for Task: {submissionsTask.title}</h3>
      {submissionsTask.submissions && submissionsTask.submissions.length > 0 ? (
        <ul>
          {submissionsTask.submissions.map((submission, index) => (
            <li key={index}>
              <p><strong>Submitted by:</strong> {submission.memberName}</p>
              <p><strong>Type:</strong> {submission.contentType}</p>
              <p><strong>Date:</strong> {new Date(submission.date).toLocaleString()}</p>
              {submission.contentType === 'file' ? (
                <a href={submission.content} target="_blank" rel="noopener noreferrer">
                  View File
                </a>
              ) : (
                <p>{submission.content}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No submissions found for this task.</p>
      )}
      <div className="modal-actions">
        <button onClick={closeSubmissionsModal}>Close</button>
      </div>
    </div>
  </div>
)}


{isDeleteModalOpen && (
  <div className="modal-overlay">
    <div className="modal-content">
      {taskToDelete ? (
        <>
          <h3>Are you sure you want to delete this task?</h3>
          <p>Task: {taskToDelete.title}</p>
        </>
      ) : (
        <>
          <h3>Are you sure you want to delete the selected tasks?</h3>
          <p>Total tasks selected: {assignedTo.length}</p>
        </>
      )}
      <div className="modal-actions">
        <button onClick={handleDeleteTask}>Yes, Delete</button>
        <button onClick={closeDeleteModal}>Cancel</button>
      </div>
    </div>
  </div>
)}


            <button className="new-task-btn" onClick={openNewTaskModal}>
              + New Task
            </button>

          <table className="task-table">
            <thead>
              <tr>
              <th>
        <input
          type="checkbox"
          onChange={(e) => {
            const isChecked = e.target.checked;
            if (isChecked) {
              setAssignedTo(tasks.map((task) => task.id)); // Select all tasks
            } else {
              setAssignedTo([]); // Deselect all tasks
            }
          }}
        />
      </th>
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
            {filteredTasks.map((task) => (
    <tr key={task.id}>
     <td>
          <input
            type="checkbox"
            checked={assignedTo.includes(task.id)}
            onChange={() => handleCheckboxChange(task.id)}
          />
        </td>
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
  <span className={`status-badge ${task.taskStatus.replace(' ', '-').toLowerCase()}`}>
    {task.taskStatus}
  </span>
</td>


<td>
<div className="task-dropdown">
  <button className="action-btn">Action</button>
  <div className="task-dropdown-content">
  <button onClick={() => openViewModal(task)}>View</button>
      <button onClick={() => openEditModal(task)}>Edit</button>
      <button onClick={() => openSubmissionsModal(task)}>Submissions</button>
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
