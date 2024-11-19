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


  useEffect(() => {
    if (organizationName) {
      fetchUserRole();
    }
  }, [organizationName]);

  useEffect(() => {
    if (role) {
      fetchFilesAndFolders();
    }
  }, [folderType, role, currentPath]); 

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
    const folderPath = `organizations/${organizationName}/ORG_files/${folderType}/${folderName}/placeholder.txt`;
    const folderRef = ref(storage, folderPath);

    // Create a placeholder file to ensure the folder is created in Firebase
    await uploadBytes(folderRef, new Blob(['Placeholder file'], { type: 'text/plain' }));
    setFolders((prevFolders) => [...prevFolders, folderName]);
    setFolderName(''); // Clear input after creation
    alert(`Folder '${folderName}' created successfully.`);
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('Error creating folder.');
  }
};
const deleteSelectedFolders = async () => {
  try {
    const folderPath = `organizations/${organizationName}/ORG_files/${folderType}`;
    const foldersToDelete = Array.from(selectedFolders); // Convert Set to Array

    for (const folderName of foldersToDelete) {
      const folderRef = ref(storage, `${folderPath}/${folderName}/`);
      const folderList = await listAll(folderRef);

      // Delete all files in the folder
      for (const fileRef of folderList.items) {
        await deleteObject(fileRef);
      }

      // Delete all subfolders
      for (const subfolderRef of folderList.prefixes) {
        await deleteObject(subfolderRef);
      }
    }

    setFolders((prevFolders) => prevFolders.filter((folder) => !selectedFolders.has(folder)));
    setSelectedFolders(new Set());
    alert('Selected folders deleted successfully.');
  } catch (error) {
    console.error('Error deleting folders:', error);
    alert('Error deleting folders.');
  }
};

const fetchFilesAndFolders = async () => {
  try {
    const basePath = `organizations/${organizationName}/ORG_files/${folderType}`;
    const fullPath = currentPath ? `${basePath}/${currentPath}` : basePath;
    const storageRef = ref(storage, fullPath);

    const listResult = await listAll(storageRef);

    const filePromises = listResult.items.map(async (item: StorageReference) => {
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
      const folderPath = `organizations/${organizationName}/ORG_files/${folderType}/${file.name}`;
      const storageRef = ref(storage, folderPath);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const uploadedFile: UploadedFile = {
        name: file.name,
        url: downloadURL,
        type: file.type,
      };

      setFiles((prevFiles) => [...prevFiles, uploadedFile]);
      alert(`File uploaded successfully: ${downloadURL}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('File upload failed.');
    }
  };

  const handleDelete = async () => {
    try {
      const folderPath = `organizations/${organizationName}/ORG_files/${folderType}`;
      const filesToDelete = Array.from(selectedFiles); // Convert Set to Array
  
      for (const fileName of filesToDelete) {
        const fileRef = ref(storage, `${folderPath}/${fileName}`);
        await deleteObject(fileRef);
      }
  
      setFiles((prevFiles) => prevFiles.filter((file) => !selectedFiles.has(file.name)));
      alert('Selected files deleted successfully.');
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Error deleting files:', error);
      alert('Error deleting files.');
    }
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

  const FilePreview: React.FC<{ fileUrl: string; fileType: string }> = ({ fileUrl, fileType }) => {
    if (fileType.startsWith('image/')) {
      return <img src={fileUrl} alt="Preview" style={{ maxWidth: '100%' }} />;
    } else if (fileType.startsWith('video/')) {
      return <video src={fileUrl} controls style={{ maxWidth: '100%' }} />;
    }
    return <p>Preview not available</p>;
  };

  if (!role) {
    return <p>Loading...</p>;
  }

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
            <button onClick={deleteSelectedFolders} disabled={selectedFolders.size === 0}>
              Delete Selected Folders
            </button>
            <button onClick={navigateUp} disabled={!currentPath}>
              Go Up
            </button>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            />
            <button onClick={handleUpload}>Upload</button>
            <button onClick={handleDelete} disabled={selectedFiles.size === 0}>
              Delete Selected Files
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
  
          <div className="folder-list">
            <h3>Folders</h3>
            {folders.length > 0 ? (
              folders.map((folder) => (
                <div key={folder} className="folder-item">
                  <input
                    type="checkbox"
                    checked={selectedFolders.has(folder)}
                    onChange={() => {
                      setSelectedFolders((prev) => {
                        const updated = new Set(prev);
                        if (updated.has(folder)) {
                          updated.delete(folder);
                        } else {
                          updated.add(folder);
                        }
                        return updated;
                      });
                    }}
                  />
                  <p onClick={() => openFolder(folder)}>{folder}</p>
                </div>
              ))
            ) : (
              <p>No folders found.</p>
            )}
          </div>
  
          <div className="file-list">
            <h3>Files</h3>
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file) => (
                <div key={file.name} className="file-item">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.name)}
                    onChange={() => toggleFileSelection(file.name)}
                  />
                  <p>{file.name}</p>
                  <FilePreview fileUrl={file.url} fileType={file.type} />
                </div>
              ))
            ) : (
              <p>No files found.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
  
};

export default OrganizationResources;
