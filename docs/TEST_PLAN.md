# Atomaton E2E Test Plan

## 1. 개요
본 문서는 Atomaton 프로젝트의 End-to-End(E2E) 테스트 계획을 정의합니다. 사용자가 웹 인터페이스를 통해 워크플로우를 생성하고, 실제 백엔드 로직이 트리거되어 액션이 수행되는 전체 과정을 검증하는 것을 목표로 합니다.

## 2. 테스트 환경
- **Framework**: Playwright
- **Frontend**: Vite Dev Server (http://localhost:5173)
- **Backend**: Express API Server (http://localhost:3000)
- **Database**: Test Database (별도 테스트용 DB 인스턴스 또는 초기화 스크립트 사용 권장)

## 3. 테스트 시나리오

### 3.1. 사용자 인증 (Authentication)
- **TC-AUTH-01: 회원가입 및 로그인**
    1. 회원가입 페이지로 이동한다.
    2. 유효한 이메일과 비밀번호를 입력하고 가입한다.
    3. 로그인 페이지로 리다이렉트된다.
    4. 가입한 정보로 로그인한다.
    5. 대시보드로 이동함을 확인한다.

- **TC-AUTH-02: 로그인 실패**
    1. 로그인 페이지로 이동한다.
    2. 등록되지 않은 이메일이나 틀린 비밀번호를 입력한다.
    3. 에러 메시지가 표시됨을 확인한다.

### 3.2. 워크플로우 관리 (Workflow Management)
- **TC-WF-01: 워크플로우 생성**
    1. 대시보드에서 "New Workflow" 버튼을 클릭한다.
    2. 워크플로우 이름을 입력하고 생성한다.
    3. 워크플로우 에디터 페이지로 이동함을 확인한다.

- **TC-WF-02: 트리거 및 액션 설정**
    1. 워크플로우 에디터에서 Trigger 노드를 클릭한다.
    2. 설정 패널에서 IMAP 계정 정보를 입력하고 저장한다.
    3. Action 노드를 추가하고 Discord Webhook 설정을 입력한다.
    4. "Save" 버튼을 클릭하여 워크플로우를 저장한다.

### 3.3. 워크플로우 실행 (Execution) - *Integration Test 성격*
*참고: 실제 이메일 수신을 E2E로 테스트하기 어렵다면, Webhook Trigger를 사용하여 테스트하거나 백엔드 테스트 스크립트로 대체할 수 있음.*

- **TC-EXEC-01: Webhook 트리거 실행**
    1. Webhook Trigger가 설정된 워크플로우를 준비한다.
    2. 외부 도구(curl 등)나 테스트 스크립트로 해당 Webhook URL에 POST 요청을 보낸다.
    3. 대시보드의 로그 테이블에 "SUCCESS" 로그가 생성됨을 확인한다.

### 3.4. 개발자 대시보드 (Developer Dashboard)
- **TC-DEV-01: 개발자 권한 확인**
    1. `is_developer`가 true인 계정으로 로그인한다.
    2. `/developer` 경로로 접근한다.
    3. 시스템 통계가 표시됨을 확인한다.

- **TC-DEV-02: 일반 사용자 접근 제한**
    1. 일반 사용자 계정으로 로그인한다.
    2. `/developer` 경로로 접근 시도한다.
    3. 메인 대시보드(`/`)로 리다이렉트됨을 확인한다.

## 4. 테스트 데이터 관리
- 테스트 실행 전, 데이터베이스를 초기화하거나 테스트용 계정을 생성하는 `globalSetup` 스크립트가 필요하다.
- 테스트 실행 후, 생성된 데이터를 정리하는 `globalTeardown` 스크립트를 권장한다.

## 5. 실행 계획
1. `playwright` 설치 및 설정
2. 주요 시나리오(TC-AUTH-01, TC-WF-01)부터 스크립트 작성
3. CI/CD 파이프라인(Github Actions)에 통합
