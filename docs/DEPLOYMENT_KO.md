# Atomaton 배포 가이드

이 가이드는 Atomaton 프로젝트(프론트엔드 + 백엔드)를 운영 서버에 배포하는 방법을 설명합니다.

## 1. 사전 요구 사항 (Prerequisites)

서버(예: Ubuntu 20.04/22.04)에 다음 소프트웨어가 설치되어 있어야 합니다:

- **Node.js** (v18 또는 v20 LTS)
- **pnpm** (패키지 매니저)
- **PostgreSQL** (데이터베이스)
- **PM2** (Node.js 프로세스 관리자)
- **Nginx** (웹 서버 및 리버스 프록시)
- **Git**

## 2. 환경 변수 설정 (Environment Variables)

각 디렉터리에 `.env` 파일을 생성하고 아래 예시를 참고하여 설정하세요.

### 2.1. 데이터베이스 (`packages/db/.env`)
```env
# Prisma 연결 문자열
DATABASE_URL="postgresql://user:password@localhost:5432/atomaton?schema=public"

# 민감 정보(예: IMAP 비밀번호) 암호화를 위한 키
# AES-256을 위해 반드시 32바이트(32글자)여야 합니다.
MASTER_KEY="your-32-char-master-key-for-encryption"
```

### 2.2. 백엔드 API (`apps/api/.env`)
```env
PORT=3000
JWT_SECRET="your-secure-jwt-secret"
JWT_EXPIRES_IN="1d"

# 데이터베이스 URL (Prisma 클라이언트가 사용)
DATABASE_URL="postgresql://user:password@localhost:5432/atomaton?schema=public"
MASTER_KEY="your-32-char-master-key-for-encryption"
```

### 2.3. 프론트엔드 웹 (`apps/web/.env`)
프로덕션 환경에서 Vite는 정적 파일로 빌드되므로, 환경 변수는 빌드 시점에 주입됩니다.
```env
# 상대 경로 또는 Nginx 프록시를 사용하는 경우 별도의 런타임 환경 변수가 필요하지 않습니다.
# 만약 API URL을 하드코딩해야 한다면 아래와 같이 설정하세요:
# VITE_API_URL="https://api.yourdomain.com"
```

## 3. 설치 및 빌드 (Installation & Build)

1. **저장소 클론:**
   ```bash
   git clone https://github.com/your-repo/atomaton.git
   cd atomaton
   ```

2. **의존성 설치:**
   ```bash
   pnpm install
   ```

3. **데이터베이스 마이그레이션:**
   ```bash
   # 데이터베이스 스키마 설정을 위해 마이그레이션 실행
   pnpm --filter @atomaton/db prisma migrate deploy
   ```

4. **프로젝트 빌드:**
   ```bash
   # API(TypeScript -> JavaScript)와 Web(React -> Static HTML/JS/CSS) 모두 빌드
   pnpm build
   ```

## 4. 애플리케이션 실행 (PM2)

PM2를 사용하여 백엔드 서버를 백그라운드에서 실행하고 관리합니다.

1. **백엔드 시작:**
   ```bash
   cd apps/api
   pm2 start dist/index.js --name "atomaton-api"
   # 또는 pnpm 스크립트를 사용할 수 있다면:
   # pm2 start "pnpm start" --name "atomaton-api"
   ```

2. **PM2 리스트 저장 (재부팅 시 자동 실행):**
   ```bash
   pm2 save
   pm2 startup
   ```

## 5. Nginx 설정 (Nginx Configuration)

Nginx를 설정하여 프론트엔드 정적 파일을 제공하고, API 요청을 백엔드로 프록시합니다.

1. **Nginx 설정 파일 생성:**
   ```bash
   sudo nano /etc/nginx/sites-available/atomaton
   ```

2. **아래 설정을 추가합니다:**
   (`yourdomain.com`과 경로를 실제 값으로 변경하세요)

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       # 프론트엔드 (정적 파일)
       location / {
           root /path/to/atomaton/apps/web/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # 백엔드 API (리버스 프록시)
       location /api/ {
           # 백엔드 코드에서 /api 접두사를 기대하지 않는 경우 제거
           # rewrite ^/api/(.*) /$1 break; 
           
           # 현재 백엔드 라우트는 /auth, /workflows 등으로 정의되어 있으므로(코드상 /api 없음),
           # 프론트엔드에서 /api/auth로 요청하면 /auth로 전달되도록 rewrite가 필요합니다.
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

3. **사이트 활성화:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/atomaton /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 6. 확인 (Verification)

- `http://yourdomain.com`에 접속하여 프론트엔드가 잘 보이는지 확인합니다.
- 로그인을 시도하여 API 연결이 정상적인지 확인합니다.
- 문제가 발생하면 PM2 로그를 확인하세요: `pm2 logs atomaton-api`.
