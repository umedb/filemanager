import { useState, useRef } from 'react';
import './Home.css';

interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
}

const CloudIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM19 18H6C3.79 18 2 16.21 2 14C2 11.95 3.53 10.24 5.56 10.03L6.63 9.92L7.13 8.97C7.87 7.16 9.81 6 12 6C14.62 6 16.88 7.86 17.39 10.43L17.57 11.43L18.65 11.53C20.48 11.72 22 13.21 22 15C22 16.65 20.65 18 19 18Z" fill="currentColor"/>
  </svg>
);

function Home() {
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [sessionUploads, setSessionUploads] = useState<UploadedFile[]>([]);
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const isImage = (filename: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    setUploadStatus(`Uploading ${files.length} file(s)...`);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUploadStatus('Upload successful!');
        setSessionUploads(prev => [...data.files, ...prev]);
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadStatus(data.message || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('Error during upload');
    }
  };

  const toggleSelect = (filename: string) => {
    setSelectedFilenames(prev => 
      prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
    );
  };

  const deleteSelected = async () => {
    const password = prompt("Enter admin password to delete:");
    if (!password) return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/files/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ filenames: selectedFilenames }),
      });
      if (response.ok) {
        setSessionUploads(prev => prev.filter(f => !selectedFilenames.includes(f.filename)));
        setSelectedFilenames([]);
        alert('Deleted successfully');
      }
    } catch (error) {
      alert('Error deleting files');
    }
  };

  const copyUrl = (url: string) => {
    const fullUrl = `${window.location.origin.replace('5173', '5000')}${url}`;
    navigator.clipboard.writeText(fullUrl);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="container">
      <header className="app-header">
        <div style={{ color: 'var(--primary)' }}><CloudIcon /></div>
        <h1>DropBox</h1>
        <p style={{ color: 'var(--text-muted)' }}>Securely upload and share your files</p>
      </header>

      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(Array.from(e.dataTransfer.files)); }}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} multiple />
        <div className="drop-zone-icon">+</div>
        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>Drop files here or click to browse</p>
        {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
      </div>

      {sessionUploads.length > 0 && (
        <div className="file-list-container">
          <h3 style={{ margin: '3rem 0 1.5rem', fontSize: '1.5rem' }}>Recently Uploaded</h3>
          <div className="file-grid">
            {sessionUploads.map((file) => (
              <div 
                key={file.filename} 
                className={`file-card ${selectedFilenames.includes(file.filename) ? 'selected' : ''}`}
                onClick={() => toggleSelect(file.filename)}
              >
                <div className="checkbox-custom"></div>
                <div className="preview-container">
                  {isImage(file.filename) ? (
                    <img src={`http://localhost:5000/uploads/${file.filename}`} alt={file.originalName} className="preview-image" />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>📄</div>
                  )}
                </div>
                <div className="file-info">
                  <span className="file-name">{file.originalName}</span>
                </div>
                <div className="file-actions" onClick={e => e.stopPropagation()}>
                  {isImage(file.filename) && (
                    <button className="btn btn-primary" onClick={() => setPreviewFile(file)}>View</button>
                  )}
                  <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => copyUrl(file.url)}>Link</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Viewing */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewFile(null)}>&times;</button>
            <img 
              src={`http://localhost:5000/uploads/${previewFile.filename}`} 
              alt={previewFile.originalName} 
              className="modal-image" 
            />
            <div className="modal-info">
              {previewFile.originalName}
            </div>
          </div>
        </div>
      )}

      {selectedFilenames.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedFilenames.length} selected</span>
          <button className="btn btn-danger" onClick={deleteSelected}>Delete</button>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => setSelectedFilenames([])}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default Home;