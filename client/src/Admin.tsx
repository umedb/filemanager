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
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/verify', {
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
      const response = await fetch('/api/admin/files', {
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

  const toggleSelect = (index: number, event: React.MouseEvent) => {
    const filename = uploadedFiles[index].name;
    let newSelected = [...selectedFilenames];

    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeFilenames = uploadedFiles.slice(start, end + 1).map(f => f.name);
      
      // If the clicked item was already selected, we might want to deselect the range
      // but usually, shift-click expands selection.
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
    const pass = sessionStorage.getItem('admin-password');
    if (!pass || !window.confirm(`Delete ${selectedFilenames.length} files?`)) return;
    try {
      const response = await fetch('/api/admin/files/delete-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': pass },
        body: JSON.stringify({ filenames: selectedFilenames }),
      });
      if (response.ok) {
        setUploadedFiles(prev => prev.filter(f => !selectedFilenames.includes(f.name)));
        setSelectedFilenames([]);
        setLastSelectedIndex(null);
        alert('Deleted successfully');
      }
    } catch (error) {
      alert('Error during deletion');
    }
  };

  const handleDownload = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {uploadedFiles.map((file, index) => (
          <div 
            key={file.name} 
            className={`file-card ${selectedFilenames.includes(file.name) ? 'selected' : ''}`}
            onClick={(e) => toggleSelect(index, e)}
          >
            <div className="checkbox-custom"></div>
            <div className="preview-container">
              {isImage(file.name) ? (
                <img src={`/uploads/${file.name}`} alt={file.originalName} className="preview-image" />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>📄</div>
              )}
            </div>
            <div className="file-info">
              <span className="file-name">{file.originalName}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(file.uploadDate).toLocaleDateString()} • {file.downloads} downloads
              </span>
            </div>
            <div className="file-actions" onClick={e => e.stopPropagation()}>
                {isImage(file.name) && (
                    <button className="btn btn-primary" onClick={() => setPreviewFile(file)}>View</button>
                )}
                <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => handleDownload(file)}>Save</button>
            </div>
          </div>
        ))}
      </div>

      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewFile(null)}>&times;</button>
            <img src={`/uploads/${previewFile.name}`} alt={previewFile.originalName} className="modal-image" />
            <div style={{color: 'white', marginTop: '1rem', textAlign: 'center'}}>{previewFile.originalName}</div>
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

export default Admin;