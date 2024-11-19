import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { firestore, storage, auth } from '../../services/firebaseConfig';
import '../../styles/OrganizationResources.css';
import {
  ref,
  listAll,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  getMetadata,
  StorageReference,
} from 'firebase/storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Header from '../../components/Header';
import StudentPresidentSidebar from './StudentPresidentSidebar';

interface UploadedFile {
  name: string;
  url: string;
  type: string;
}

const OrganizationResources: React.FC = () => {
  const { organizationName } = useParams<{ organizationName: string }>();
  const [role, setRole] = useState<string>(''); // User's role: 'president', 'officer', 'member', 'guest'
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folderType, setFolderType] = useState<'public' | 'private'>('public');
  const [file, setFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set()); // Track selected files for deletion
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Track sorting order
  const [folderName, setFolderName] = useState<string>(''); // State for new folder name
  const [folders, setFolders] = useState<string[]>([]); // State for folders
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [currentPath, setCurrentPath] = useState<string>(''); // Tracks the current folder path
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: string; url: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null); 
  const [detailsContent, setDetailsContent] = useState<{name: string; type?: string;url?: string;size?: string;uploadedBy?: string;dateUploaded?: string;} | null>(null);
  





  useEffect(() => {
    if (organizationName) {
      fetchUserRole();
    }
  }, [organizationName]);

  useEffect(() => {
    if (role) {
      setCurrentPath(''); // Reset only when folderType changes
      fetchFilesAndFolders(); // Fetch files and folders for the new folderType
    }
  }, [folderType, role]);
  
  useEffect(() => {
    if (role) {
      fetchFilesAndFolders(); // Fetch files for the current path
    }
  }, [currentPath, role]);
  

  const fetchUserRole = async () => {
    if (!organizationName) {
      console.error('Error: organizationName is undefined.');
      setRole('guest');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      console.error('User is not authenticated.');
      setRole('guest');
      return;
    }

    try {
      const orgQuery = query(
        collection(firestore, 'organizations'),
        where('name', '==', organizationName)
      );
      const orgSnapshot = await getDocs(orgQuery);

      if (!orgSnapshot.empty) {
        const orgData = orgSnapshot.docs[0].data();
        console.log('Organization data:', orgData);

        if (orgData?.president?.id === user.uid) {
          setRole('president');
        } else if (orgData?.officers?.some((officer: { id: string }) => officer.id === user.uid)) {
          setRole('officer');
        } else if (orgData?.members?.some((member: { id: string }) => member.id === user.uid)) {
          setRole('member');
        } else {
          setRole('guest');
        }
      } else {
        console.error(`Organization with name '${organizationName}' does not exist.`);
        setRole('guest');
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('guest');
    }
  };

const createFolder = async () => {
  if (!folderName.trim()) {
    alert('Folder name cannot be empty.');
    return;
  }

  try {
    const userName = await fetchUserFullName(); // Fetch the uploader's full name
    const folderPath = `organizations/${organizationName}/ORG_files/${folderType}${
      currentPath ? `/${currentPath}` : ''
    }/${folderName}/placeholder.txt`; // Path for placeholder file

    const folderRef = ref(storage, folderPath);

    // Create a placeholder file with metadata
    const metadata = {
      customMetadata: {
        uploadedBy: userName,
        dateUploaded: new Date().toISOString(), // Add the current date
      },
    };

    await uploadBytes(folderRef, new Blob(['Placeholder file'], { type: 'text/plain' }), metadata);
    setFolders((prevFolders) => [...prevFolders, folderName]);
    setFolderName(''); // Clear input after creation
    alert(`Folder '${folderName}' created successfully.`);
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('Error creating folder.');
  }
};



  const fetchFilesAndFolders = async () => {
    try {
      const basePath = `organizations/${organizationName}/ORG_files/${folderType}`;
      const fullPath = currentPath ? `${basePath}/${currentPath}` : basePath;
      const storageRef = ref(storage, fullPath);
  
      const listResult = await listAll(storageRef);
  
      const filePromises = listResult.items
        .filter((item) => item.name !== 'placeholder.txt') // Exclude placeholder file
        .map(async (item: StorageReference) => {
          const url = await getDownloadURL(item);
          const metadata = await getMetadata(item);
          return { name: item.name, url, type: metadata.contentType || 'unknown' };
        });
  
      const folderNames = listResult.prefixes.map((prefix) => prefix.name); // Get folder names
  
      const resolvedFiles = await Promise.all(filePromises);
  
      setFolders(folderNames);
      setFiles(resolvedFiles);
    } catch (error) {
      console.error('Error fetching files and folders:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const fetchFileMetadata = async (filePath: string) => {
    try {
      const fileRef = ref(storage, filePath);
      const metadata = await getMetadata(fileRef);
  
      setDetailsContent({
        name: metadata.name,
        type: metadata.contentType || 'Unknown',
        size: `${(metadata.size / 1024).toFixed(2)} KB`, // Convert size to KB
        uploadedBy: metadata.customMetadata?.uploadedBy || 'Unknown',
        dateUploaded: metadata.timeCreated ? formatDate(metadata.timeCreated) : 'Unknown',
        url: await getDownloadURL(fileRef),
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching file metadata:', error);
    }
  };
  
  const fetchUserFullName = async (): Promise<string> => {
    const user = auth.currentUser;
    if (!user) return 'Unknown';
  
    try {
      // Check in the `students` collection
      const studentsRef = collection(firestore, 'students');
      let querySnapshot = await getDocs(query(studentsRef, where('id', '==', user.uid)));
      if (!querySnapshot.empty) {
        const studentData = querySnapshot.docs[0].data();
        return `${studentData.firstname} ${studentData.lastname}`;
      }
  
      // Check in the `faculty` collection
      const facultyRef = collection(firestore, 'faculty');
      querySnapshot = await getDocs(query(facultyRef, where('id', '==', user.uid)));
      if (!querySnapshot.empty) {
        const facultyData = querySnapshot.docs[0].data();
        return `${facultyData.firstname} ${facultyData.lastname}`;
      }
  
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  
    return 'Unknown';
  };
  
  


  const handleViewDetails = async (itemName: string, isFolder: boolean) => {
    if (isFolder) {
      const folderPath = `organizations/${organizationName}/ORG_files/${folderType}${
        currentPath ? `/${currentPath}` : ''
      }/${itemName}`;
      await fetchFolderMetadata(folderPath);
    } else {
      const filePath = `organizations/${organizationName}/ORG_files/${folderType}${
        currentPath ? `/${currentPath}` : ''
      }/${itemName}`;
      await fetchFileMetadata(filePath);
    }
  };
  


  const DetailsModal: React.FC<{
    content: { name: string; type?: string; url?: string; size?: string; uploadedBy?: string; dateUploaded?: string } | null;
    onClose: () => void;
  }> = ({ content, onClose }) => {
    if (!content) return null;
  
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>Details</h3>
          <p><strong>Name:</strong> {content.name}</p>
          {content.type && <p><strong>Type:</strong> {content.type}</p>}
          {content.size && <p><strong>Size:</strong> {content.size}</p>}
          {content.uploadedBy && <p><strong>Uploaded By:</strong> {content.uploadedBy}</p>}
          {content.dateUploaded && <p><strong>Date Uploaded:</strong> {content.dateUploaded}</p>}
          {content.url && (
            <p>
              <strong>URL:</strong>{' '}
              <a href={content.url} target="_blank" rel="noopener noreferrer">
                Open File
              </a>
            </p>
          )}
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  };
  

const openFolder = (folderName: string) => {
  setCurrentPath((prevPath) => (prevPath ? `${prevPath}/${folderName}` : folderName));
};
const navigateUp = () => {
  setCurrentPath((prevPath) => {
    const parts = prevPath.split('/').filter(Boolean); // Split and remove empty strings
    parts.pop(); // Remove the last part of the path
    return parts.join('/');
  });
};


const handleUpload = async () => {
  if (!file) {
    alert('Please select a file.');
    return;
  }

  try {
    const userName = await fetchUserFullName();

    const folderPath = `organizations/${organizationName}/ORG_files/${folderType}${
      currentPath ? `/${currentPath}` : ''
    }/${file.name}`;
    const storageRef = ref(storage, folderPath);

    // Add custom metadata for the uploader
    const metadata = {
      customMetadata: {
        uploadedBy: userName,
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const uploadedFile: UploadedFile = {
      name: file.name,
      url: downloadURL,
      type: file.type,
    };

    setFiles((prevFiles) => [...prevFiles, uploadedFile]);
    alert(`File uploaded successfully by ${userName}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    alert('File upload failed.');
  }
};




const fetchFolderMetadata = async (folderPath: string) => {
  try {
    const folderRef = ref(storage, folderPath);
    const folderList = await listAll(folderRef);

    // Look for the placeholder file
    const placeholderFile = folderList.items.find((item) => item.name === 'placeholder.txt');
    if (placeholderFile) {
      const metadata = await getMetadata(placeholderFile);
      const uploadedBy = metadata.customMetadata?.uploadedBy || 'Unknown';
      const dateUploaded = metadata.customMetadata?.dateUploaded
        ? formatDate(metadata.customMetadata.dateUploaded)
        : 'Unknown';

      setDetailsContent({
        name: folderPath.split('/').pop() || 'Unknown',
        type: 'Folder',
        size: '-',
        uploadedBy,
        dateUploaded,
      });
    } else {
      setDetailsContent({
        name: folderPath.split('/').pop() || 'Unknown',
        type: 'Folder',
        size: '-',
        uploadedBy: 'Unknown',
        dateUploaded: 'Unknown',
      });
    }
    setIsModalOpen(true);
  } catch (error) {
    console.error('Error fetching folder metadata:', error);
  }
};




const handleDelete = async () => {
  try {
    // Base path for the selected folder or files
    const basePath = `organizations/${organizationName}/ORG_files/${folderType}${
      currentPath ? `/${currentPath}` : ''
    }`;

    // Delete selected files
    const filesToDelete = Array.from(selectedFiles); // Convert Set to Array
    for (const fileName of filesToDelete) {
      const fileRef = ref(storage, `${basePath}/${fileName}`);
      await deleteObject(fileRef);
    }

    // Delete selected folders recursively
    const foldersToDelete = Array.from(selectedFolders); // Convert Set to Array
    for (const folderName of foldersToDelete) {
      const folderPath = `${basePath}/${folderName}`; // Ensure folderPath is typed correctly
      await deleteFolderRecursively(folderPath);
    }

    // Update UI after deletion
    setFiles((prevFiles) =>
      prevFiles.filter((file) => !selectedFiles.has(file.name))
    );
    setFolders((prevFolders) =>
      prevFolders.filter((folder) => !selectedFolders.has(folder))
    );
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());

    alert('Selected files and folders deleted successfully.');
  } catch (error) {
    console.error('Error deleting files or folders:', error);
    alert('Error deleting files or folders.');
  }
};

const deleteFolderRecursively = async (folderPath: string) => {
  const folderRef = ref(storage, folderPath);

  // List all items (files and subdirectories) in the folder
  const listResult = await listAll(folderRef);

  // Delete all files in the folder
  for (const fileRef of listResult.items) {
    await deleteObject(fileRef);
  }

  // Recursively delete all subfolders
  for (const subfolderRef of listResult.prefixes) {
    await deleteFolderRecursively(subfolderRef.fullPath);
  }
};




  const handleFileClick = (file: UploadedFile) => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setModalContent({ type: file.type, url: file.url });
      setIsModalOpen(true);
    } else {
      window.open(file.url, '_blank'); // Open other file types directly
    }
  };
  
  const handleMenuClick = (itemName: string) => {
    setSelectedItem((prev) => (prev === itemName ? null : itemName));
  };

  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles((prevSelected) => {
      const updatedSelected = new Set(prevSelected);
      if (updatedSelected.has(fileName)) {
        updatedSelected.delete(fileName);
      } else {
        updatedSelected.add(fileName);
      }
      return updatedSelected;
    });
  };
  
  const toggleFolderSelection = (folderName: string) => {
    setSelectedFolders((prevSelected) => {
      const updatedSelected = new Set(prevSelected);
      if (updatedSelected.has(folderName)) {
        updatedSelected.delete(folderName);
      } else {
        updatedSelected.add(folderName);
      }
  
      return updatedSelected;
    });
  };


  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);

    setFiles((prevFiles) =>
      [...prevFiles].sort((a, b) =>
        newOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      )
    );
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  if (!role) {
    return <p>Loading...</p>;
  }
  const Modal: React.FC<{ content: { type: string; url: string } | null; onClose: () => void }> = ({
    content,
    onClose,
  }) => {
    if (!content) return null;
  
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {content.type.startsWith('image/') ? (
            <img src={content.url} alt="Preview" style={{ maxWidth: '100%' }} />
          ) : content.type.startsWith('video/') ? (
            <video src={content.url} controls style={{ maxWidth: '100%' }} />
          ) : null}
          <button onClick={onClose} className="close-modal">Close</button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="organization-resources">
      <Header />
      <div className="layout">
        <StudentPresidentSidebar />
        <main className="main-content">
          <h1>Organization Resources: {organizationName}</h1>
          <h2>Your Role: {role}</h2>
  
          <div className="breadcrumbs">
            <span onClick={() => setCurrentPath('')}>/</span>
            {currentPath.split('/').map((part, index, arr) => (
              <span
                key={index}
                onClick={() => setCurrentPath(arr.slice(0, index + 1).join('/'))}
              >
                {` / ${part}`}
              </span>
            ))}
          </div>
  
          <div className="toolbar">
            <select
              value={folderType}
              onChange={(e) => setFolderType(e.target.value as 'public' | 'private')}
              disabled={role === 'member' && folderType === 'private'}
            >
              <option value="public">Public Folder</option>
              {role !== 'member' && <option value="private">Private Folder</option>}
            </select>
            <input
              type="text"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
            <button onClick={createFolder}>Create Folder</button>
            <button onClick={navigateUp} disabled={!currentPath}>
              Go Up
            </button>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            />
            <button onClick={handleUpload}>Upload</button>
            <button onClick={handleDelete} disabled={selectedFiles.size === 0 && selectedFolders.size === 0}>
  Delete Selected
</button>

            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={toggleSortOrder}>
              Sort {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
            </button>
          </div>
  
          <div className="resources-list">
            {folders.length > 0 || filteredFiles.length > 0 ? (
              <>
                {/* Render Folders */}
                {folders.map((folder) => (
                  <div key={folder} className="folder-item">
                    <input
                      type="checkbox"
                      checked={selectedFolders.has(folder)}
                      onChange={() => toggleFolderSelection(folder)}
                    />
                    <p onClick={() => openFolder(folder)}>{folder}</p>
                    <div className="options-menu">
  <span onClick={() => handleMenuClick(folder)}>⋮</span>
  {selectedItem === folder && (
    <div className="menu-dropdown">
    <p onClick={() => handleViewDetails(folder, true)}>View Details</p>
  </div>
  
  )}
</div>
                  </div>
                ))}
  
                {/* Render Files */}
                {filteredFiles.map((file) => (
                  <div key={file.name} className="file-item">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.name)}
                      onChange={() => toggleFileSelection(file.name)}
                    />
                    <p onClick={() => handleFileClick(file)}>{file.name}</p>
                    <div className="options-menu">
  <span onClick={() => handleMenuClick(file.name)}>⋮</span>
  {selectedItem === file.name && (
    <div className="menu-dropdown">
      <p onClick={() => handleViewDetails(file.name, false)}>View Details</p>
    </div>
  )}
</div>

                  </div>
                ))}
              </>
            ) : (
              <p>No folders or files found.</p>
            )}

  {detailsContent && <DetailsModal content={detailsContent} onClose={() => setDetailsContent(null)} />}

            {/* Modal for Image/Video Preview */}
            {isModalOpen && modalContent && (
              <Modal content={modalContent} onClose={() => setIsModalOpen(false)} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
  

  
};

export default OrganizationResources;
