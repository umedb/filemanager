import { useState, useRef, useEffect } from 'react';
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
  const [allFiles, setAllFiles] = useState<UploadedFile[]>([]);
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImage = (filename: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/files');
      if (response.ok) {
        setAllFiles(await response.json());
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

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
        fetchFiles(); // Refresh list after upload
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadStatus(data.message || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('Error during upload');
    }
  };

  const toggleSelect = (index: number, event: React.MouseEvent) => {
    const filename = allFiles[index].filename;
    let newSelected = [...selectedFilenames];

    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeFilenames = allFiles.slice(start, end + 1).map(f => f.filename);
      const uniqueRange = Array.from(new Set([...newSelected, ...rangeFilenames]));
      setSelectedFilenames(uniqueRange);
    } else {
      if (newSelected.includes(filename)) {
        newSelected = newSelected.filter(f => f !== filename);
      } else {
        newSelected.push(filename);
      }
      setSelectedFilenames(newSelected);
    }
    setLastSelectedIndex(index);
  };

  const deleteSelected = async () => {
    const password = prompt("Enter admin password to delete:");
    if (!password) return;
    try {
      const response = await fetch('/api/admin/files/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ filenames: selectedFilenames }),
      });
      if (response.ok) {
        setAllFiles(prev => prev.filter(f => !selectedFilenames.includes(f.filename)));
        setSelectedFilenames([]);
        setLastSelectedIndex(null);
        alert('Deleted successfully');
      }
    } catch (error) {
      alert('Error deleting files');
    }
  };

  const copyUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
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
        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))} style={{ display: 'none' }} multiple />
        <div className="drop-zone-icon">+</div>
        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>Drop files here or click to browse</p>
        {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
      </div>

      {allFiles.length > 0 && (
        <div className="file-list-container">
          <h3 style={{ margin: '3rem 0 1.5rem', fontSize: '1.5rem' }}>All Files</h3>
          <div className="file-grid">
            {allFiles.map((file, index) => (
              <div 
                key={file.filename} 
                className={`file-card ${selectedFilenames.includes(file.filename) ? 'selected' : ''}`}
                onClick={(e) => toggleSelect(index, e)}
              >
                <div className="checkbox-custom"></div>
                <div className="preview-container">
                  {isImage(file.filename) ? (
                    <img src={`/uploads/${file.filename}`} alt={file.originalName} className="preview-image" />
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

      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewFile(null)}>&times;</button>
            <img src={`/uploads/${previewFile.filename}`} alt={previewFile.originalName} className="modal-image" />
          </div>
        </div>
      )}

      {selectedFilenames.length > 0 && (
        <div className="bulk-actions">
          <span style={{color: 'white', fontWeight: 500}}>{selectedFilenames.length} selected</span>
          <button className="btn btn-danger" onClick={deleteSelected}>Delete</button>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => {setSelectedFilenames([]); setLastSelectedIndex(null);}}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default Home;