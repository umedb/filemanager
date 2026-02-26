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

// Logger Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

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

const handleUploadErrors = (err, req, res, next) => {
    if (err) {
        console.error('[Upload Error]', err.message);
    }
    if (err instanceof multer.MulterError) {
        return res.status(400).send({ message: `Multer error: ${err.message}` });
    } else if (err && err.message === 'FileTypeNotAllowed') {
        return res.status(400).send({ message: 'File type not allowed.' });
    } else if (err) {
        return res.status(500).send({ message: `Unknown error: ${err.message}` });
    }
    next();
};

const metadataFile = path.join(uploadDir, 'metadata.json');

const loadMetadata = () => {
    if (fs.existsSync(metadataFile)) {
        try {
            return JSON.parse(fs.readFileSync(metadataFile));
        } catch (e) {
            console.error('[Metadata Error] Failed to parse', e);
            return {};
        }
    }
    return {};
};

const saveMetadata = (data) => {
    try {
        fs.writeFileSync(metadataFile, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[Metadata Error] Failed to save', e);
    }
};

// Admin Authentication Middleware
const isAdmin = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    const expected = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (password && password === expected) {
        next();
    } else {
        console.warn(`[Auth Warning] Unauthorized attempt with password: ${password}`);
        res.status(401).send({ message: 'Unauthorized' });
    }
};

// Routes
app.post('/upload', upload.array('files'), handleUploadErrors, (req, res) => {
    console.log(`[Upload] Received ${req.files ? req.files.length : 0} files`);
    if (!req.files || req.files.length === 0) {
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

app.use('/uploads', express.static(uploadDir));

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Prevent Path Traversal on download
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
        const metadata = loadMetadata();
        if (metadata[safeFilename]) {
            metadata[safeFilename].downloads += 1;
            saveMetadata(metadata);
        }
        res.download(filePath, metadata[safeFilename]?.originalName || safeFilename);
    } else {
        res.status(404).send({ message: 'File not found' });
    }
});

app.get('/files', isAdmin, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).send({ message: 'Error reading directory' });
        const metadata = loadMetadata();
        const fileList = files
            .filter(file => file !== 'metadata.json')
            .map(file => ({
                filename: file,
                originalName: metadata[file]?.originalName || file,
                url: `/download/${file}`
            }));
        res.send(fileList);
    });
});

app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    const expected = process.env.ADMIN_PASSWORD || 'admin123';
    if (password && password === expected) {
        res.send({ success: true });
    } else {
        console.warn('[Auth Warning] Verify failed');
        res.status(401).send({ success: false, message: 'Invalid password' });
    }
});

app.get('/api/admin/files', isAdmin, (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).send({ message: 'Error reading directory' });
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

app.post('/api/admin/files/delete-bulk', isAdmin, (req, res) => {
    const { filenames } = req.body;
    console.log(`[Admin] Bulk Delete request for ${filenames ? filenames.length : 0} files`);
    if (!Array.isArray(filenames)) return res.status(400).send({ message: 'Invalid input' });

    const metadata = loadMetadata();
    const deleted = [];
    filenames.forEach(filename => {
        // Prevent Path Traversal by normalizing the filename
        const safeFilename = path.basename(filename);
        const filePath = path.join(uploadDir, safeFilename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            delete metadata[safeFilename];
            deleted.push(safeFilename);
        }
    });

    saveMetadata(metadata);
    res.send({ message: `Deleted ${deleted.length} files`, deleted });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin Password is: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
});
