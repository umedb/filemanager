# Production Deployment for umed.tj

## 1. Prerequisites
- A Linux Server (Ubuntu 22.04 recommended)
- Docker and Docker Compose installed
- Domain `umed.tj` pointing to your server's IP

## 2. Setup Steps

1. **Clone project to server:**
   ```bash
   git clone <your-repo-url> /var/www/umed.tj
   cd /var/www/umed.tj
   ```

2. **Configure Environment:**
   Edit `deploy/.env` and set a strong `ADMIN_PASSWORD`.

3. **Deploy with Docker:**
   ```bash
   docker-compose -f deploy/docker-compose.prod.yml up -d
   ```

4. **SSL Setup (Very Important):**
   Install Certbot and get a certificate:
   ```bash
   sudo apt update
   sudo apt install certbot
   # Note: You'll need to stop Nginx briefly or use webroot
   sudo certbot certonly --standalone -d umed.tj -d www.umed.tj
   ```
   After getting certificates, the Nginx config in `deploy/nginx.prod.conf` is ready to be linked to the `/etc/letsencrypt/` directory.

## 3. Directory Structure on Server
- `/var/www/umed.tj/uploads` - Persistent storage for files
- `/var/www/umed.tj/client/dist` - Static frontend files
- `/var/www/umed.tj/server` - Node.js backend
