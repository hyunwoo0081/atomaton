# Atomaton 개발 진행 상황 요약 (2026-01-07)

## 완료된 사항

### Phase 1: TypeScript 기반 프로젝트 설정 (Monorepo)
- pnpm 워크스페이스를 사용한 모노레포 구조 설정 완료
- `apps`(api, web) 및 `packages`(ui, config, db) 디렉터리 및 `package.json` 구성 완료
- 공유 TypeScript (`tsconfig.json`) 및 코드 스타일(ESLint, Prettier) 설정 완료
- `.gitignore` 파일 생성 및 기본 설정 완료

### Phase 2: 백엔드(API) 개발 (TypeScript)

#### 2.1. 데이터베이스 및 핵심 로직 (`packages/db`)
- Prisma를 사용한 데이터베이스 스키마(User, Account, Workflow, Trigger, Rule, Action, Log) 설계 및 마이그레이션 완료
- Prisma Client를 통한 타입-세이프한 데이터베이스 접근 로직 구현
- IMAP 계정 정보 등 민감 정보 암호화를 위한 `AES-256-GCM` 암호화/복호화 서비스 구현

#### 2.2. API 서버 (`apps/api`)
- Express.js 기반의 TypeScript 서버 기본 설정 완료
- `bcrypt`와 `jsonwebtoken`을 사용한 사용자 회원가입 및 로그인 API 구현
- JWT 토큰 기반의 인증 미들웨어 구현
- 워크플로우, 계정(IMAP 등) 관리를 위한 CRUD API 엔드포인트 구현

#### 2.3. 트리거(Trigger) 구현
- **IMAP Polling 서비스**:
  - `node-imap`을 사용하여 특정 이메일 계정의 받은 편지함을 주기적으로 확인하는 폴링 서비스 구현
  - `Message-ID`를 데이터베이스에 기록하여 이메일 중복 처리 방지 로직 구현
  - 연결 실패 시 지수 백오프(Exponential Backoff)를 사용한 재시도 로직 구현
- **Webhook Trigger 엔드포인트**:
  - 외부 서비스에서 데이터를 수신할 수 있는 `POST /webhook/{...}` 엔드포인트 구현
  - `Authorization: Bearer {API_KEY}` 헤더를 사용한 API 키 인증 로직 구현

#### 2.4. 실행 엔진(Worker) 구현
- 워크플로우 실행을 위한 `Context` 객체 설계
- 메모리 내에서 작업을 순차적으로 처리하는 In-process 큐(Queue) 구현
- 큐에 들어온 작업을 워크플로우 정의에 따라 실행하는 Executor 로직 구현
- IMAP 및 Webhook 트리거가 발생했을 때 작업을 큐에 추가하는 로직 연동 완료

#### 2.5. 액션(Action) 구현
- **Discord Webhook 액션**:
  - `axios`를 사용하여 Discord 웹훅 URL로 메시지를 전송하는 기능 구현
  - `{{variable}}` 형식의 템플릿을 사용하여 트리거 데이터를 메시지 내용에 동적으로 포함하는 기능 구현
  - HTTP 5xx 오류 발생 시 지수 백오프 재시도 로직 및 Discord Rate Limit(429) 응답 처리 로직 구현
- **Notion 액션 (MVP)**:
  - `@notionhq/client`를 사용하여 Notion 데이터베이스에 페이지(행)를 추가하는 기능 구현
  - 템플릿을 사용하여 동적 데이터로 Notion 페이지 속성을 채우는 기능 구현
  - Notion API 오류 발생 시 재시도 로직 구현

## 다음 진행 예정
- **Phase 2.6: 로깅 및 모니터링**
- **Phase 3: 프론트엔드(Web) 개발**
