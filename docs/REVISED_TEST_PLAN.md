# 🧪 Atomaton Comprehensive Test Plan (Revised)

## 1. 개요
본 문서는 `atomaton` 프로젝트의 안정성과 신뢰성을 확보하기 위한 종합적인 테스트 전략을 정의합니다. 단순 E2E를 넘어, 핵심 엔진의 논리적 무결성을 검증하는 단위 테스트부터 전체 시스템 흐름을 검증하는 통합 테스트까지 포함합니다.

---

## 2. 테스트 레이어별 전략

### 2.1. Layer 1: Unit Tests (단위 테스트)
핵심 비즈니스 로직을 외부 의존성(DB, Network) 없이 독립적으로 검증합니다.
- **대상:**
  - `apps/api/src/executors/executor.ts`: 템플릿 치환 로직, 조건문(Condition) 판별 로직.
  - `packages/db/src/crypto.ts`: AES-256-GCM 암호화 및 복호화 무결성.
  - `apps/api/src/executors/queue.ts`: 큐 삽입 및 순차 처리 로직.
- **도구:** Jest 또는 Vitest

### 2.2. Layer 2: API Integration Tests (통합 테스트)
API 엔드포인트가 데이터베이스와 올바르게 상호작용하는지 검증합니다.
- **대상:**
  - `POST /auth/login`, `POST /auth/register`: 인증 흐름 및 JWT 발급.
  - `GET /workflows`, `POST /workflows`: 워크플로우 CRUD 및 DB 저장 상태.
  - `POST /webhook/:id`: 웹훅 수신 시 실행 큐에 정상적으로 삽입되는지 확인.
- **도구:** Supertest + Jest/Vitest

### 2.3. Layer 3: E2E Tests (엔드-투-엔드 테스트)
실제 브라우저 환경에서 사용자의 주요 유즈케이스를 검증합니다.
- **대상:**
  - 로그인 → 워크플로우 생성 → 노드 배치 → 저장 전체 과정.
  - 실제 웹훅 발생 시 대시보드 로그에 실시간으로 반영되는지 확인.
- **도구:** Playwright (이미 설정됨)

---

## 3. 외부 의존성 관리 (Mocking)

성공적인 테스트를 위해 외부 서비스 연동은 다음과 같이 처리합니다.

| 의존성 | 전략 | 방법 |
| :--- | :--- | :--- |
| **MySQL** | **Test DB / SQLite** | 테스트 실행 시 별도의 Docker 컨테이너 또는 SQLite 인메모리 사용 |
| **Discord/Notion** | **Mock API** | `msw` (Mock Service Worker) 또는 Jest Mock을 사용하여 실제 요청 차단 |
| **IMAP (Email)** | **Mailhog / Mailtrap** | 가상 SMTP/IMAP 서버를 띄워 실제 메일 수신 시뮬레이션 |

---

## 4. 상세 테스트 시나리오

### 4.1. 엔진 핵심 (Unit)
- **T1-1 (Template):** `{{name}}` 변수가 포함된 문자열이 컨텍스트 데이터로 정확히 치환되는가?
- **T1-2 (Condition):** `contains`, `equals` 연산자가 대소문자 및 데이터 타입에 관계없이 정확히 판별되는가?
- **T1-3 (Crypto):** 암호화된 비밀번호를 다시 복호화했을 때 원본과 100% 일치하는가?

### 4.2. 워크플로우 실행 (Integration)
- **T2-1 (Queueing):** 웹훅 호출 시 즉시 큐에 쌓이고 `isProcessing` 플래그가 정상 작동하는가?
- **T2-2 (Error Handling):** 액션 실행 실패 시 로그 테이블에 `FAILURE` 상태와 에러 메시지가 정확히 기록되는가?

---

## 5. 실행 및 자동화 계획

1. **테스트 환경 구축:**
   - `npm run test:unit`: 단위 테스트 실행
   - `npm run test:int`: 통합 테스트 실행
   - `npm run test:e2e`: E2E 테스트 실행
2. **CI/CD 통합:**
   - GitHub Pull Request 생성 시 모든 테스트 레이어 자동 실행.
   - 모든 테스트 통과 시에만 Merge 허용.

---

## 6. 향후 과제
- [ ] `msw`를 이용한 Discord/Notion API 모킹 환경 구축.
- [ ] 실행 큐의 재시도(Retry) 로직 구현 시 이에 대한 실패 사례 테스트 추가.
