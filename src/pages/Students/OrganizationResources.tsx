import React, { useState, useEffect } from 'react';
import { ref, getStorage, uploadBytes, uploadBytesResumable, listAll, getDownloadURL, deleteObject, StorageReference, getMetadata } from 'firebase/storage';
import { storage } from '../../services/firebaseConfig';
import '../../styles/OrganizationResources.css';
import { useParams } from "react-router-dom";
import { authStateListener } from '../../services/auth';
import Header from '../../components/Header';
import OrganizationSidebar from './OrganizationSidebar'; 
import StudentPresidentSidebar from './StudentPresidentSidebar'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFolderPlus, faSearch, faEllipsisV, faArrowLeft, faPaperclip, faImage, faVideo, faFileAlt, faFilePdf, faFileWord, faFilePowerpoint, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const OrganizationResources = () => {
  const { organizationName } = useParams(); // Get organization name from URL
  const [files, setFiles] = useState<StorageReference[]>([]); // State to hold file references
  const [folders, setFolders] = useState<StorageReference[]>([]); // State to hold folder references
  const [user, setUser] = useState<any | null>(null); // State to hold user data
  const [folderName, setFolderName] = useState(''); // State to hold new folder name
  const [currentPath, setCurrentPath] = useState<string | null>(null); // State for the current folder path
  const [imageModal, setImageModal] = useState<string | null>(null); // State to handle image modal
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false); // State to control folder creation modal visibility
  const [searchQuery, setSearchQuery] = useState(''); // State to hold the search query for files
  const [dropdownIndex, setDropdownIndex] = useState<string | null>(null); // State to manage dropdown selection
  const [detailsModal, setDetailsModal] = useState<{ name: string, size: string, path: string, date: string } | null>(null); // State for file details modal
  const [videoModal, setVideoModal] = useState<string | null>(null); // State to handle video modal
  const [loading, setLoading] = useState(false); // State for loading status
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // State to track upload progress
  const [dragging, setDragging] = useState(false); // State to handle drag-and-drop functionality

  // Function to determine the icon for a file based on its name
  const getFileIcon = (fileName: string) => {
    // Determine the file extension and return corresponding icon
    if (fileName.endsWith('.pdf')) return <FontAwesomeIcon icon={faFilePdf} />;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FontAwesomeIcon icon={faFileWord} />;
    if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return <FontAwesomeIcon icon={faFilePowerpoint} />;
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return <FontAwesomeIcon icon={faFileExcel} />;
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) return <FontAwesomeIcon icon={faImage} />;
    if (fileName.endsWith('.mp4') || fileName.endsWith('.mov')) return <FontAwesomeIcon icon={faVideo} />;
    return <FontAwesomeIcon icon={faFileAlt} />; // Default icon for other file types
  };

  // Function to return CSS class for a file icon based on its name
  const getFileIconClass = (fileName: string) => {
    // Logic for returning the appropriate class name for file icons can be added here
    return 'file-icon';
  };

  // Effect hook to listen for authentication state changes
  useEffect(() => {
    const unsubscribe = authStateListener(setUser); // Subscribe to auth state listener
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // Effect hook to fetch files when user and organization name are available
  useEffect(() => {
    if (user && organizationName) fetchFiles(); // Fetch files if user is authenticated and organization is defined
  }, [user, organizationName, currentPath]);

  // Function to fetch files and folders from Firebase Storage
  const fetchFiles = async () => {
    if (!user || !organizationName) return; // Exit if user or organization is not defined
    const folderRef = ref(storage, `organizations/${organizationName}/files${currentPath ? `/${currentPath}` : ''}`); // Reference to the storage folder
    try {
      const res = await listAll(folderRef); // List all files and folders in the current directory
      setFolders(res.prefixes); // Set state with fetched folder references
      setFiles(res.items); // Set state with fetched file references
    } catch (error) {
      console.error("Error fetching files:", error); // Log error if fetching fails
    }
  };

  // Function to handle file uploads from input change event
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user && organizationName && e.target.files) handleFileUpload(e.target.files); // Call file upload function if files are present
  };

  // Function to handle the actual file upload process
  const handleFileUpload = async (files: FileList) => {
    if (!organizationName) return; // Exit if organization name is not defined
    const uploads = Array.from(files).map(file => {
      const fileRef = ref(storage, `organizations/${organizationName}/files${currentPath ? `/${currentPath}` : ''}/${file.name}`); // Create reference for each file
      return uploadBytes(fileRef, file); // Upload file and return promise
    });

    try {
      await Promise.all(uploads); // Wait for all uploads to complete
      fetchFiles(); // Refresh the file list after uploads
    } catch (error) {
      console.error("Error uploading files:", error); // Log error if upload fails
    }
  };

  // Function to create a new folder in Firebase Storage
  const handleCreateFolder = async () => {
    if (!organizationName || !folderName) return; // Exit if organization name or folder name is not defined
    const folderRef = ref(storage, `organizations/${organizationName}/files${currentPath ? `/${currentPath}` : ''}/${folderName}`); // Create reference for the new folder
    try {
      await uploadBytes(folderRef, new Uint8Array()); // Upload an empty byte array to create a folder
      setFolderName(''); // Reset folder name
      setShowCreateFolderModal(false); // Hide create folder modal
      fetchFiles(); // Refresh the file list
    } catch (error) {
      console.error("Error creating folder:", error); // Log error if folder creation fails
    }
  };

  // Function to handle folder click and set the current path
  const handleFolderClick = (folder: StorageReference) => {
    setCurrentPath(prevPath => prevPath ? `${prevPath}/${folder.name}` : folder.name); // Update current path to include clicked folder
  };

  // Function to handle going back to the previous folder
  const handleGoBack = () => {
    setCurrentPath(prevPath => prevPath ? prevPath.substring(0, prevPath.lastIndexOf('/')) : null); // Update current path to go back one level
  };

  // Function to handle file click and retrieve file URL and metadata
  const handleFileClick = async (file: StorageReference) => {
    const url = await getDownloadURL(file); // Get the download URL for the file
    const metadata = await getMetadata(file); // Get the metadata for the file
    // Display modal or perform any action with the file
  };

  // Function to handle file deletion
  const handleDelete = async (file: StorageReference) => {
    try {
      await deleteObject(file); // Delete the specified file
      fetchFiles(); // Refresh the file list after deletion
    } catch (error) {
      console.error("Error deleting file:", error); // Log error if deletion fails
    }
  };

  // Function to handle folder deletion
  const handleDeleteFolder = async (folder: StorageReference) => {
    try {
      await deleteFolderRecursively(folder); // Delete the folder recursively
      fetchFiles(); // Refresh the file list after deletion
    } catch (error) {
      console.error("Error deleting folder:", error); // Log error if deletion fails
    }
  };

  // Function to delete a folder and all its contents recursively
  const deleteFolderRecursively = async (folderRef: StorageReference) => {
    // Fetch and delete all files within the folder before deleting the folder itself
    const res = await listAll(folderRef); // List all items in the folder
    await Promise.all(res.items.map(file => deleteObject(file))); // Delete all files
    await Promise.all(res.prefixes.map(subFolder => deleteFolderRecursively(subFolder))); // Recursively delete subfolders
    await deleteObject(folderRef); // Finally, delete the folder itself
  };

  // Function to close any open modals
  const handleCloseModal = () => {
    setImageModal(null); // Close image modal
    setDetailsModal(null); // Close details modal
    setVideoModal(null); // Close video modal
  };

  // Function to handle search input change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase()); // Update search query based on user input
  };

  return (
    <div className={`locker-container ${dragging ? 'dragging' : ''}`}>
      <Header/> {/* Render the header component */}
      <StudentPresidentSidebar/> {/* Render the sidebar for the student president */}
      <h1>Files for {organizationName}</h1> {/* Display the organization name */}
      {/* Add JSX for displaying files, folders, and modals */}
      <input 
        type="text" 
        placeholder="Search files..." 
        value={searchQuery} 
        onChange={handleSearch} // Bind search input to search query state
      />
      <button onClick={() => setShowCreateFolderModal(true)}>
        <FontAwesomeIcon icon={faFolderPlus} /> Create Folder
      </button>
      {showCreateFolderModal && (
        <div className="modal">
          <h2>Create New Folder</h2>
          <input 
            type="text" 
            value={folderName} 
            onChange={(e) => setFolderName(e.target.value)} 
            placeholder="Folder Name" 
          />
          <button onClick={handleCreateFolder}>Create</button>
          <button onClick={() => setShowCreateFolderModal(false)}>Cancel</button>
        </div>
      )}
      <div className="files-container">
        {folders.filter(folder => folder.name.toLowerCase().includes(searchQuery)).map(folder => (
          <div key={folder.name} onClick={() => handleFolderClick(folder)}>
            {getFileIcon(folder.name)} {folder.name} {/* Render folder icon and name */}
          </div>
        ))}
        {files.filter(file => file.name.toLowerCase().includes(searchQuery)).map(file => (
          <div key={file.name} onClick={() => handleFileClick(file)}>
            {getFileIcon(file.name)} {file.name} {/* Render file icon and name */}
            <button onClick={() => handleDelete(file)}>Delete</button> {/* Delete button for each file */}
          </div>
        ))}
      </div>
      {/* Other UI elements such as modals for file preview and details would go here */}
    </div>
  );
};

export default OrganizationResources;
