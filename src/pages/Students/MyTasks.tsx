import React, { useEffect, useState  } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc,updateDoc,query, arrayUnion, onSnapshot,collection } from "firebase/firestore";
import { firestore } from "../../services/firebaseConfig";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { useParams } from "react-router-dom";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import '../../styles/TaskManagement.css';
import { showToast } from '../../components/toast';
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  event?: string;
  title: string;
  description: string;
  assignedTo: string[];
  assignedToNames: string[];
  startDate: string;
  dueDate: string;
  taskStatus: 'In-Progress' | 'Started' | 'Completed' | 'Overdue';
  givenBy: string; 
  attachments?: string[];
}

interface Submission {
  memberId: string;
  memberName: string; // The member's full name
  textContent?: string; // Optional field for text content
  fileAttachments?: string[]; // Array of file URLs for attachments
  date: string;
  comments?: { // Array of comments for the submission
    text: string;
    user: {
      name: string;
      profilePicUrl?: string;
    };
    timestamp: number;
  }[];
}
interface Task {
  submissions?: Submission[];
}
const MyTasks: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
const [taskToView, setTaskToView] = useState<Task | null>(null);
const [filterByEvent, setFilterByEvent] = useState("All");
const [filterByStatus, setFilterByStatus] = useState("All");
const [searchQuery, setSearchQuery] = useState("");
const [sortOrder, setSortOrder] = useState("asc");
const [selectedDate, setSelectedDate] = useState("");
const [comments, setComments] = useState<{ text: string; user: any; timestamp: number }[][]>([]);
const [commentText, setCommentText] = useState("");
const [activeTab, setActiveTab] = useState(1); // For tabs in submissions modal
const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
const [submissionsTask, setSubmissionsTask] = useState<Task | null>(null);
const [availableCommittees, setAvailableCommittees] = useState<any[]>([]);
const [availableMembers, setAvailableMembers] = useState<any[]>([]);
const [textContent, setTextContent] = useState("");
const [file, setFile] = useState<File[] | null>(null);
const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
const [attachments, setAttachments] = useState<File[]>([]);

const navigate = useNavigate();

  const auth = getAuth();

  const resetFilters = () => {
    setFilterByEvent("All");
    setFilterByStatus("All");
    setSearchQuery("");
    setSortOrder("asc");
    setSelectedDate("");
  };
  
  const openViewModal = async (task: Task) => {
    const updatedTask = await setSelectedTaskWithStatusUpdate(task); // Get the updated task
    setTaskToView(updatedTask); // Use the updated task for the modal
    setIsViewModalOpen(true); // Open the modal
  };
  
  
  const closeViewModal = () => {
    setTaskToView(null);
    setIsViewModalOpen(false);
  };
  const extractFileName = (url: string): string => {
    const fileNameWithPath = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Attachment');
    const fileName = fileNameWithPath.split('/').pop() || fileNameWithPath; // Remove folder structure like "tasks/"
    return fileName.replace(/^\d+-/, ''); // Remove leading numbers followed by a dash
  };
  
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
const fetchAvailableMembersAndCommittees = async () => {
  if (!organizationName) return;

  try {
    const orgDocRef = doc(firestore, "organizations", decodeURIComponent(organizationName));
    const orgDoc = await getDoc(orgDocRef);

    if (orgDoc.exists()) {
      const data = orgDoc.data();
      setAvailableMembers([...(data?.members || []), ...(data?.officers || [])]);
      setAvailableCommittees(data?.committees || []);
    }
  } catch (error) {
    console.error("Error fetching members and committees:", error);
  }
};


const fetchMyTasks = async () => {
  if (!currentUser || !organizationName) return;

  try {
    const decodedOrgName = decodeURIComponent(organizationName).trim();
    console.log("Decoded Organization Name:", decodedOrgName);

    // Fetch organization data
    const orgDocRef = doc(firestore, "organizations", decodedOrgName);
    const orgDoc = await getDoc(orgDocRef);

    if (orgDoc.exists()) {
      const orgData = orgDoc.data();
      setOrganizationData(orgData);

      // Determine the user's role in the organization
      if (orgData.president?.id === currentUser.uid) {
        setUserRole("president");
      } else if (orgData.officers?.some((officer: any) => officer.id === currentUser.uid)) {
        setUserRole("officer");
      } else if (orgData.members?.some((member: any) => member.id === currentUser.uid)) {
        setUserRole("member");
      } else {
        setUserRole(null);
      }

      // Extract committees
      const committees = orgData?.committees || [];
      const userId = currentUser.uid;

      // Get committees where the user is either the head or a member
      const userCommittees = committees.filter((committee: any) => {
        return (
          committee.head?.id === userId ||
          committee.members?.some((member: any) => member.id === userId)
        );
      });

      // Collect all committee IDs where the user is involved
      const userCommitteeIds = userCommittees.map((committee: any) => committee.id);

      // Set up real-time listener for tasks
      const tasksCollectionPath = `tasks/${decodedOrgName}/AllTasks`;
      const taskQuery = query(collection(firestore, tasksCollectionPath));

      // Listen for real-time updates using onSnapshot
      const unsubscribe = onSnapshot(taskQuery, async (querySnapshot) => {
        if (querySnapshot.empty) {
          console.log("No tasks found.");
          setTasks([]); // Clear any previous tasks
          return;
        }

        const userTasks: Task[] = [];
        const currentDate = new Date();

        for (const doc of querySnapshot.docs) {
          const taskData = doc.data() as Task;
          const taskDueDate = new Date(taskData.dueDate);

          // Adjust due date to 12:01 AM the next day
          taskDueDate.setDate(taskDueDate.getDate() + 1);
          taskDueDate.setHours(0, 1, 0, 0); // Set to 12:01 AM the next day

          // Check if the task is overdue
          if (currentDate >= taskDueDate && (!taskData.submissions || taskData.submissions.length === 0)) {
            // Update Firestore to mark as "Overdue"
            await updateDoc(doc.ref, { taskStatus: "Overdue" });
            taskData.taskStatus = "Overdue"; // Update local task data
          }

          // Check if the task is assigned to the current user or their committees
          if (
            taskData.assignedTo.includes(userId) ||
            taskData.assignedTo.some((assignedId) => userCommitteeIds.includes(assignedId))
          ) {
            userTasks.push({ ...taskData, id: doc.id });
          }
        }
        console.log("Mapped User Tasks:", userTasks);

        setTasks(userTasks);
        setError(null);
      });

      // Clean up the listener when the component is unmounted or no longer needed
      return () => unsubscribe();
    } else {
      console.error("Organization not found.");
      setError("Organization not found.");
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
    setError("Failed to fetch tasks. Please try again.");
  } finally {
    setLoading(false);
  }
};

  
  
  // Sidebar Logic
  const getSidebarComponent = () => {
    switch (userRole) {
      case "president":
        return <StudentPresidentSidebar />;
      case "officer":
        return <StudentOfficerSidebar />;
      case "member":
        return <StudentMemberSidebar />;
      default:
        return null; // Optionally return a fallback component
    }
  };
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setTasks([]); // Clear tasks if the user logs out
      }
    });

    return () => unsubscribe();
  }, []);


  

  useEffect(() => {
    const fetchData = async () => {
      await fetchAvailableMembersAndCommittees(); // Fetch members and committees first
      fetchMyTasks(); // Fetch tasks after ensuring member and committee data is ready
    };
  
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, organizationName]);

  if (loading) return <div>Loading your tasks...</div>;
  if (error) return <div>Error: {error}</div>;

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
      "Completed": 2,
      "Overdue": 3
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




  const openSubmissionsModal = (task: Task) => {
    setSubmissionsTask(task);
    setIsSubmissionsModalOpen(true);
  
    try {
      // Set up real-time listener for the specific task document
      const taskDocRef = doc(firestore, `tasks/${organizationName}/AllTasks/${task.id}`);
      
      // Listen for real-time updates using onSnapshot
      const unsubscribe = onSnapshot(taskDocRef, (taskDoc) => {
        if (taskDoc.exists()) {
          const taskData = taskDoc.data();
          const submissionsComments = taskData.submissions?.map((submission: any) => submission.comments || []);
          setComments(submissionsComments || []); // Initialize comments
        } else {
          console.error("Task document does not exist.");
          setComments([]); // Ensure comments are cleared if the task doesn't exist
        }
      });
  
      // Clean up the listener when the modal is closed or when no longer needed
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]); // Fallback in case of error
    }
  };
  
  const handleSubmission = async (
    taskId: string,
    textContent: string,
    files: File[] | null
  ) => {
    const user = auth.currentUser;
  
    if (!user) {
      showToast("You must be signed in to submit.", "error");
      return;
    }
  
    const userDoc = await getDoc(doc(firestore, "students", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
  
    const memberName = userData
      ? `${userData.firstname} ${userData.lastname}`
      : user.displayName || "Unknown";
  
    if (!taskId) {
      showToast("Task ID is missing. Please try again.", "error");
      return;
    }
  
    try {
      // Get the task document
      const taskDocRef = doc(firestore, `tasks/${organizationName}/AllTasks/${taskId}`);
      const taskDoc = await getDoc(taskDocRef);
  
      if (taskDoc.exists()) {
        const taskData = taskDoc.data();
  
        // Check if submissions already exist and count the number of submissions for this user
        const userSubmissions = taskData.submissions?.filter(
          (submission: any) => submission.memberId === user.uid
        ) || [];
  
        if (userSubmissions.length >= 3) {
          showToast("You can only submit up to 3 times.", "error");
          return;
        }
      } else {
        showToast("Task not found. Please try again.", "error");
        return;
      }
  
      const storage = getStorage();
      const fileURLs: string[] = [];
  
      // If there are files, upload each to Firebase Storage
      if (files && files.length > 0) {
        for (const file of files) {
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const storageRef = ref(storage, `submissions/${Date.now()}-${sanitizedFileName}`);
          const snapshot = await uploadBytes(storageRef, file);
          const fileURL = await getDownloadURL(snapshot.ref);
          fileURLs.push(fileURL);
        }
      }
  
      // Prepare the submission object
      const submission = {
        memberId: user.uid,
        memberName,
        textContent: textContent || null, // Include textContent if provided
        fileAttachments: fileURLs.length > 0 ? fileURLs : null, // Include file attachments if any
        date: new Date().toISOString(),
      };
  
      // Update the task in Firestore
      await updateDoc(taskDocRef, {
        submissions: arrayUnion(submission),
        taskStatus: "Completed",
      });
  
      const updatedTaskDoc = await getDoc(taskDocRef);
      if (updatedTaskDoc.exists()) {
        const updatedTask = updatedTaskDoc.data() as Task;
        setSubmissionsTask(updatedTask); // Update the submissions modal data
        setComments(
          updatedTask.submissions?.map((submission) => submission.comments || []) || []
        ); // Update the comments state
      }
  
      showToast("Submission successful!", "success");
      setIsSubmitModalOpen(false); // Close the modal after successful submission
    } catch (error) {
      console.error("Error submitting:", error);
      showToast("Failed to submit. Please try again.", "error");
    }
  };
  
  const resetSubmissionForm = () => {
    setTextContent(""); // Clear the text submission
    setFile(null); // Clear the selected files
  };
  

const closeSubmissionsModal = () => {
  setSubmissionsTask(null);
  setIsSubmissionsModalOpen(false);
};

  const setSelectedTaskWithStatusUpdate = async (task: Task): Promise<Task> => {
    const currentDate = new Date();
    const taskStartDate = new Date(task.startDate);
    let updatedTask = task;
  
    if (task.taskStatus === "Started" && currentDate >= taskStartDate) {
      try {
        const normalizedOrgName = decodeURIComponent(organizationName || "").trim();
  
        const taskDocRef = doc(
          firestore,
          `tasks/${normalizedOrgName}/AllTasks/${task.id}`
        );
  
        await updateDoc(taskDocRef, {
          taskStatus: "In-Progress",
        });
  
        // Fetch the updated task data
        const updatedTaskDoc = await getDoc(taskDocRef);
        if (updatedTaskDoc.exists()) {
          updatedTask = { ...updatedTaskDoc.data(), id: task.id } as Task;
        }
  
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, taskStatus: "In-Progress" } : t
          )
        );
  
        console.log(`Task ${task.id} marked as "In-Progress"`);
      } catch (error) {
        console.error("Error updating task status:", error);
      }
    }
  
    return updatedTask; // Return the updated task
  };
  

  return (
    <div className="task-management-dashboard">
      <Header />
      <div className="task-container">
      <div className="task-sidebar">
  {getSidebarComponent()}
</div>
        <div className="task-content">
        <div className="header-actions">
  <h2>My Tasks</h2>
  {userRole === "president" || userRole === "officer" ? (
    <button
      className="my-tasks-btns"
      onClick={() => navigate(`/Organization/${organizationName}/Alltasks`)}
    >
      View All Tasks
    </button>
  ) : null}
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

 <button className="tksks-reset-btn" onClick={resetFilters}>
  <FontAwesomeIcon icon={faSync} />
  Reset
</button>
</div>

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
          <p><strong>Event:</strong> {taskToView.event || 'General Task'}</p>
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
              {/* Committees first */}
              {taskToView.assignedTo
                .map((id) => availableCommittees.find((c) => c.id === id))
                .filter(Boolean)
                .map((committee, index) => (
                  <li key={`committee-${index}`}>{committee?.name}</li>
                ))}

              {/* Members next */}
              {taskToView.assignedTo
                .map((id) => availableMembers.find((m) => m.id === id))
                .filter(Boolean)
                .map((member, index) => (
                  <li key={`member-${index}`}>{member?.name}</li>
                ))}
            </ul>
          </div>
        </div>
        <div className="task-details-row">
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
        <div className="task-details-row">
          <p><strong>Status:</strong> 
            <span className={`status-badge ${taskToView.taskStatus.replace(' ', '-').toLowerCase()}`}>
              {taskToView.taskStatus}
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
      <button
    onClick={() => {
      setSubmissionsTask(taskToView); // Ensure the selected task is set
      setIsSubmitModalOpen(true); // Open the modal
    }}
  >
    + Prepare Submission
  </button>
</div>
    </div>
  </div>
)}

{isSubmitModalOpen && submissionsTask && (
  <div className="Susz-modal-overlay">
    <div className="Susz-modal-content">
      <button
        className="Susz-modal-close-btn"
        onClick={() => {
          resetSubmissionForm(); // Reset form on close
          setIsSubmitModalOpen(false);
        }}
        aria-label="Close"
      >
        &times;
      </button>
      <h3>Submit Your Work for {submissionsTask.title}</h3>

      {/* Text Submission */}
      <textarea
        placeholder="Enter your text submission"
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        className="Susz-submission-textarea"
      />

 {/* File Upload */}
<div className="file-upload-container">
  <label htmlFor="file-upload" className="altask-file-bt">
    + Add File
  </label>
  <input
  id="file-upload"
  type="file"
  multiple
  onChange={(e) => {
    setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
  }}
  className="file-input-hidden"
/>

</div>

{/* Preview Selected Files */}
{attachments && attachments.length > 0 && (
  <div className="Susz-file-preview">
    <p>Selected Files:</p>
    <ul className="Susz-file-list">
      {attachments.map((attachment, index) => (
        <li key={index} className="Susz-file-item">
          {attachment.name}
          <button
            type="button"
            className="altask-file-remove-btn"
            onClick={() => {
              setAttachments((prev) => prev.filter((_, i) => i !== index));
            }}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  </div>
)}


      {/* Actions */}
      <div className="Susz-modal-actions">
        <button
          onClick={() => {
            handleSubmission(submissionsTask.id, textContent, file);
            resetSubmissionForm(); // Reset form after submission
          }}
          className="Susz-submit-btn"
        >
          Submit
        </button>
        
      </div>
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
            {[1, 2, 3].map((tabIndex) => {
              const isTabDisabled =
                !(submissionsTask.submissions &&
                  submissionsTask.submissions[tabIndex - 1]); // Check if submission exists for this tab
              return (
                <div
                  key={tabIndex}
                  className={`submitmeninja-tab ${
                    activeTab === tabIndex ? "active" : ""
                  } ${isTabDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (isTabDisabled) {
                      showToast(
                        `No submission found for Submission ${tabIndex}.`,
                        "error"
                      );
                    } else {
                      setActiveTab(tabIndex);
                    }
                  }}
                >
                  Submission {tabIndex}
                </div>
              );
            })}
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
          <p>{comment.text}</p>
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


            <div className="table-container">
  <table className="task-table">
    <thead className="task-table-header">
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
    <tbody className="task-table-body">
      {filteredTasks.map((task,index) => (
        <tr key={task.id} className="task-row">
         <td>{index + 1}</td>
          <td>{task.event || "General Task"}</td>
          <td>
            <strong>{task.title}</strong>
            <p>{task.description}</p>
          </td>
          <td>{task.givenBy}</td>
          <td>
  {(() => {
    const names = task.assignedTo
      .map((id) => {
        const member = availableMembers.find((m) => m.id === id);
        const committee = availableCommittees.find((c) => c.id === id);
        return member?.name || committee?.name || "Unknown";
      });

    if (names.length <= 3) {
      return names.join(", ");
    } else {
      const visibleNames = names.slice(0, 3);
      const hiddenCount = names.length - 3;
      return `${visibleNames.join(", ")}, +${hiddenCount}`;
    }
  })()}
</td>

          <td>
            {new Date(task.startDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </td>
          <td>
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </td>
          <td>
            <span
              className={`status-badge ${task.taskStatus
                .replace(" ", "-")
                .toLowerCase()}`}
            >
              {task.taskStatus}
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

export default MyTasks;
