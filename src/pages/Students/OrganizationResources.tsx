import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '../../services/firebaseConfig';
import '../../styles/OrganizationResources.css';
import OrganizationSidebar from './OrganizationSidebar';

interface Resource {
  id: string;
  name: string;
  type: 'file' | 'folder';
  url?: string;
  timestamp: Timestamp;
  parentId?: string; // Optional for folder nesting
}

const StudentResources: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch resources from Firestore
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const q = query(collection(firestore, 'resources'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedResources: Resource[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Resource[];

        setResources(fetchedResources);
      } catch (err) {
        console.error('Error fetching resources:', err);
        setError('Error fetching resources.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  // Handle File Upload
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      const fileRef = ref(storage, `resources/${uploadFile.name}`);
      await uploadBytes(fileRef, uploadFile);
      const url = await getDownloadURL(fileRef);

      await addDoc(collection(firestore, 'resources'), {
        name: uploadFile.name,
        type: 'file',
        url,
        timestamp: Timestamp.now(),
      });

      setUploadFile(null);
      setError(null);
      alert('File uploaded successfully!');
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Error uploading file.');
    }
  };

  // Handle Folder Creation
  const handleCreateFolder = async () => {
    if (!folderName) {
      setError('Folder name cannot be empty.');
      return;
    }

    try {
      await addDoc(collection(firestore, 'resources'), {
        name: folderName,
        type: 'folder',
        timestamp: Timestamp.now(),
      });

      setFolderName('');
      alert('Folder created successfully!');
    } catch (err) {
      console.error('Error creating folder:', err);
      setError('Error creating folder.');
    }
  };

  return (
    <div className="resources-container">
     <OrganizationSidebar /> {/* OrganizationSidebar component */}
      <h2>Global Resources Hub</h2>
      {error && <p className="error">{error}</p>}

      <div className="upload-section">
        <h3>Upload File</h3>
        <input type="file" onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} />
        <button onClick={handleFileUpload}>Upload</button>
      </div>

      <div className="create-folder-section">
        <h3>Create Folder</h3>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Enter folder name"
        />
        <button onClick={handleCreateFolder}>Create Folder</button>
      </div>

      <div className="resources-list">
        <h3>Resources</h3>
        {loading ? (
          <p>Loading resources...</p>
        ) : resources.length === 0 ? (
          <p>No resources available.</p>
        ) : (
          <ul>
            {resources.map((resource) => (
              <li key={resource.id}>
                {resource.type === 'file' ? (
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    {resource.name}
                  </a>
                ) : (
                  <p>📁 {resource.name}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StudentResources;
