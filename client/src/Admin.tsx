import { useState, useEffect } from 'react';

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

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsLoggedIn(true);
        sessionStorage.setItem('admin-password', password); // Store for session
        setError('');
      } else {
        setError('Invalid password. Please try again.');
        setIsLoggedIn(false);
      }
    } catch (err) {
      setError('An error occurred during login.');
    }
  };

  const fetchFiles = async (currentPassword?: string) => {
    const pass = currentPassword || sessionStorage.getItem('admin-password');
    if (!pass) return;

    try {
      const response = await fetch('/api/admin/files', {
        headers: { 'X-Admin-Password': pass },
      });
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data);
      } else if (response.status === 401) {
        setError('Session expired or invalid. Please log in again.');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    const storedPassword = sessionStorage.getItem('admin-password');
    if (storedPassword) {
      setPassword(storedPassword);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchFiles(password);
    }
  }, [isLoggedIn]);

  const handleDelete = async (filename: string) => {
    const pass = sessionStorage.getItem('admin-password');
    if (!pass || !window.confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/files/${filename}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Password': pass },
      });

      if (response.ok) {
        alert('File deleted successfully');
        fetchFiles(pass);
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('An error occurred during deletion');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="Admin-login">
        <h1>Admin Login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
        />
        <button onClick={handleLogin}>Login</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="Admin">
      <h1>Admin Panel</h1>
      <div className="file-list">
        <h3>Managed Files</h3>
        {uploadedFiles.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Original Name</th>
                <th>Upload Date</th>
                <th>Downloads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploadedFiles.map((file, index) => (
                <tr key={index}>
                  <td>{file.originalName}</td>
                  <td>{new Date(file.uploadDate).toLocaleString()}</td>
                  <td>{file.downloads}</td>
                  <td>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">Download</a>
                    {' | '}
                    <button onClick={() => handleDelete(file.name)} style={{ color: 'red' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Admin;
