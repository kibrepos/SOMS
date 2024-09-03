import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject, StorageReference, getMetadata } from 'firebase/storage';
import { storage } from '../services/firebaseConfig';
import '../styles/Locker.css';
import { authStateListener } from '../services/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFile, faSearch, faEllipsisV, faArrowLeft, faPlus, faPaperclip } from '@fortawesome/free-solid-svg-icons';

const Locker = () => {
  const [files, setFiles] = useState<StorageReference[]>([]);
  const [folders, setFolders] = useState<StorageReference[]>([]);
  const [user, setUser] = useState<any | null>(null);
  const [folderName, setFolderName] = useState('');
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);
  const [detailsModal, setDetailsModal] = useState<{ name: string, size: string, path: string, date: string } | null>(null);

  useEffect(() => {
    const unsubscribe = authStateListener(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user, currentPath]);

  const fetchFiles = async () => {
    if (!user) return;

    const folderRef = ref(storage, `user_files/${user.uid}${currentPath ? `/${currentPath}` : ''}`);
    try {
      const res = await listAll(folderRef);
      setFolders(res.prefixes);
      setFiles(res.items);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files) return;

    const file = e.target.files[0];
    const fileRef = ref(storage, `user_files/${user.uid}${currentPath ? `/${currentPath}` : ''}/${file.name}`);
    
    try {
      await uploadBytes(fileRef, file);
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !folderName) return;

    const folderRef = ref(storage, `user_files/${user.uid}${currentPath ? `/${currentPath}` : ''}/${folderName}/`);
    
    try {
      const dummyFile = new Blob(['This is a dummy file'], { type: 'text/plain' });
      await uploadBytes(ref(folderRef, 'dummy.txt'), dummyFile);
      fetchFiles();
      setFolderName('');
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleFolderClick = (folder: StorageReference) => {
    setCurrentPath((prevPath) => prevPath ? `${prevPath}/${folder.name}` : folder.name);
  };

  const handleGoBack = () => {
    setCurrentPath((prevPath) => prevPath ? prevPath.substring(0, prevPath.lastIndexOf('/')) : null);
  };

  const handleFileClick = async (file: StorageReference) => {
    if (dropdownIndex !== null) return; // Prevent file opening if dropdown is open

    try {
      const url = await getDownloadURL(file);
      if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')) {
        setImageModal(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  };

  const handleDelete = async (file: StorageReference) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteObject(file);
        fetchFiles();
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }
  };

  const handleDownload = async (file: StorageReference) => {
    try {
      const url = await getDownloadURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setDropdownIndex(null);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const handleCloseModal = () => {
    setImageModal(null);
    setDetailsModal(null);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const handleDropdownClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Prevent triggering the file or folder click
    setDropdownIndex(index === dropdownIndex ? null : index);
  };
  document.addEventListener('click', (e) => {
    // Close the dropdown if clicked outside
    if (dropdownIndex !== null) {
        setDropdownIndex(null);
    }
});

  const handleViewDetails = async (file: StorageReference) => {
    try {
      const metadata = await getMetadata(file);
      const size = (metadata.size / 1024).toFixed(2) + ' KB';
      const path = file.fullPath;
      const date = new Date(metadata.timeCreated).toLocaleString();

      setDetailsModal({
        name: file.name,
        size,
        path,
        date
      });
      setDropdownIndex(null);
    } catch (error) {
      console.error("Error fetching file details:", error);
    }
  };

  return (
    <div className="locker-container">
      <h2>File Locker</h2>
         
      <div className="head">
        <h2>{currentPath ? currentPath : 'Main'}</h2>
        <div className="controls">
          <button className="go-back-button" onClick={handleGoBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Go Back
          </button>
          <button className="create-folder-button" onClick={() => setShowCreateFolderModal(true)}>
            <FontAwesomeIcon icon={faPlus} />
            New Folder
          </button>
          <label className="attach-file-button">
            <FontAwesomeIcon icon={faPaperclip} />
            Attach File
            <input type="file" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearch}
        />
        <FontAwesomeIcon icon={faSearch} />
      </div>

      <div className="file-list">
        {folders.filter(folder => folder.name.toLowerCase().includes(searchQuery)).map((folder, index) => (
          <div key={index} className="folder-item" onClick={() => handleFolderClick(folder)}>
            <FontAwesomeIcon icon={faFolder} className="icon folder-icon" />
            <span>{folder.name}</span>
            <FontAwesomeIcon
              icon={faEllipsisV}
              className="ellipsis"
              onClick={(e) => handleDropdownClick(e, index)}
            />
            {dropdownIndex === index && (
              <div className="dropdown">
                <ul>
                  <li onClick={() => handleViewDetails(folder)}>View Details</li>
                  <li onClick={() => handleDownload(folder)}>Download</li>
                  <li onClick={() => handleDelete(folder)}>Delete</li>
                </ul>
              </div>
            )}
          </div>
        ))}
        {files.filter(file => file.name.toLowerCase().includes(searchQuery)).map((file, index) => (
          <div key={index} className="file-item" onClick={() => handleFileClick(file)}>
            <FontAwesomeIcon icon={faFile} className="icon file-icon" />
            <span>{file.name}</span>
            <FontAwesomeIcon
              icon={faEllipsisV}
              className="ellipsis"
              onClick={(e) => handleDropdownClick(e, index)}
            />
            {dropdownIndex === index && (
              <div className="dropdown">
                <ul>
                  <li onClick={() => handleViewDetails(file)}>View Details</li>
                  <li onClick={() => handleDownload(file)}>Download</li>
                  <li onClick={() => handleDelete(file)}>Delete</li>
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreateFolderModal && (
        <div className="modal-overlay" onClick={() => setShowCreateFolderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder Name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
            <button onClick={handleCreateFolder}>Create</button>
            <button className="close-modal" onClick={() => setShowCreateFolderModal(false)}>Close</button>
          </div>
        </div>
      )}

      {imageModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content image-modal" onClick={(e) => e.stopPropagation()}>
            <img src={imageModal} alt="Preview" />
            <button className="close-modal" onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}

      {detailsModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>File Details</h3>
            <p><strong>Name:</strong> {detailsModal.name}</p>
            <p><strong>Size:</strong> {detailsModal.size}</p>
            <p><strong>Path:</strong> {detailsModal.path}</p>
            <p><strong>Date:</strong> {detailsModal.date}</p>
            <button className="close-modal" onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locker;
