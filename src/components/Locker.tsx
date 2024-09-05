import React, { useState, useEffect } from 'react';
import { ref, uploadBytes,uploadBytesResumable, listAll, getDownloadURL, deleteObject, StorageReference, getMetadata } from 'firebase/storage';
import { storage } from '../services/firebaseConfig';
import '../styles/Locker.css';
import { authStateListener } from '../services/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFile, faSearch, faEllipsisV, faArrowLeft, faPlus, faPaperclip, faImage, faVideo, faFileAlt, faFilePdf, faFileWord, faFilePowerpoint, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const Locker = () => {
  const [files, setFiles] = useState<StorageReference[]>([]);
  const [folders, setFolders] = useState<StorageReference[]>([]);
  const [user, setUser] = useState<any | null>(null);
  const [folderName, setFolderName] = useState('');
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownIndex, setDropdownIndex] = useState<string | null>(null);
  const [detailsModal, setDetailsModal] = useState<{ name: string, size: string, path: string, date: string } | null>(null);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);


  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
        return faImage;
    } else if (fileName.endsWith('.mp4') || fileName.endsWith('.avi') || fileName.endsWith('.mov') || fileName.endsWith('.webm')) {
        return faVideo;
    } else if (fileName.endsWith('.pdf')) {
        return faFilePdf;
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        return faFileWord;
    } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
        return faFilePowerpoint;
    } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        return faFileExcel;
    } else {
        return faFileAlt; // Default icon for other file types
    }
};

const getFileIconClass = (fileName: string) => {
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
      return 'image-icon';
  } else if (fileName.endsWith('.mp4') || fileName.endsWith('.avi') || fileName.endsWith('.mov') || fileName.endsWith('.webm')) {
      return 'video-icon';
  } else if (fileName.endsWith('.pdf')) {
      return 'pdf-icon';
  } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return 'word-icon';
  } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
      return 'powerpoint-icon';
  } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      return 'excel-icon';
  } else {
      return 'file-icon'; // Default class for other file types
  }
};



    useEffect(() => {
        const unsubscribe = authStateListener(setUser);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            fetchFiles();
        }
    }, [user, currentPath]);

    useEffect(() => {
        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            setDragging(true);
            addDropLines();
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            setDragging(false);
            removeDropLines();
            if (e.dataTransfer?.files) {
                handleFileUpload(e.dataTransfer.files);
            }
        };


        document.addEventListener('dragenter', handleDragEnter);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', handleDrop);
        document.addEventListener('click', () => {
          if (dragging) {
              setDragging(false);
              removeDropLines();
          }
      });

      return () => {
          document.removeEventListener('dragenter', handleDragEnter);
          document.removeEventListener('dragover', handleDragOver);
          document.removeEventListener('drop', handleDrop);
       
          document.removeEventListener('click', () => {
              if (dragging) {
                  setDragging(false);
                  removeDropLines();
              }
          });
        };
    }, [user, currentPath]);

    const addDropLines = () => {
        const horizontalLine = document.createElement('div');
        horizontalLine.className = 'drop-line horizontal active';
        document.body.appendChild(horizontalLine);

        const verticalLine = document.createElement('div');
        verticalLine.className = 'drop-line vertical active';
        document.body.appendChild(verticalLine);
    };

    const removeDropLines = () => {
        const lines = document.querySelectorAll('.drop-line');
        lines.forEach(line => line.remove());
    };

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

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files) return;

        handleFileUpload(e.target.files);
    };

    const handleFileUpload = async (files: FileList) => {
      setLoading(true);
  
      const fileArray = Array.from(files); // Convert FileList to Array
  
      const filesToUpload = [];
      const fileNames = new Set<string>();
      const overwrittenFiles = new Set<string>(); // Track files that were overwritten
  
      // Collect files that need to be uploaded and their names
      for (const file of fileArray) {
          const fileName = file.name;
          const fileRef = ref(storage, `user_files/${user.uid}${currentPath ? `/${currentPath}` : ''}/${fileName}`);
  
          // Check if file already exists
          try {
              await getDownloadURL(fileRef); // This will succeed if the file exists
              if (!fileNames.has(fileName)) {
                  const overwrite = window.confirm(`File "${fileName}" already exists. Do you want to overwrite it?`);
  
                  if (overwrite) {
                      filesToUpload.push({ fileRef, file });
                      fileNames.add(fileName);
                      overwrittenFiles.add(fileName);
                  }
              }
          } catch (error) {
              // If getDownloadURL fails, the file does not exist
              filesToUpload.push({ fileRef, file });
              fileNames.add(fileName);
          }
      }
  
      // Upload files
      await Promise.all(filesToUpload.map(({ fileRef, file }) => {
          return new Promise<void>((resolve, reject) => {
              const uploadTask = uploadBytesResumable(fileRef, file);
  
              uploadTask.on('state_changed',
                  (snapshot) => {
                      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                      setUploadProgress(progress);
                  },
                  (error) => {
                      console.error("Error uploading file:", error);
                      reject(error);
                  },
                  async () => {
                      await fetchFiles();
                      resolve();
                  }
              );
          });
      }));
  
      setLoading(false);
      setUploadProgress(null);
      alert(`Files uploaded successfully. ${overwrittenFiles.size} file(s) were overwritten.`);
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
        if (dropdownIndex !== null) return;

        try {
            const url = await getDownloadURL(file);
            const videoExtensions = ['.mp4', '.avi', '.mov', '.webm', '.mkv'];

            if (videoExtensions.some(ext => file.name.endsWith(ext))) {
                setVideoModal(url);
            } else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')) {
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

    const deleteFolderRecursively = async (folderRef: StorageReference) => {
        try {
            const res = await listAll(folderRef);

            for (const file of res.items) {
                await deleteObject(file);
            }

            for (const folder of res.prefixes) {
                await deleteFolderRecursively(folder);
            }

            await deleteObject(folderRef);
        } catch (error) {
            console.error("Error deleting folder or its contents:", error);
        }
    };

    const handleDeleteFolder = async (folder: StorageReference) => {
        if (window.confirm('Are you sure you want to delete this folder? This will also delete all files and subfolders.')) {
            try {
                await deleteFolderRecursively(folder);
                fetchFiles();
            } catch (error) {
                console.error("Error deleting folder:", error);
            }
        }
    };

    const handleCloseModal = () => {
        setImageModal(null);
        setDetailsModal(null);
        setVideoModal(null);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const handleDropdownClick = (e: React.MouseEvent, index: number, type: string) => {
        e.stopPropagation();
        const newIndex = `${type}-${index}`;
        setDropdownIndex(newIndex === dropdownIndex ? null : newIndex);
    };

    document.addEventListener('click', () => {
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
        <div className={`locker-container ${dragging ? 'dragging' : ''}`}>
            {dragging && <div className="drop-area">Drop Files Here</div>}
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
                {folders.filter(folder => folder.name.toLowerCase().includes(searchQuery)).length === 0 &&
                 files.filter(file => file.name.toLowerCase() !== 'dummy.txt' && file.name.toLowerCase().includes(searchQuery)).length === 0 ? (
                    <p className="no-files-message">There are no files or folders here.</p>
                ) : (
                    <>
                        {folders.filter(folder => folder.name.toLowerCase().includes(searchQuery)).map((folder, index) => (
                            <div key={index} className="folder-item" onClick={() => handleFolderClick(folder)}>
                                <FontAwesomeIcon icon={faFolder} className="icon folder-icon" />
                                <span>{folder.name}</span>
                                <FontAwesomeIcon
                                    icon={faEllipsisV}
                                    className="ellipsis"
                                    onClick={(e) => handleDropdownClick(e, index, 'folder')}
                                />
                                {dropdownIndex === `folder-${index}` && (
                                    <div className="dropdown">
                                        <ul>
                                            <li onClick={() => handleDeleteFolder(folder)}>Delete Folder</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                        {files.filter(file => file.name.toLowerCase() !== 'dummy.txt' && file.name.toLowerCase().includes(searchQuery)).map((file, index) => (
                            <div key={index} className="file-item" onClick={() => handleFileClick(file)}>
                                <FontAwesomeIcon icon={getFileIcon(file.name)} className={`icon ${getFileIconClass(file.name)}`} />
                                <span>{file.name}</span>
                                <FontAwesomeIcon
                                    icon={faEllipsisV}
                                    className="ellipsis"
                                    onClick={(e) => handleDropdownClick(e, index, 'file')}
                                />
                                {dropdownIndex === `file-${index}` && (
                                    <div className="dropdown">
                                        <ul>
                                            <li onClick={() => handleViewDetails(file)}>View Details</li>
                                            <li onClick={() => handleDelete(file)}>Delete</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>

            {showCreateFolderModal && (
                <div className="modal-overlay" onClick={() => setShowCreateFolderModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Create New Folder</h3>
                        <input
                            type="text"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder="Folder Name"
                        />
                        <button onClick={handleCreateFolder}>Create</button>
                        <button onClick={() => setShowCreateFolderModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {imageModal && (
                <div className="pic-modal-overlay" onClick={handleCloseModal}>
                    <div className="pic-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="pic-modal-close" onClick={handleCloseModal}>×</button>
                        <img src={imageModal} alt="Preview" className="pic-modal-img" />
                    </div>
                </div>
            )}

            {videoModal && (
                <div className="video-modal-overlay" onClick={handleCloseModal}>
                    <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="video-modal-close" onClick={handleCloseModal}>×</button>
                        <video controls className="video-modal-video">
                            <source src={videoModal} type="video/mp4" />
                            <source src={videoModal} type="video/webm" />
                            <source src={videoModal} type="video/ogg" />
                            <source src={videoModal} type="video/quicktime" />
                            Your browser does not support the video tag.
                        </video>
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
                        <button onClick={handleCloseModal}>Close</button>
                    </div>
                </div>
            )}

            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <div className="upload-text">
                        Uploading... {uploadProgress !== null && `${uploadProgress.toFixed(0)}%`}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Locker;
