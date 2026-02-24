# DropBox Clone - File Upload & Management System

A full-stack web application for uploading, managing, and sharing files. Built with a React (TypeScript) frontend and a Node.js (Express) backend.

## Features
- **File Upload:** Drag & drop or click to upload multiple files.
- **File Management:** Admin panel to view upload dates, download counts, and delete files.
- **Public Access:** Simple home page for uploading and viewing recently uploaded files.
- **Security:** Basic file extension filtering and password-protected admin actions.
- **Responsive Design:** Modern UI with interactive feedback.

---

## Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (optional)
- [Nginx](https://www.nginx.com/) (for production deployment)

---

## Deployment with Docker

The easiest way to run the project is using Docker Compose. This will spin up both the frontend and backend containers.

1. **Configure Environment:**
   Edit the `docker-compose.yml` file to change the default `ADMIN_PASSWORD`.

2. **Run Containers:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the App:**
   - Frontend: [http://localhost](http://localhost)
   - Admin Panel: [http://localhost/admin](http://localhost/admin)

---

## Deployment on Linux with Systemd

To run the application directly on a Linux server (Ubuntu/Debian) using `systemd` for process management:

### 1. Backend Setup
1. Navigate to the server directory: `cd server`
2. Install dependencies: `npm install`
3. Create a systemd service file: `/etc/systemd/system/dropbox-backend.service`
   ```ini
   [Unit]
   Description=DropBox Clone Backend
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/project/server
   Environment=NODE_ENV=production
   Environment=ADMIN_PASSWORD=your_secure_password
   ExecStart=/usr/bin/node index.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```
4. Start and enable the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start dropbox-backend
   sudo systemctl enable dropbox-backend
   ```

### 2. Frontend Setup
1. Navigate to the client directory: `cd client`
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. The built files will be in `client/dist`.

### 3. Nginx Configuration
Configure Nginx to serve the frontend and proxy requests to the backend.
Example `/etc/nginx/sites-available/project`:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    root /var/www/project/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /upload {
        proxy_pass http://localhost:5000/upload;
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
    }

    location /download/ {
        proxy_pass http://localhost:5000/download/;
        proxy_set_header Host $host;
    }
}
```

---

## Security Audit (Pentest Report)

### 1. High Risk: Hardcoded Secrets
- **Finding:** The `docker-compose.yml` contains a default `ADMIN_PASSWORD=admin123`.
- **Impact:** If deployed without modification, unauthorized users can easily gain admin access.
- **Recommendation:** Use a `.env` file (and add it to `.gitignore`) or use Docker Secrets.

### 2. Medium Risk: Insecure File Uploads (XSS)
- **Finding:** Only `.exe`, `.bat`, and `.php` files are blocked.
- **Impact:** Attackers can upload `.html`, `.svg` (with scripts), or `.js` files. If these are served statically, they can execute JavaScript in the context of your domain (Stored XSS).
- **Recommendation:** Implement a "whitelist" of allowed extensions (e.g., `.jpg`, `.pdf`, `.zip`) instead of a "blacklist".

### 3. Medium Risk: Plaintext Password Transmission
- **Finding:** The admin password is sent in the `X-Admin-Password` header without encryption.
- **Impact:** Passwords can be intercepted via "Man-in-the-Middle" (MitM) attacks if HTTPS is not used.
- **Recommendation:** **Mandatory:** Use SSL/TLS (HTTPS). Additionally, implement JWT (JSON Web Tokens) or session cookies instead of sending the raw password with every request.

### 4. Low Risk: Lack of Rate Limiting
- **Finding:** No limits on the number of files or frequency of uploads.
- **Impact:** A malicious actor could fill the server's disk space (Denial of Service).
- **Recommendation:** Use `express-rate-limit` and configure Multer with `limits: { fileSize: ... }`.

### 5. Low Risk: Information Disclosure
- **Finding:** Error messages in the backend reveal internal logic (e.g., Multer error types).
- **Impact:** Helps attackers understand the server's stack and configuration.
- **Recommendation:** Return generic error messages to the user and log detailed errors on the server.
