import { useState, useRef } from 'react';
import './Home.css';

interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
}

const CloudIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM19 18H6C3.79 18 2 16.21 2 14C2 11.95 3.53 10.24 5.56 10.03L6.63 9.92L7.13 8.97C7.87 7.16 9.81 6 12 6C14.62 6 16.88 7.86 17.39 10.43L17.57 11.43L18.65 11.53C20.48 11.72 22 13.21 22 15C22 16.65 20.65 18 19 18Z" fill="#0070f3"/>
    <path d="M10.5 13H8L12 9L16 13H13.5V17H10.5V13Z" fill="#0070f3" />
  </svg>
);

function Home() {
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [lastUploadBatch, setLastUploadBatch] = useState<UploadedFile[]>([]);
  const [sessionUploads, setSessionUploads] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  let undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const allowedFiles: File[] = [];
    const blockedFiles: string[] = [];
    const blockedExtensions = ['.exe', '.bat', '.php'];

    files.forEach(file => {
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (blockedExtensions.includes(extension)) {
            blockedFiles.push(file.name);
        } else {
            allowedFiles.push(file);
        }
    });

    if (blockedFiles.length > 0) {
        setUploadStatus(`Blocked: ${blockedFiles.join(', ')}. These file types are not allowed.`);
        setTimeout(() => setUploadStatus(''), 6000);
        if (allowedFiles.length === 0) return;
    }

    const formData = new FormData();
    allowedFiles.forEach(file => formData.append('files', file));

    setUploadStatus(`Uploading ${allowedFiles.length} file(s)...`);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setLastUploadBatch([]);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadStatus(data.message || 'Upload successful!');
        setLastUploadBatch(data.files);
        setSessionUploads(prev => [...prev, ...data.files]);
        
        undoTimeoutRef.current = setTimeout(() => {
          setLastUploadBatch([]);
        }, 30000);

      } else {
        setUploadStatus(data.message || 'Upload failed. Please try again.');
      }
    } catch (error) {
      setUploadStatus('An error occurred during upload.');
      console.error('Upload error:', error);
    } finally {
      if (blockedFiles.length === 0) {
          setTimeout(() => setUploadStatus(''), 3000);
      }
    }
  };

  const handleUndo = async () => {
    if (lastUploadBatch.length === 0) return;
    
    const password = prompt("Please enter admin password to delete files:");
    if (!password) {
      alert("Password is required to delete files.");
      return;
    }

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    const uploadsToUndo = [...lastUploadBatch];
    setLastUploadBatch([]);

    let successfulDeletes = 0;
    const filenamesToUndo = uploadsToUndo.map(f => f.filename);

    for (const upload of uploadsToUndo) {
      try {
        const response = await fetch(`/api/admin/files/${upload.filename}`, {
          method: 'DELETE',
          headers: { 'X-Admin-Password': password },
        });
        if (response.ok) successfulDeletes++;
      } catch (error) {
        console.error(`Error deleting ${upload.originalName}:`, error);
      }
    }
    
    setSessionUploads(prev => prev.filter(f => !filenamesToUndo.includes(f.filename)));

    if (successfulDeletes > 0) alert(`${successfulDeletes} file(s) deleted successfully.`);
    if (successfulDeletes < uploadsToUndo.length) alert(`${uploadsToUndo.length - successfulDeletes} file(s) could not be deleted.`);
  };

  const handleCopyUrl = (url: string, originalName: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      alert(`Copied URL for ${originalName}: ${fullUrl}`);
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      alert('Failed to copy URL. Please try again or copy manually: ' + fullUrl);
    });
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleUpload(Array.from(files));
  };
  
  const handleZoneClick = () => { fileInputRef.current?.click(); };

  return (
    <div className="container">
      <header className="app-header">
        <CloudIcon />
        <h1>DropBox</h1>
      </header>

      <main>
        <div 
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onClick={handleZoneClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} multiple />
          <div className="drop-zone-icon">+</div>
          <p>Drag & drop files here, or click to select</p>
          {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
        </div>

        {lastUploadBatch.length > 0 && (
          <div className="undo-container">
            <p>Last upload: {lastUploadBatch.length} file(s).</p>
            <button onClick={handleUndo} className="undo-btn">Undo</button>
          </div>
        )}

        {sessionUploads.length > 0 && (
            <div className="file-list">
                <h3>Recently Uploaded</h3>
                {sessionUploads.map((file, index) => (
                    <div key={`${file.filename}-${index}`} className="file-item">
                        <span className="file-name">{file.originalName}</span>
                        <button 
                            onClick={() => handleCopyUrl(file.url, file.originalName)} 
                            className="copy-url-btn"
                        >
                            Copy URL
                        </button>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}

export default Home;