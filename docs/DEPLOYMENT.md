# Atomaton Deployment Guide

This guide provides instructions for deploying the Atomaton project (Frontend + Backend) to a production server.

## 1. Prerequisites

Ensure the following software is installed on your server (e.g., Ubuntu 20.04/22.04):

- **Node.js** (v18 or v20 LTS)
- **pnpm** (Package manager)
- **PostgreSQL** (Database)
- **PM2** (Process manager for Node.js)
- **Nginx** (Web server & Reverse proxy)
- **Git**

## 2. Environment Variables

Create `.env` files in the respective directories based on the examples below.

### 2.1. Database (`packages/db/.env`)
```env
# Connection string for Prisma
DATABASE_URL="postgresql://user:password@localhost:5432/atomaton?schema=public"

# Encryption key for sensitive data (e.g., IMAP passwords)
# Must be 32 bytes (characters) long for AES-256
MASTER_KEY="your-32-char-master-key-for-encryption"
```

### 2.2. Backend API (`apps/api/.env`)
```env
PORT=3000
JWT_SECRET="your-secure-jwt-secret"
JWT_EXPIRES_IN="1d"

# Database URL (Prisma client uses this)
DATABASE_URL="postgresql://user:password@localhost:5432/atomaton?schema=public"
MASTER_KEY="your-32-char-master-key-for-encryption"
```

### 2.3. Frontend Web (`apps/web/.env`)
In production, Vite builds static files, so environment variables are embedded at build time.
```env
# No specific runtime env vars needed for static build if using relative paths or Nginx proxy.
# If you need to hardcode the API URL:
# VITE_API_URL="https://api.yourdomain.com"
```

## 3. Installation & Build

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repo/atomaton.git
   cd atomaton
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Database Migration:**
   ```bash
   # Run migrations to set up the database schema
   pnpm --filter @atomaton/db prisma migrate deploy
   ```

4. **Build the project:**
   ```bash
   # Builds both API (TypeScript -> JavaScript) and Web (React -> Static HTML/JS/CSS)
   pnpm build
   ```

## 4. Running the Application (PM2)

Use PM2 to keep the backend server running.

1. **Start Backend:**
   ```bash
   cd apps/api
   pm2 start dist/index.js --name "atomaton-api"
   # Or using pnpm script if available
   # pm2 start "pnpm start" --name "atomaton-api"
   ```

2. **Save PM2 list:**
   ```bash
   pm2 save
   pm2 startup
   ```

## 5. Nginx Configuration

Configure Nginx to serve the frontend static files and proxy API requests to the backend.

1. **Create Nginx config:**
   ```bash
   sudo nano /etc/nginx/sites-available/atomaton
   ```

2. **Add the following configuration:**
   (Replace `yourdomain.com` and paths with your actual values)

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       # Frontend (Static Files)
       location / {
           root /path/to/atomaton/apps/web/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Backend API (Reverse Proxy)
       location /api/ {
           # Remove /api prefix when forwarding to backend if backend doesn't expect it
           # rewrite ^/api/(.*) /$1 break; 
           
           # Since our backend routes are like /auth, /workflows (without /api prefix in code),
           # but frontend calls /api/auth, we need to rewrite.
           rewrite ^/api/(.*) /$1 break;

           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/atomaton /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 6. Verification

- Access `http://yourdomain.com` to see the frontend.
- Try logging in to verify API connectivity.
- Check PM2 logs if issues arise: `pm2 logs atomaton-api`.
