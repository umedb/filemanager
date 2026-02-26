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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    alert('URL copied to clipboard!');
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    setUploadStatus(`Uploading...`);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUploadStatus('Upload successful!');
        setUploadedFiles(data.files || []);
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadStatus(data.message || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('Error during upload');
    }
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
        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))} style={{ display: 'none' }} multiple />
        <div className="drop-zone-icon">+</div>
        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>Drop files here or click to browse</p>
        {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="file-list-container">
          <h3 style={{ margin: '2rem 0 1rem', fontSize: '1.25rem' }}>Successfully Uploaded</h3>
          <div className="file-grid" style={{ gridTemplateColumns: '1fr' }}>
            {uploadedFiles.map((file) => (
              <div key={file.filename} className="file-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                  <div style={{ fontSize: '1.5rem' }}>📄</div>
                  <span className="file-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.originalName}
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => copyUrl(file.url)}
                  style={{ whiteSpace: 'nowrap', marginLeft: '1rem' }}
                >
                  Copy Link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default Home;