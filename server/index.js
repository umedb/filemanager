const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Safe filename: timestamp + original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowed = !/\.(exe|bat|php)$/i.test(file.originalname);
        if (allowed) {
            cb(null, true);
        } else {
            cb(new Error('FileTypeNotAllowed'), false);
        }
    }
});

// Custom error handler for Multer
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).send({ message: `Multer error: ${err.message}` });
    } else if (err && err.message === 'FileTypeNotAllowed') {
        return res.status(400).send({ message: 'File type not allowed. Blocked file extensions are: .exe, .bat, .php' });
    } else if (err) {
        return res.status(500).send({ message: `Unknown upload error: ${err.message}` });
    }
    next();
};

const metadataFile = path.join(uploadDir, 'metadata.json');

// Helper to load and save metadata
const loadMetadata = () => {
    if (fs.existsSync(metadataFile)) {
        try {
            return JSON.parse(fs.readFileSync(metadataFile));
        } catch (e) {
            console.error('Failed to parse metadata', e);
            return {};
        }
    }
    return {};
};

const saveMetadata = (data) => {
    fs.writeFileSync(metadataFile, JSON.stringify(data, null, 2));
};

// Admin Authentication Middleware
const isAdmin = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password && password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).send({ message: 'Unauthorized: Invalid admin password' });
    }
};

// Routes
app.post('/upload', upload.array('files'), handleUploadErrors, (req, res) => {
    if (!req.files || req.files.length === 0) {
        // This case might be hit if all files were filtered out
        return res.status(400).send({ message: 'No valid files uploaded.' });
    }
    
    const metadata = loadMetadata();
    
    req.files.forEach(file => {
        metadata[file.filename] = {
            originalName: file.originalname,
            uploadDate: new Date().toISOString(),
            downloads: 0
        };
    });
    
    saveMetadata(metadata);
    
    res.send({
        message: `${req.files.length} files uploaded successfully`,
        files: req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            url: `/download/${file.filename}`
        }))
    });
});

// For development: Serve static files
app.use('/uploads', express.static(uploadDir));

// Download tracking
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        const metadata = loadMetadata();
        if (metadata[filename]) {
            metadata[filename].downloads += 1;
            saveMetadata(metadata);
        }
        res.download(filePath, metadata[filename]?.originalName || filename);
    } else {
        res.status(404).send({ message: 'File not found' });
    }
});

// This is the PUBLIC endpoint for the home page
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).send({ message: 'Unable to list files' });
        }
        
        const metadata = loadMetadata();
        
        const fileList = files
            .filter(file => file !== 'metadata.json')
            .map(file => ({
                originalName: metadata[file]?.originalName || file,
                url: `/download/${file}`
            }));
        res.send(fileList);
    });
});

// Admin Verify Route
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    if (password && password === process.env.ADMIN_PASSWORD) {
        res.send({ success: true });
    } else {
        res.status(401).send({ success: false, message: 'Invalid password' });
    }
});

// This is now the SECURE endpoint for the admin panel
app.get('/api/admin/files', isAdmin, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).send({ message: 'Unable to list files' });
        }
        
        const metadata = loadMetadata();
        
        const fileList = files
            .filter(file => file !== 'metadata.json')
            .map(file => ({
                name: file,
                originalName: metadata[file]?.originalName || file,
                uploadDate: metadata[file]?.uploadDate || 'Unknown',
                downloads: metadata[file]?.downloads || 0,
                url: `/download/${file}`
            }));
        res.send(fileList);
    });
});

// Admin Delete route
app.delete('/api/admin/files/:filename', isAdmin, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        const metadata = loadMetadata();
        delete metadata[filename];
        saveMetadata(metadata);
        res.send({ message: 'File deleted successfully' });
    } else {
        res.status(404).send({ message: 'File not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
