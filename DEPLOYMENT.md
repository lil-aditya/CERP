# 🚀 CERP Deployment Guide

This guide covers multiple deployment options for the Campus Engagement & Research Portal (CERP).

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Platform Deployments](#platform-deployments)
   - [Railway (Recommended)](#railway-recommended)
   - [Render](#render)
   - [DigitalOcean App Platform](#digitalocean-app-platform)
   - [Heroku](#heroku)
   - [AWS/GCP/Azure VPS](#vps-deployment)
4. [Environment Variables](#environment-variables)
5. [Database Considerations](#database-considerations)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker & Docker Compose (for containerized deployment)
- Git

---

## Quick Start (Docker)

### 1. Clone and Configure

```bash
git clone https://github.com/yourusername/cerp.git
cd cerp

# Copy environment file
cp .env.example .env
# Edit .env with your values
```

### 2. Build and Run

```bash
# Development
docker-compose up --build

# Production (with nginx reverse proxy)
docker-compose --profile production up --build -d
```

### 3. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- With Nginx: http://localhost (port 80)

---

## Platform Deployments

### Railway (Recommended) ⭐

Railway offers the easiest deployment with automatic builds.

#### Backend Deployment:

1. Go to [railway.app](https://railway.app) and create account
2. Click "New Project" → "Deploy from GitHub repo"
3. Select the CERP repository
4. Set root directory to `backend`
5. Add environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secure-secret
   JWT_EXPIRES_IN=7d
   SUPERADMIN_EMAIL=admin@yourdomain.com
   SUPERADMIN_PASSWORD=YourSecurePassword
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://your-backend-url.railway.app/api/gmail/callback
   ```
6. Deploy!

#### Frontend Deployment:

1. Create another service in same project
2. Set root directory to `frontend`
3. Add build command: `npm run build`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
5. Deploy!

---

### Render

#### Backend:

1. Go to [render.com](https://render.com)
2. New → Web Service → Connect GitHub
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Add environment variables (same as Railway)

#### Frontend:

1. New → Static Site
2. Settings:
   - **Root Directory:** `frontend`  
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Add environment variable: `VITE_API_URL`

---

### DigitalOcean App Platform

1. Create App → GitHub → Select repo
2. Configure components:

**Backend Component:**
```yaml
name: cerp-backend
source_dir: /backend
run_command: npm start
environment_slug: node-js
instance_count: 1
instance_size_slug: basic-xxs
```

**Frontend Component:**
```yaml
name: cerp-frontend
source_dir: /frontend
build_command: npm run build
output_dir: dist
environment_slug: node-js
```

---

### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create cerp-app

# Set buildpacks
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... add all other env vars

# Deploy
git push heroku main
```

---

### VPS Deployment (AWS/GCP/Azure/DigitalOcean Droplet)

For full control, deploy to a VPS:

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Clone and Setup

```bash
# Clone repo
cd /var/www
sudo git clone https://github.com/yourusername/cerp.git
cd cerp

# Setup backend
cd backend
cp .env.example .env
nano .env  # Edit with your values
npm install

# Setup frontend
cd ../frontend
npm install
VITE_API_URL=https://yourdomain.com npm run build
```

#### 3. PM2 Configuration

```bash
# Start backend with PM2
cd /var/www/cerp/backend
pm2 start src/server.js --name cerp-backend
pm2 save
pm2 startup
```

#### 4. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/cerp
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /var/www/cerp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cerp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `production` or `development` | Yes |
| `PORT` | Backend port (default: 5000) | No |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | Yes |
| `JWT_EXPIRES_IN` | Token expiration (e.g., `7d`) | No |
| `SUPERADMIN_EMAIL` | Initial admin email | Yes |
| `SUPERADMIN_PASSWORD` | Initial admin password | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Gmail |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For Gmail |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | For Gmail |
| `VITE_API_URL` | Backend URL (frontend build) | Yes |
| `FRONTEND_URL` | Frontend URL (for CORS) | Yes |

---

## Database Considerations

CERP uses **SQLite** by default, which is perfect for:
- Small to medium deployments (< 10,000 users)
- Single-instance deployments
- Quick setup with no external dependencies

### For Production Scale:

If you need horizontal scaling, consider migrating to **PostgreSQL**:

1. Install `pg` package: `npm install pg`
2. Update `backend/src/db/pool.js` to use PostgreSQL
3. Use a managed database (Railway PostgreSQL, Supabase, etc.)

---

## SSL/HTTPS Setup

### Using Certbot (VPS):
```bash
sudo certbot --nginx -d yourdomain.com
sudo certbot renew --dry-run  # Test auto-renewal
```

### Using Cloudflare (Any deployment):
1. Add your domain to Cloudflare
2. Enable "Full (Strict)" SSL mode
3. Point DNS to your server

---

## Monitoring & Maintenance

### Health Checks

- Backend: `GET /api/health`
- Response: `{ "status": "ok", "timestamp": "..." }`

### PM2 Monitoring (VPS):

```bash
pm2 monit           # Real-time monitoring
pm2 logs cerp-backend  # View logs
pm2 reload cerp-backend  # Zero-downtime reload
```

### Docker Logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Automated Backups:

```bash
# Add to crontab
0 2 * * * cp /var/www/cerp/backend/cerp.db /backups/cerp-$(date +\%Y\%m\%d).db
```

---

## 🎉 You're Ready!

After deployment:

1. Visit your frontend URL
2. Login with `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`
3. Configure Gmail integration in Preferences
4. Trigger initial research scrape from Admin Panel

Need help? Open an issue on GitHub!
