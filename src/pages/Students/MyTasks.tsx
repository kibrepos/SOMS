import React, { useEffect, useState,FormEvent  } from "react";
import { doc, getDoc,updateDoc,query, where, getDocs,collection } from "firebase/firestore";
import { firestore } from "../../services/firebaseConfig";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { useParams } from "react-router-dom";
import Header from "../../components/Header";
import StudentPresidentSidebar from "./StudentPresidentSidebar";
import StudentOfficerSidebar from "./StudentOfficerSidebar";
import StudentMemberSidebar from "./StudentMemberSidebar";
import "../../styles/MyTasks.css";

interface Task {
  id: string;
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  taskStatus: string;
  assignedTo: string[];
  assignedToNames: string[];
  givenBy: string;
  event:string;
  submissions?: Submission[];
}

interface Submission {
  memberId: string;
  memberName: string;
  contentType: "text" | "file";
  content: string;
  date: string;
}

const MyTasks: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");


  const auth = getAuth();

  
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
  
        // Fetch tasks assigned to the user or their committees
        const tasksCollectionPath = `tasks/${decodedOrgName}/AllTasks`;
        const taskQuery = query(collection(firestore, tasksCollectionPath));
  
        const querySnapshot = await getDocs(taskQuery);
  
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
  let SidebarComponent = null;
  if (userRole === "president") {
    SidebarComponent = <StudentPresidentSidebar />;
  } else if (userRole === "officer") {
    SidebarComponent = <StudentOfficerSidebar />;
  } else if (userRole === "member") {
    SidebarComponent = <StudentMemberSidebar />;
  }
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

  // Fetch tasks whenever the current user changes
  useEffect(() => {
    if (currentUser) {
      fetchMyTasks();
    }
  }, [currentUser]);

  if (loading) return <div>Loading your tasks...</div>;
  if (error) return <div>Error: {error}</div>;

;
const fetchUserName = async () => {
    if (!currentUser) {
      console.error("Current user is null. Cannot fetch user name.");
      return "Unknown User";
    }
  
    try {
      const userDocRef = doc(firestore, "students", currentUser.uid); // Adjust collection name if needed
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return `${userData.firstname || ""} ${userData.lastname || ""}`.trim() || "Unknown User";
      } else {
        console.error("User document not found in Firestore.");
        return "Unknown User";
      }
    } catch (error) {
      console.error("Error fetching user name from Firestore:", error);
      return "Unknown User";
    }
  };
  const setSelectedTaskWithStatusUpdate = async (task: Task) => {
    const currentDate = new Date();
    const taskStartDate = new Date(task.startDate);
  
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
  
    setSelectedTask(task); // Set task for viewing
  };
  
  const handleSubmit = async (e: FormEvent, task: Task) => {
    e.preventDefault();
  
    if (!currentUser || !organizationName) return;
  
    const currentDate = new Date();
    const taskStartDate = new Date(task.startDate);
    const taskDueDate = new Date(task.dueDate);
  
    // Prevent submission before the start date
    if (currentDate < taskStartDate) {
      alert("You cannot submit this task before the start date.");
      return;
    }
  
    // Prevent submission after the due date
    if (currentDate > taskDueDate) {
      alert("The submission deadline has passed. You can no longer submit this task.");
      return;
    }
  
    try {
      const memberName = currentUser.displayName || (await fetchUserName());
  
      const newSubmission: Submission = {
        memberId: currentUser.uid,
        memberName,
        contentType: "text",
        content: submissionContent,
        date: currentDate.toISOString(),
      };
  
      const normalizedOrgName = decodeURIComponent(organizationName).trim();
  
      // Reference the specific task document
      const taskDocRef = doc(
        firestore,
        `tasks/${normalizedOrgName}/AllTasks/${task.id}`
      );
  
      const taskDoc = await getDoc(taskDocRef);
      if (!taskDoc.exists()) {
        console.error("Task not found:", taskDocRef.path);
        alert("Task not found. Please check the task and try again.");
        return;
      }
  
      const updatedSubmissions = [...(task.submissions || []), newSubmission];
  
      await updateDoc(taskDocRef, {
        submissions: updatedSubmissions,
        taskStatus: "Completed", // Automatically mark as completed
      });
  
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, submissions: updatedSubmissions, taskStatus: "Completed" } : t
        )
      );
  
      alert("Submission added successfully!");
      setSubmissionContent(""); // Clear the submission input
    } catch (error) {
      console.error("Error submitting task:", error);
      alert("Failed to submit the task. Please try again.");
    }
  };
  

  return (
    <div className="organization-dashboard-wrapper">
    <Header />

    <div className="dashboard-container">
      
    <div className="sidebar-section">{SidebarComponent}</div>

      <div className="main-content">
       
      <h2>My Tasks</h2>
{tasks.length > 0 ? (
  <table className="task-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Event</th>
        <th>Title</th>
        <th>Given by:</th>
        <th>Assigned to:</th>
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
          <td>{task.event || "General Task"}</td> {/* Event column */}
          <td>
            <strong>{task.title}</strong>
            <p>{task.description}</p> {/* Description under title */}
          </td>
          <td>{task.givenBy}</td> {/* Given by */}
          <td>
            {task.assignedToNames?.join(", ") || "No assignees"} {/* Use saved names */}
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
          <span className={`status-badge ${task.taskStatus.replace(" ", "-").toLowerCase()}`}>
  {task.taskStatus}
</span>

          </td>
          <td>
          <div className="task-dropdown">
    <button className="action-btn">Action</button>
    <div className="task-dropdown-content">
      <button onClick={() => setSelectedTaskWithStatusUpdate(task)}>View</button>
      {task.submissions && task.submissions.length > 0 && (
        <button onClick={() => console.log(`View Submissions for ${task.id}`)}>
          Submissions
        </button>
      )}
              </div>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
) : (
  <p>No tasks assigned to you.</p>
)}

        </div>
        {selectedTask && (
  <div className="modal-overlay">
    <div className="modal-content">
      {/* Task Details */}
      <h3>Task Details</h3>
      <p><strong>Title:</strong> {selectedTask.title}</p>
      <p><strong>Description:</strong> {selectedTask.description}</p>
      <p><strong>Start Date:</strong> {new Date(selectedTask.startDate).toLocaleDateString()}</p>
      <p><strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}</p>
      <p>
        <strong>Status:</strong>{" "}
        <span className={`status-badge ${selectedTask.taskStatus.replace(' ', '-').toLowerCase()}`}>
          {selectedTask.taskStatus}
        </span>
      </p>

      {/* Submissions Section */}
      <h4>Submissions</h4>
      {selectedTask.submissions && selectedTask.submissions.length > 0 ? (
        <ul>
          {selectedTask.submissions.map((submission, index) => (
            <li key={index}>
              <p><strong>Submission {index + 1}:</strong></p>
              <p><strong>Submitted by:</strong> {submission.memberName}</p>
              <p><strong>Content:</strong> {submission.content}</p>
              <p><strong>Date:</strong> {new Date(submission.date).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No submissions yet.</p>
      )}

      {/* Submission Form */}
      <h4>Submit Task</h4>
      {selectedTask.submissions && selectedTask.submissions.length >= 3 ? (
        <p>You have reached the maximum of 3 submissions for this task.</p>
      ) : (
        <form onSubmit={(e) => handleSubmit(e, selectedTask)}>
          <textarea
            placeholder="Enter your submission text here"
            value={submissionContent}
            onChange={(e) => setSubmissionContent(e.target.value)}
            required
          />
          <button type="submit">Submit</button>
        </form>
      )}

      <button onClick={() => setSelectedTask(null)}>Close</button>
    </div>
  </div>
)}


      </div>
    </div>
  );
};

export default MyTasks;
