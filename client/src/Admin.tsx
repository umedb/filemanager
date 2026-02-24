import { useState, useEffect } from 'react';
import './Home.css';

interface UploadedFile {
  name: string;
  originalName: string;
  uploadDate: string;
  downloads: number;
  url: string;
}

function Admin() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setIsLoggedIn(true);
        sessionStorage.setItem('admin-password', password);
        setError('');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const fetchFiles = async () => {
    const pass = sessionStorage.getItem('admin-password');
    if (!pass) return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/files', {
        headers: { 'X-Admin-Password': pass },
      });
      if (response.ok) {
        setUploadedFiles(await response.json());
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('admin-password');
    if (stored) { setPassword(stored); setIsLoggedIn(true); }
  }, []);

  useEffect(() => { if (isLoggedIn) fetchFiles(); }, [isLoggedIn]);

  const isImage = (filename: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

  const toggleSelect = (filename: string) => {
    setSelectedFilenames(prev => 
      prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
    );
  };

  const deleteSelected = async () => {
    const pass = sessionStorage.getItem('admin-password');
    if (!pass || !window.confirm(`Delete ${selectedFilenames.length} files?`)) return;
    try {
      const response = await fetch('http://localhost:5000/api/admin/files/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': pass },
        body: JSON.stringify({ filenames: selectedFilenames }),
      });
      if (response.ok) {
        setUploadedFiles(prev => prev.filter(f => !selectedFilenames.includes(f.name)));
        setSelectedFilenames([]);
        alert('Deleted successfully');
      }
    } catch (error) {
      alert('Error during deletion');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
        <div className="drop-zone" style={{ cursor: 'default' }}>
          <h2>Admin Login</h2>
          <input
            type="password"
            className="btn"
            style={{ width: '100%', marginBottom: '1rem', background: '#334155', color: 'white' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          <button onClick={handleLogin} className="btn btn-primary" style={{ width: '100%' }}>Login</button>
          {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <h1>Admin Panel</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage all uploaded files ({uploadedFiles.length})</p>
      </header>

      <div className="file-grid">
        {uploadedFiles.map((file) => (
          <div 
            key={file.name} 
            className={`file-card ${selectedFilenames.includes(file.name) ? 'selected' : ''}`}
            onClick={() => toggleSelect(file.name)}
          >
            <div className="checkbox-custom"></div>
            <div className="preview-container">
              {isImage(file.name) ? (
                <img src={`http://localhost:5000/uploads/${file.name}`} alt={file.originalName} className="preview-image" />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>📄</div>
              )}
            </div>
            <div className="file-info">
              <span className="file-name">{file.originalName}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(file.uploadDate).toLocaleDateString()} • {file.downloads} views/downloads
              </span>
            </div>
            <div className="file-actions" onClick={e => e.stopPropagation()}>
                {isImage(file.name) && (
                    <button className="btn btn-primary" onClick={() => setPreviewFile(file)}>View</button>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Viewing */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewFile(null)}>&times;</button>
            <img 
              src={`http://localhost:5000/uploads/${previewFile.name}`} 
              alt={previewFile.originalName} 
              className="modal-image" 
            />
            <div className="modal-info">
              {previewFile.originalName} • {previewFile.downloads} views
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

export default Admin;