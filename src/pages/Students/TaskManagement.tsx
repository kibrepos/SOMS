import React, { useEffect, useState, ChangeEvent, FormEvent,useRef } from 'react';
import { doc, updateDoc, collection,deleteDoc, setDoc,getDoc,onSnapshot,getDocs } from 'firebase/firestore';
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
import { showToast } from '../../components/toast';

interface Task {
  id: string;
  event?: string;
  title: string;
  description: string;
  assignedTo: string[]; // Deprecated or used for backward compatibility
  assignedToNames?: string[];
  assignedMembers: string[]; // New property
  assignedCommittees: string[]; // New property
  startDate: string;
  dueDate: string;
  taskStatus: 
    | 'In-Progress' 
    | 'Started' 
    | 'Completed' 
    | 'Overdue'
    | 'Extended' // New status for extended tasks
    | 'Extended-Overdue'; // New status for extended tasks that were overdue
  givenBy: string;
  attachments?: string[];
  submissions?: Submission[];
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
  textContent?: string; // Optional field for text content
  fileAttachments?: string[]; // Array of file URLs for attachments
  date: string;
}
interface Event {
  id: string;
  title?: string; // Make title optional if it might be missing
  startDate?: string;
  endDate?: string;
  [key: string]: any; // Allow other fields
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
const [showMemberDropdown, setShowMemberDropdown] = useState(false);
const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // Selected members
const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]); // Selected committees
const fileInputRef = useRef<HTMLInputElement | null>(null);
const [memberSearch, setMemberSearch] = useState(""); // To filter dropdown
const [attachmentURLs, setAttachmentURLs] = useState<string[]>([]); // For URLs
const [activeTab, setActiveTab] = useState(1); // Active tab state (default: 1)
const [comments, setComments] = useState<{ text: string; user: any; timestamp: number }[][]>([]);
const [commentText, setCommentText] = useState("");
const now = new Date();
const formattedNow = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
const [newTaskEvent, setNewTaskEvent] = useState("General Task");



useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      setCurrentUser(user);
      fetchTasks()
    } else {
      setCurrentUser(null);
    }
  });

  return () => unsubscribe(); // Cleanup on unmount
}, []);

useEffect(() => {
  const fetchEvents = async () => {
    if (!organizationName) return;

    try {
      const eventCollectionRef = collection(firestore, `events/${organizationName}/event`);
      const querySnapshot = await getDocs(eventCollectionRef);
      const events: Event[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAvailableEvents(events);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  fetchEvents();
}, [organizationName]);

useEffect(() => {
  const fetchData = async () => {
    if (!organizationName) {
      console.error("Organization name is missing or invalid.");
      setError("Organization name is missing or invalid.");
      return;
    }

    try {
      // First, fetch organization data
      await fetchOrganizationData();
      console.log("Organization data fetched successfully.");

      // Then, fetch tasks
      fetchTasks();
    } catch (err) {
      console.error("Error while fetching data:", err);
      setError("Failed to load data. Please try again.");
    }
  };

  fetchData(); // Run the chained fetches
}, [organizationName])

const handleAddComment = async (submissionIndex: number) => {
  if (!commentText.trim()) {
    showToast("Comment cannot be empty!", "error");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    showToast("You must be logged in to comment.", "error");
    return;
  }

  // Fetch user data from Firestore
  const userDoc = await getDoc(doc(firestore, "students", user.uid));
  const userData = userDoc.exists() ? userDoc.data() : null;

  if (!userData) {
    showToast("User data not found.", "error");
    return;
  }

  const newComment = {
    text: commentText,
    user: {
      name: `${userData.firstname} ${userData.lastname}`,
      profilePicUrl: userData.profilePicUrl,
    },
    timestamp: Date.now(),
  };

  try {
    // Fetch the existing task
    const taskDocRef = doc(firestore, `tasks/${organizationName}/AllTasks/${submissionsTask?.id}`);
    const taskDoc = await getDoc(taskDocRef);

    if (!taskDoc.exists()) {
      throw new Error("Task document does not exist.");
    }

    const taskData = taskDoc.data();
    const submissions = taskData.submissions || []; // Ensure submissions array exists

    // Add the comment to the correct submission
    if (!submissions[submissionIndex]) {
      throw new Error(`Submission at index ${submissionIndex} does not exist.`);
    }

    if (!submissions[submissionIndex].comments) {
      submissions[submissionIndex].comments = []; // Initialize comments array if not present
    }

    submissions[submissionIndex].comments.push(newComment); // Add the new comment

    // Update Firestore with the modified submissions array
    await updateDoc(taskDocRef, { submissions });

    // Update local state
    setComments((prev) => {
      const updatedComments = [...prev];
      if (!updatedComments[submissionIndex]) {
        updatedComments[submissionIndex] = [];
      }
      updatedComments[submissionIndex].push(newComment);
      return updatedComments;
    });

    setSubmissionsTask((prev) =>
      prev ? { ...prev, submissions } : null
    ); // Update the local submissionsTask

    setCommentText("");
    showToast("Comment added successfully!", "success");
  } catch (error) {
    console.error("Error saving comment:", error);
    showToast("Failed to add the comment. Please try again.", "error");
  }
};



const openEditModal = (task: Task) => {
  setTaskToEdit(task);

  setSelectedMembers(task.assignedMembers);
  setSelectedCommittees(task.assignedCommittees);

  setAttachmentURLs(task.attachments || []);
  setAttachments([]); // Clear new attachments for editing

  setNewTaskStartDate(task.startDate);
  setNewTaskDueDate(task.dueDate);
  setNewTaskEvent(task.event || "General Task");
  setIsEditModalOpen(true);
};




const closeEditModal = () => {
  setTaskToEdit(null); // Clear the current task being edited
  setNewTaskTitle(""); // Reset the task title
  setNewTaskDescription(""); // Reset the task description
  setNewTaskStartDate(""); // Reset the start date
  setNewTaskDueDate(""); // Reset the due date
  setSelectedMembers([]); // Clear selected members
  setSelectedCommittees([]); // Clear selected committees
  setAttachments([]); // Clear new attachments
  setAttachmentURLs([]); // Clear attachment URLs
  setIsEditModalOpen(false); // Close the modal
};



const openSubmissionsModal = async (task: Task) => {
  setSubmissionsTask(task);
  setIsSubmissionsModalOpen(true);

  try {
    // Fetch the task document from Firestore
    const taskDocRef = doc(firestore, `tasks/${organizationName}/AllTasks/${task.id}`);
    const taskDoc = await getDoc(taskDocRef);

    if (taskDoc.exists()) {
      const taskData = taskDoc.data();
      const submissionsComments = taskData.submissions?.map((submission: any) => submission.comments || []);
      setComments(submissionsComments || []); // Initialize comments
    } else {
      console.error("Task document does not exist.");
    }
  } catch (error) {
    console.error("Error fetching comments:", error);
  }
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
    // Define the order of task statuses
    const statusOrder = {
      "In-Progress": 0,
      "Started": 1,
      "Extended":2,
      "Extended-Overdue":3,
      "Completed":4,   
      "Overdue":5
    };

    // First, compare by task status
    let statusComparison = statusOrder[a.taskStatus] - statusOrder[b.taskStatus];

    // If we're sorting in descending order, reverse the status comparison
    if (sortOrder === "desc") {
      statusComparison = statusOrder[b.taskStatus] - statusOrder[a.taskStatus];
    }

    if (statusComparison !== 0) return statusComparison;

    // If statuses are the same, sort by due date
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();

    // Sort by due date, either ascending or descending
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });



  const handleEditTask = async (e: FormEvent) => {
  e.preventDefault();

  if (!taskToEdit || !organizationName) {
    showToast("Missing task to edit or organization name.", "error");
    return;
  }

  // Validate dates
  const currentDate = new Date();
  const updatedDueDate = new Date(newTaskDueDate || taskToEdit.dueDate);
  const updatedStartDate = new Date(newTaskStartDate || taskToEdit.startDate);

  if (updatedDueDate < updatedStartDate) {
    showToast("Due date cannot be earlier than the start date.", "error");
    return;
  }

  if (selectedMembers.length === 0 && selectedCommittees.length === 0) {
    showToast("You must assign the task to at least one member or committee.", "error");
    return;
  }

  try {
    // Upload new files
    const newAttachmentURLs = await Promise.all(
      attachments.map(async (file) => {
        const storageRef = ref(storage, `tasks/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      })
    );

    // Merge existing and new attachments
    const updatedAttachments = [
      ...(taskToEdit.attachments || []),
      ...newAttachmentURLs,
    ];

    // Determine the new status
    let newStatus: Task["taskStatus"];
    const wasOverdue =
      taskToEdit.taskStatus === "Overdue" || taskToEdit.taskStatus === "Extended-Overdue";

    if (wasOverdue && updatedDueDate > currentDate) {
      newStatus = "Extended-Overdue";
    } else if (updatedDueDate < currentDate) {
      newStatus = "Overdue";
    } else if (taskToEdit.taskStatus === "Completed") {
      newStatus = "Completed";
    } else {
      newStatus = "Extended";
    }

    const updatedFields = {
      title: newTaskTitle.trim() || taskToEdit.title,
      description: newTaskDescription.trim() || taskToEdit.description,
      assignedMembers: selectedMembers,
      assignedCommittees: selectedCommittees,
      startDate: newTaskStartDate || taskToEdit.startDate,
      dueDate: newTaskDueDate || taskToEdit.dueDate,
      attachments: updatedAttachments,
      taskStatus: newStatus,
    };

    // Update Firestore
    const taskDocRef = doc(
      firestore,
      `tasks/${organizationName}/AllTasks/${taskToEdit.id}`
    );
    await updateDoc(taskDocRef, updatedFields);

    // Update state
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskToEdit.id ? { ...task, ...updatedFields } : task
      )
    );

    if (taskToView?.id === taskToEdit.id) {
      setTaskToView((prev) => (prev ? { ...prev, ...updatedFields } : null));
    }

    // Reset modal
    closeEditModal();

    showToast("Task updated successfully!", "success");
  } catch (error) {
    console.error("Error updating task:", error);
    showToast("Failed to update the task. Please try again.", "error");
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

const handleMemberSelect = (memberId: string) => {
  if (!selectedMembers.includes(memberId)) {
    setSelectedMembers((prev) => [...prev, memberId]); // Add member to the selected list
  }
  setMemberSearch(""); // Reset the search term
  setShowMemberDropdown(false); // Close the dropdown after selection
};


  const closeDeleteModal = () => {
    setTaskToDelete(null);
    setIsDeleteModalOpen(false);
  };
  
  const handleDeleteTask = async () => {
    // Determine if it's a bulk delete or single delete
    const tasksToDelete = taskToDelete ? [taskToDelete.id] : assignedTo;
  
    if (tasksToDelete.length === 0 || !organizationName) {

      showToast("No tasks selected for deletion or organization name is missing.","error");
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
      showToast("Failed to delete task(s). Please try again.","error");
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
  
  const handleRemoveFile = (indexToRemove: number): void => {
    setAttachments((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };
  
  const handleCommitteeSelect = (committeeId: string) => {
    setSelectedCommittees((prev) =>
      prev.includes(committeeId)
        ? prev.filter((id) => id !== committeeId) // Remove if already selected
        : [...prev, committeeId] // Add if not selected
    );
  };
   

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
  
   
  const fetchTasks = () => {
    if (!organizationName) {
      console.error("Organization name is missing or invalid.");
      setError("Organization name is missing or invalid.");
      return;
    }
  
    try {
      const taskCollectionRef = collection(firestore, `tasks/${organizationName}/AllTasks`);
  
      const unsubscribe = onSnapshot(
        taskCollectionRef,
        async (querySnapshot) => {
          if (!querySnapshot.empty) {
            const now = new Date();
  
            const fetchedTasks: Task[] = querySnapshot.docs.map((doc) => {
              const data = doc.data();
  
              // Determine the task's current status
              let taskStatus = data.taskStatus;
              if (taskStatus === "Extended-Overdue" && new Date(data.dueDate) < now) {
                taskStatus = "Overdue"; // Update status to "Overdue" if the due date has passed
              } else if (taskStatus !== "Completed" && new Date(data.dueDate) < now) {
                taskStatus = "Overdue"; 
              }
  
              return {
                id: doc.id,
                ...data,
                taskStatus, // Updated task status
              } as Task;
            });
  
            // Update Firestore for tasks transitioning to "Overdue"
            const overdueTasks = fetchedTasks.filter(
              (task) => task.taskStatus === "Overdue"
            );
  
            try {
              await Promise.all(
                overdueTasks.map(async (task) => {
                  const taskDocRef = doc(
                    firestore,
                    `tasks/${organizationName}/AllTasks/${task.id}`
                  );
                  await updateDoc(taskDocRef, { taskStatus: "Overdue" });
                })
              );
              if (overdueTasks.length > 0) {
                console.log(`${overdueTasks.length} task(s) updated to Overdue.`);
              }
            } catch (error) {
              console.error("Error updating overdue tasks in Firestore:", error);
            }
  
            setTasks(fetchedTasks);
          } else {
            console.warn("No tasks found in Firestore.");
            setTasks([]); // Clear tasks if none exist
          }
        },
        (error) => {
          console.error("Error fetching tasks:", error);
          setError("Failed to fetch tasks. Please try again.");
        }
      );
  
      return () => unsubscribe();
    } catch (err) {
      console.error("Error initializing task fetch:", err);
      setError("Failed to fetch tasks. Please try again.");
    }
  };
  



useEffect(() => {
  if (isSubmissionsModalOpen && submissionsTask) {
    openSubmissionsModal(submissionsTask);
  }
}, [isSubmissionsModalOpen, submissionsTask]); 

  
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prevAttachments) => {
        const uniqueFiles = newFiles.filter(
          (newFile) =>
            !prevAttachments.some(
              (existingFile) =>
                existingFile.name === newFile.name && existingFile.size === newFile.size
            )
        );
        return [...prevAttachments, ...uniqueFiles];
      });
    }
  };
  const extractFileName = (url: string): string => {
    const fileNameWithPath = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Attachment');
    const fileName = fileNameWithPath.split('/').pop() || fileNameWithPath; // Remove folder structure like "tasks/"
    return fileName.replace(/^\d+-/, ''); // Remove leading numbers followed by a dash
  };
  
  
  const handleCheckboxChange = (id: string) => {
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  
  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
  
    if (!organizationName || !currentUser) {
      showToast("Missing organization name or user.","error");
      return;
    }
  
    if (new Date(newTaskStartDate) < now) {
      showToast("Start date cannot be in the past.", "error");
      return;
    }
    // Validate that the due date is not earlier than the start date
    if (new Date(newTaskDueDate) < new Date(newTaskStartDate)) {

      showToast("Due date cannot be earlier than the start date.","error");
      return;
    }
  
    if (selectedMembers.length === 0 && selectedCommittees.length === 0) {
      showToast("You must assign the task to at least one member or committee.", "error");
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
  
      // Prepare `assignedTo` and `assignedToNames`
      const allAssigned = [...selectedMembers, ...selectedCommittees];
      const assignedToWithNames = allAssigned.map((id) => {
        const member = availableMembers.find((m) => m.id === id);
        const committee = availableCommittees.find((c) => c.id === id);
        return {
          id,
          name: member?.name || committee?.name || "Unknown",
        };
      });
  
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
        description: newTaskDescription,
        assignedTo: [], // Keeping for backward compatibility
        assignedMembers: selectedMembers,
        assignedCommittees: selectedCommittees,
        startDate: newTaskStartDate,
        dueDate: newTaskDueDate,
        event: newTaskEvent,
        taskStatus: "Started",
        givenBy,
        attachments: attachmentURLs,
      };
  
      // Save the new task to Firestore
      const taskDocRef = doc(
        firestore,
        `tasks/${organizationName}/AllTasks/${newTask.id}`
      );
      await setDoc(taskDocRef, newTask);
  
      // Update local state
      setTasks((prev) => [...prev, newTask]);
  
      // Reset form state
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskStartDate("");
      setNewTaskDueDate("");
      setSelectedMembers([]);
      setSelectedCommittees([]);
      setAttachments([]);
  
      closeNewTaskModal();
      showToast("Task created successfully!","success");
    } catch (error) {
      console.error("Error creating task:", error);
      showToast("Failed to create the task. Please try again.","error");
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
        <div className="header-container">
        <h1 className="headtitle">All Tasks List</h1>
          <button
      className="create-new-btn"
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
  <option value="General Task">General Task</option>
  {availableEvents.map((event) => (
    <option key={event.id} value={event.id}>
      {event.title}
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
    <option value="In-Progress">In Progress</option>
    <option value="Completed">Completed</option>
    <option value="Overdue">Overdue</option>
    <option value="Extended">Extended</option>
    <option value="Extended-Overdue">Extended-Overdue</option>
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
      fetchTasks();
      setFilterByEvent("All");
      setFilterByStatus("All");
      setSearchQuery("");
      setSortOrder("asc");
      setSelectedDate(""); // Reset selected date
      setFilterDate(""); 
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
  <div className="altask-modal-overlay">
    <div className="altask-modal-content">
    <button
        className="modalers-close-btn"
        onClick={closeNewTaskModal}
        aria-label="Close"
      >
        &times;
      </button>
      <h3>Create new task</h3>
      <form onSubmit={handleCreateTask}>
        <div className="altask-form">
          {/* Left Column */}
          <div className="altask-left-column">
            <label className="altask-label">Task Title</label>
            <input
              type="text"
              placeholder="Task Title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              required
              className="altask-input"
            />

            <label className="altask-label">Task description</label>
            <textarea
              placeholder="Task description"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              required
              className="altask-textarea"
            ></textarea>

<label className="altask-label">File attachments</label>
<div className="altask-file-section">
              <button
                type="button"
                className="altask-file-btns"
                onClick={() => fileInputRef.current?.click()} 
              >
                + add file
              </button>
              <input
  ref={fileInputRef}
  type="file"
  multiple
  onChange={handleFileChange}
  style={{ display: 'none' }}
/>
<ul className="altask-file-list">
  {/* Existing URLs */}
  {taskToEdit?.attachments?.map((url, index) => {
  const fileName = extractFileName(url);
  return (
    <li key={`existing-${index}`} className="altask-file-item">
      <span>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {fileName}
        </a>
      </span>
      <button
        type="button"
        className="altask-file-remove-btn"
        onClick={() => {
          setTaskToEdit((prev) =>
            prev
              ? { ...prev, attachments: prev.attachments?.filter((_, i) => i !== index) }
              : null
          );
        }}
      >
        ×
      </button>
    </li>
  );
})}



  {/* New files */}
  {attachments.map((file, index) => (
    <li key={`new-${index}`} className="altask-file-item">
      <span>{file.name}</span>
      <button
        type="button"
        className="altask-file-remove-btn"
        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
      >
        ×
      </button>
    </li>
  ))}
</ul>


            </div>
          </div>

          {/* Right Column */}

          
          <div className="altask-right-column">


          <label className="altask-label">Event</label>
          <select
  value={newTaskEvent}
  onChange={(e) => setNewTaskEvent(e.target.value)}
  required
  className="altask-event-dropdown"
>
  <option value="General Task">General Task</option>
  {availableEvents.map((event) => (
    <option key={event.id} value={event.id}>
      {event.title}
    </option>
  ))}
</select>



<label className="altask-label">Start Date & Time</label>
<div className="altask-date-time-input">
  <input
    type="datetime-local"
    value={newTaskStartDate}
    onChange={(e) => setNewTaskStartDate(e.target.value)}
    required
    className="altask-date-input"
    placeholder={formattedNow}
    min={new Date().toISOString().slice(0, 16)} // Disable past dates
  />
</div>

<label className="altask-label">Due Date & Time</label>
<div className="altask-date-time-input">
  <input
    type="datetime-local"
    value={newTaskDueDate}
    onChange={(e) => setNewTaskDueDate(e.target.value)}
    required
    className="altask-date-input"
    placeholder={formattedNow}
    min={newTaskStartDate || new Date().toISOString().slice(0, 16)} // Ensure it's after the start date
  />
</div>










            <label className="altask-label">Assign to:</label>
            <div className="altask-assign-to-section">
              <div className="altask-chips">
                {selectedMembers.map((memberId) => {
                  const member = availableMembers.find(
                    (m) => m.id === memberId
                  );
                  return (
                    <div key={memberId} className="altask-chip">
                      {member?.name}
                      <button
                        className="altask-chip-remove"
                        onClick={() =>
                          setSelectedMembers((prev) =>
                            prev.filter((id) => id !== memberId)
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <div className="altask-dropdown-container">
                <button
    type="button"
    className="altask-add-btn"
    onClick={() => setShowMemberDropdown(!showMemberDropdown)}
  >
    +
  </button>
                
                {showMemberDropdown && (
  <div className="altask-dropdown">
    {/* Search Bar */}
    <input
      type="text"
      className="altask-dropdown-search"
      placeholder="Search..."
      value={memberSearch}
      onChange={(e) => setMemberSearch(e.target.value)}
    />
    {/* Filtered List */}
    <ul>
      {availableMembers
        .filter(
          (member) =>
            !selectedMembers.includes(member.id) && // Exclude already selected members
            member.name.toLowerCase().includes(memberSearch.toLowerCase()) // Match search term
        )
        .map((member) => (
          <li
            key={member.id}
            className="altask-dropdown-item"
            onClick={() => handleMemberSelect(member.id)}
          >
            {member.name}
          </li>
        ))}
    </ul>
  </div>
)}
</div>

              </div>
            </div>

            <label className="altask-label">Assign to committee:</label>
            <div className="altask-assign-committees">
              {availableCommittees.map((committee) => (
                <div
                  key={committee.id}
                  className={`altask-chip ${
                    selectedCommittees.includes(committee.id)
                      ? "altask-chip-selected"
                      : ""
                  }`}
                  onClick={() => handleCommitteeSelect(committee.id)}
                >
                  {committee.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="altask-modal-actions">
          <button type="submit" className="altask-submit-btn">
            Create Task
          </button>
        
        </div>
      </form>
    </div>
  </div>
)}

{isViewModalOpen && taskToView && (
  <div className="task-details-modal-overlay">
    <div className="task-details-modal-content">
    <button
        className="modalers-close-btn"
        onClick={closeViewModal}
        aria-label="Close"
      >
        &times;
      </button>
      <h3>Task Details</h3>
      <div className="task-details-info">
        <div className="task-details-row">
        <p><strong>Event:</strong> {
  (() => {
    const event = availableEvents.find(ev => ev.id === taskToView.event);
    return event ? event.title : 'General Task';
  })()
}</p>

        </div>
        <div className="task-details-row">
          <p><strong>Title:</strong> {taskToView.title}</p>
        </div>
        <div className="task-details-row">
          <p><strong>Description:</strong> {taskToView.description}</p>
        </div>
        <div className="task-details-row">
          <p><strong>Given by:</strong> {taskToView.givenBy}</p>
          <div>
          <strong>Assigned to:</strong>
            <ul>
              <li><strong>Members:</strong></li>
              {taskToView.assignedMembers.map((id) => {
                const member = availableMembers.find((m) => m.id === id);
                return <li key={id}>{member?.name || 'Unknown Member'}</li>;
              })}

              <li><strong>Committees:</strong></li>
              {taskToView.assignedCommittees.map((id) => {
                const committee = availableCommittees.find((c) => c.id === id);
                return <li key={id}>{committee?.name || 'Unknown Committee'}</li>;
              })}
            </ul>
          </div>
        </div>
        <div className="task-details-row">
          
          <p><strong>Start Date:</strong> 
            {new Date(taskToView.startDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: "numeric",
    minute: "numeric",
    hour12: true,
            })}
          </p>
          <p><strong>Due Date:</strong> 
            {new Date(taskToView.dueDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: "numeric",
    minute: "numeric",
    hour12: true,
            })}
          </p>
        </div>
        <div className="task-details-row">
          <p><strong>Status:</strong> 
          <span
            className={`status-badge ${
              taskToView.taskStatus === "Extended"
                ? "extended"
                : taskToView.taskStatus === "Extended-Overdue"
                ? "extended-overdue"
                : taskToView.taskStatus.replace(" ", "-").toLowerCase()
            }`}
          >
            {taskToView.taskStatus === "Extended-Overdue" ? "Extended (Overdue)" : taskToView.taskStatus}
          </span>
          </p>
        </div>
        <div className="task-details-row">
          <ul>
          <p><strong>File Attachments:</strong></p>
          {taskToView?.attachments && taskToView.attachments.length > 0 ? (
            taskToView.attachments.map((url, index) => {
              const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || `Attachment ${index + 1}`);
              return (
                <li key={index}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {fileName}
                  </a>
                </li>
              );
            })
          ) : (
            <p>No attachments</p>
          )}
        </ul>
        </div>
      </div>
      <div className="task-details-modal-actions">
        <button onClick={() => openEditModal(taskToView)}>Edit</button>
      </div>
    </div>
  </div>
)}




{isEditModalOpen && taskToEdit && (
  <div className="altask-modal-overlay">
    <div className="altask-modal-content">
      <h3>Edit Task</h3>
      <form onSubmit={handleEditTask}>
        <div className="altask-form">
          {/* Left Column */}
          <div className="altask-left-column">
            <label className="altask-label">Task Title</label>
            <input
              type="text"
              value={newTaskTitle || taskToEdit.title}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              required
              className="altask-input"
            />

            <label className="altask-label">Task Description</label>
            <textarea
              value={newTaskDescription || taskToEdit.description}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              required
              className="altask-textarea"
            ></textarea>

            <label className="altask-label">File Attachments</label>
            <div className="altask-file-section">
              <button
                type="button"
                className="altask-file-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                + add file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <ul className="altask-file-list">
                {/* Existing attachments */}
                {taskToEdit?.attachments?.map((url, index) => (
                  <li key={`existing-${index}`} className="altask-file-item">
                    <span>
                      {/* Use the extractFileName function to display the filename */}
                      <a 
  className="altask-file-link" 
  href={url} 
  target="_blank" 
  rel="noopener noreferrer"
>
  {extractFileName(url)}
</a>

                    </span>
                    <button
                      type="button"
                      className="altask-file-remove-btn"
                      onClick={() => {
                        // Remove the attachment URL from the task
                        setTaskToEdit((prev) =>
                          prev
                            ? { ...prev, attachments: prev.attachments?.filter((_, i) => i !== index) }
                            : null
                        );
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}

                {/* Newly added attachments */}
                {attachments.map((file, index) => (
                  <li key={`new-${index}`} className="altask-file-item">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="altask-file-remove-btn"
                      onClick={() => handleRemoveFile(index)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div className="altask-right-column">
          <label className="altask-label">Event</label>
            <select
              value={newTaskEvent || taskToEdit.event || "General Task"}
              onChange={(e) => setNewTaskEvent(e.target.value)}
              className="altask-event-dropdown"
              required
            >
              <option value="General Task">General Task</option>
              {availableEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>


            <label className="altask-label">Start Date & Time</label>
<div className="altask-date-time-input">
  <input
    type="datetime-local"
    value={newTaskStartDate}
    onChange={(e) => setNewTaskStartDate(e.target.value)}
    required
    className="altask-date-input"
    placeholder={formattedNow}
    min={new Date().toISOString().slice(0, 16)} // Disable past dates
  />
</div>

<label className="altask-label">Due Date & Time</label>
<div className="altask-date-time-input">
  <input
    type="datetime-local"
    value={newTaskDueDate}
    onChange={(e) => setNewTaskDueDate(e.target.value)}
    required
    className="altask-date-input"
    placeholder={formattedNow}
    min={newTaskStartDate || new Date().toISOString().slice(0, 16)} // Ensure it's after the start date
  />
</div>


            <label className="altask-label">Assign to:</label>
            <div className="altask-assign-to-section">
              <div className="altask-chips">
                {selectedMembers.map((memberId) => {
                  const member = availableMembers.find((m) => m.id === memberId);
                  return (
                    <div key={memberId} className="altask-chip">
                      {member?.name}
                      <button
                        className="altask-chip-remove"
                        onClick={() =>
                          setSelectedMembers((prev) =>
                            prev.filter((id) => id !== memberId)
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <div className="altask-dropdown-container">
                  <button
                    type="button"
                    className="altask-add-btn"
                    onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                  >
                    +
                  </button>

                  {showMemberDropdown && (
                    <div className="altask-dropdown">
                      <input
                        type="text"
                        className="altask-dropdown-search"
                        placeholder="Search..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                      <ul>
                        {availableMembers
                          .filter(
                            (member) =>
                              !selectedMembers.includes(member.id) &&
                              member.name
                                .toLowerCase()
                                .includes(memberSearch.toLowerCase())
                          )
                          .map((member) => (
                            <li
                              key={member.id}
                              className="altask-dropdown-item"
                              onClick={() => handleMemberSelect(member.id)}
                            >
                              {member.name}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <label className="altask-label">Assign to committee:</label>
            <div className="altask-assign-committees">
              {availableCommittees.map((committee) => (
                <div
                  key={committee.id}
                  className={`altask-chip ${
                    selectedCommittees.includes(committee.id)
                      ? "altask-chip-selected"
                      : ""
                  }`}
                  onClick={() => handleCommitteeSelect(committee.id)}
                >
                  {committee.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="altask-modal-actions">
          <button type="submit" className="altask-submit-btn">
            Save Changes
          </button>
          <button
            type="button"
            onClick={closeEditModal}
            className="altask-cancel-btn"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}




{isSubmissionsModalOpen && submissionsTask && (
  <div className="submitmeninja-modal-overlay">
    <div className="submitmeninja-modal-content">
      {/* Modal Header */}
      <div className="submitmeninja-modal-header">
        <h3>Submissions for Task: {submissionsTask.title}</h3>
        <button
          className="submitmeninja-modal-close"
          onClick={closeSubmissionsModal}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      {submissionsTask.submissions &&
Array.isArray(submissionsTask.submissions) &&
submissionsTask.submissions.length > 0 ? (
  <>
   <div className="submitmeninja-tabs">
  {/* Navigation Buttons */}
   <button
    className="tab-navigation-button"
    onClick={() => {
      const newTab = Math.max(activeTab - 3, 1);
      setActiveTab(newTab);
    }}
    disabled={activeTab === 1}
  >
    &lt;
  </button>

  {/* Visible Tabs */}
  {submissionsTask.submissions
    .slice(
      Math.floor((activeTab - 1) / 3) * 3,
      Math.floor((activeTab - 1) / 3) * 3 + 3
    ) // Show 3 submissions at a time
    .map((_, index) => {
      const tabIndex = Math.floor((activeTab - 1) / 3) * 3 + index + 1; // Calculate the actual tab index
      return (
        <div
          key={tabIndex}
          className={`submitmeninja-tab ${
            activeTab === tabIndex ? "active" : ""
          }`}
          onClick={() => setActiveTab(tabIndex)} // Set the clicked tab as active
        >
          Submission {tabIndex}
        </div>
      );
    })}

  {/* Next Button */}
  <button
    className="tab-navigation-button"
    onClick={() => {
      // Move to the next set of tabs and set the first tab of that set as active
      const newTab = Math.floor((activeTab - 1) / 3) * 3 + 3 + 1; // First tab of the next set
      setActiveTab(newTab);
    }}
    disabled={Math.floor((activeTab - 1) / 3) * 3 + 3 >= submissionsTask.submissions.length} // Disable if there are no next tabs
  >
    &gt;
  </button>
</div>

          {/* Tab Content */}
          <div className="submitmeninja-tab-content">
            {(() => {
              const submission = submissionsTask.submissions?.[activeTab - 1];
              return submission ? (
                <div>
                  <p>
                    <strong>Submitted by:</strong> {submission.memberName}
                  </p>
                  <p className="submission-time">
                    {(() => {
                      const submissionDate = new Date(submission.date);
                      const now = new Date();
                      const diffMs = now.getTime() - submissionDate.getTime(); // Difference in ms
                      const diffMinutes = Math.floor(diffMs / (1000 * 60));
                      const diffHours = Math.floor(diffMinutes / 60);

                      if (diffMinutes < 60) {
                        return `${diffMinutes} minutes ago`;
                      } else if (diffHours < 24) {
                        return `${diffHours} hours ago`;
                      } else {
                        return submissionDate.toLocaleString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        });
                      }
                    })()}
                 </p>
                  {/* Display text content */}
        {submission.textContent && (
          <div>
            <p>
    
            </p>
            <p>{submission.textContent}</p>
          </div>
        )}

                  {/* Display file attachments */}
        {submission.fileAttachments && submission.fileAttachments.length > 0 && (
           <div className="file-attachmentsKOKO">
            <p>
              <strong>File Attachments:</strong>
            </p>
            <ul>
              {submission.fileAttachments.map((fileUrl, index) => (
                 <li className="altask-file-item">
                  <span>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="altask-file-link"
                  >
                    {extractFileName(fileUrl)}
                  </a>
                  </span>
                </li>
              ))}
            </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p>No submission yet in Submission {activeTab}.</p>
              );
            })()}
          </div>

         {/* Comments Section */}
         <div className="submitmeninja-comments-section">
  <h4>Comments</h4>
  <div className="submitmeninja-comments-list">
    {comments[activeTab - 1]?.map((comment, index) => (
      <div key={index} className="submitmeninja-comment">
        <img
          src={comment.user.profilePicUrl}
          alt={`${comment.user.name}'s profile`}
          className="submitmeninja-comment-avatar"
        />
        <div className="submitmeninja-comment-content">
          <p className="submitmeninja-comment-author">
            {comment.user.name}
          </p>
          <p className="submitmeninja-comment-time">
            {(() => {
               const commentDate = new Date(comment.timestamp); // Parse timestamp
              const now = new Date();
              const diffMs = now.getTime() - commentDate.getTime();
              const diffMinutes = Math.floor(diffMs / (1000 * 60));
              const diffHours = Math.floor(diffMinutes / 60);

              if (diffMinutes < 60) {
                return `${diffMinutes} minutes ago`;
              } else if (diffHours < 24) {
                return `${diffHours} hours ago`;
              } else {
                return commentDate.toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                });
              }
            })()}
          </p>
          <p className="we-can-go-to-4">{comment.text}</p>
        </div>
      </div>
    ))}
  </div>
  <textarea
    placeholder="Add a comment..."
    value={commentText}
    onChange={(e) => setCommentText(e.target.value)}
    className="submitmeninja-comment-box"
  ></textarea>
  <button
    className="submitmeninja-comment-submit"
    onClick={() => handleAddComment(activeTab - 1)}
  >
    Submit Comment
  </button>
</div>

        </>
      ) : (
        <p>No submissions found for this task.</p>
      )}
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

            <div className="table-container">
  <table className="task-table">
    <thead className="task-table-header">
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
    <tbody className="task-table-body">
      {filteredTasks.map((task) => (
        <tr key={task.id} className="task-row">
          <td>
            <input
              type="checkbox"
              checked={assignedTo.includes(task.id)}
              onChange={() => handleCheckboxChange(task.id)}
            />
          </td>
          <td>
        {
          (() => {
            const event = availableEvents.find((ev) => ev.id === task.event);
            return event ? event.title : "General Task";
          })()
        }
      </td>
          <td>
            <strong>{task.title}</strong>
            <p>{task.description}</p>
          </td>
          <td>{task.givenBy}</td>
          <td>
        {(() => {
          const memberNames = task.assignedMembers
            .map((id) => {
              const member = availableMembers.find((m) => m.id === id);
              return member?.name || "Unknown Member";
            })
            .filter(Boolean);

          const committeeNames = task.assignedCommittees
            .map((id) => {
              const committee = availableCommittees.find((c) => c.id === id);
              return committee?.name || "Unknown Committee";
            })
            .filter(Boolean);

          const allNames = [...memberNames, ...committeeNames];

          if (allNames.length <= 3) {
            return allNames.join(", ");
          } else {
            const visibleNames = allNames.slice(0, 3);
            const hiddenCount = allNames.length - 3;
            return `${visibleNames.join(", ")}, +${hiddenCount}`;
          }
        })()}
      </td>
          <td>
            {new Date(task.startDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
    minute: "numeric",
    hour12: true,
            })}
          </td>
          <td>
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
    minute: "numeric",
    hour12: true,
            })}
          </td>
          <td>
          <span
  className={`status-badge ${
    task.taskStatus === "Extended"
      ? "extended"
      : task.taskStatus === "Extended-Overdue"
      ? "extended-overdue"
      : task.taskStatus.replace(" ", "-").toLowerCase()
  }`}
>
  {task.taskStatus === "Extended-Overdue" ? "Extended (Overdue)" : task.taskStatus}
</span>

          </td>
          <td>
          <div className="task-dropdown">
  <button className="action-btn">Action</button>
  <div className="task-dropdown-content">
    <button onClick={() => openViewModal(task)}>View</button>
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
    </div></div>
  );
};

export default TaskManagement;
