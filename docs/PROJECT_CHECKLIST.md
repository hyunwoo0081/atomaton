# Atomaton 개발 체크리스트

이 문서는 'Atomaton' 프로젝트의 전체 개발 과정을 단계별로 정리한 체크리스트입니다. 모든 코드는 **TypeScript** 기반으로 작성됩니다.

---

### **Phase 1: TypeScript 기반 프로젝트 설정 (Monorepo)**

- [x] `apps`, `packages` 디렉터리 구조 생성
- [x] `pnpm-workspace.yaml` 파일을 통한 워크스페이스 설정
- [x] **`package.json` 파일 생성 (프로젝트명: `atomaton`)**
    - [x] 루트 `package.json` 수정
    - [x] `apps/api`, `apps/web` 패키지 생성
    - [x] `packages/ui`, `packages/config`, `packages/db` 패키지 생성
- [x] `pnpm install`을 실행하여 전체 의존성 설치 및 워크스페이스 연결
- [x] **TypeScript 설정 (`packages/config`)**
    - [x] 공유 `tsconfig.json` 설정 파일 생성
    - [x] 각 프로젝트(`api`, `web` 등)에 맞는 `tsconfig.json` 확장 설정
- [x] **코드 스타일 설정 (`packages/config`)**
    - [x] 공유 `eslint`, `prettier` 설정 파일 생성 및 적용
- [x] `.gitignore` 파일 생성

---

### **Phase 2: 백엔드(API) 개발 (TypeScript)**

#### **2.1. 데이터베이스 및 핵심 로직 (`packages/db`)**
- [x] **데이터베이스 스키마 설계 (`Prisma`)**
    - [x] User: `is_developer` (Boolean) 필드 포함
    - [x] Account, Trigger, Rule, Action, Log 등 스키마 정의
- [x] `Prisma` 마이그레이션 파일 생성 및 실행
- [x] 데이터베이스 연결 및 타입 세이프한 기본 쿼리(CRUD) 로직 구현
- [x] IMAP 비밀번호 등 민감 정보 암호화를 위한 `AES-256-GCM` 서비스 구현

#### **2.2. API 서버 (`apps/api`)**
- [x] `Express.js` + `TypeScript` 기본 서버 설정
- [x] 사용자 인증 API 구현 (일반/개발자 계정 분리 로직 포함)
- [x] **워크플로우 관리 API (CRUD)**
    - [x] Trigger, Rule, Action 관리 API

#### **2.3. 트리거(Trigger) 구현**
- [x] **IMAP Polling 서비스**
    - [x] `setInterval` 기반 Polling 로직 (기본 30분, 최소 1분)
    - [x] 메일 `UID` 기반 신규 메일 확인 및 `Message-ID` 기반 중복 처리
- [x] **Webhook Trigger 엔드포인트**
    - [x] Webhook별 고유 API 키 생성 및 관리 로직
    - [x] `POST /webhook/{hashed_project_id}/{triggerId}` 형태의 엔드포인트 구현

#### **2.4. 실행 엔진(Worker) 구현**
- [x] 워크플로우 내의 데이터 흐름을 관리할 `Context` 객체 설계
- [x] 메모리 내(In-process) 큐(Queue) 구현
- [x] 큐에 들어온 작업을 순차적으로(Single-thread) 처리하는 실행 로직 구현
- [x] **Action 실행 및 안정성 정책**
    - [x] HTTP 5xx 오류 발생 시, 지수 백오프(Exponential Backoff) 재시도 로직 구현
    - [x] Discord 웹훅 Rate Limit 준수를 위한 실행 간격 조절 로직 구현

#### **2.5. 액션(Action) 구현**
- [x] **Discord Webhook 액션**
    - [x] 이전 단계(Trigger, Actions)의 데이터를 변수(`{{subject}}` 등)로 사용 가능한 템플릿 메시지 기능 구현
- [x] **Notion 액션 (MVP)**
    - [x] 데이터베이스에 행(Row) 추가 기능 구현
    - [x] 데이터베이스 아이템 업데이트 기능 구현
    - [x] 관련 API 개발 (DB ID 저장, 필드 매핑 정보 저장)

#### **2.6. 로깅 및 모니터링**
- [ ] **사용자 계정별** 로그 기록 및 보존 정책(최근 1,000건, 3일) 구현
    - *(추후 보존 기간을 설정할 수 있도록 확장성 있게 설계)*
- [ ] 프론트엔드에 최신 로그를 제공하기 위한 API 엔드포인트 구현

---

### **Phase 3: 프론트엔드(Web) 개발 (TypeScript + Vite)**

#### **3.1. 프로젝트 설정 (`apps/web`)**
- [ ] `Vite`를 사용해 `React` + `TypeScript` 프로젝트 초기 설정
- [ ] `react-router-dom`을 사용한 페이지 라우팅 설정
- [ ] `axios` 등 타입 세이프한 API 통신 클라이언트 설정

#### **3.2. 공용 UI 컴포넌트 (`packages/ui`)**
- [ ] 버튼, 입력창, 카드 등 `React` + `TypeScript` 기반 공용 UI 컴포넌트 개발

#### **3.3. 사용자 화면**
- [ ] 로그인 페이지 구현
- [ ] 대시보드 메인 페이지 구현
- [ ] **워크플로우 시각화 UI (`React Flow` 사용)**
    - [ ] 노드 기반의 워크플로우 뷰어 구현
- [ ] **워크플로우 설정 UI**
    - [ ] Discord Action: 메시지 템플릿 입력 UI
    - [ ] Notion Action: Database ID 입력 및 필드 매핑 UI
        - *(간단한 스크립트 매핑 기능은 추후 고려)*
- [ ] 최신 실행 로그 뷰어 구현

#### **3.4. 개발자 전용 화면**
- [ ] **성능 모니터링 대시보드**
    - [ ] 워크플로우별 실행 시간, 리소스 사용량, 실행 빈도 등 성능 지표 시각화
    - [ ] 비효율적인 워크플로우(예: 실행은 오래 걸리는데 Polling 주기가 짧음) 식별을 위한 분석 기능

---

### **Phase 4: 통합 및 배포**
- [ ] E2E 테스트 (이메일 수신 → Notion 페이지 생성)
- [ ] `apps/api`, `apps/web` 프로덕션 빌드 스크립트 작성
- [ ] 배포 가이드 작성 (`PM2`, `Nginx` 등)
- [ ] 서버 환경변수 설정 가이드 작성 (`MASTER_KEY`, `DB_URL` 등)