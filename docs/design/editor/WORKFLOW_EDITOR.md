# 워크플로우 에디터 설계 (Workflow Editor)

## 1. 개요
워크플로우의 트리거(Trigger)와 액션(Action)을 시각적으로 연결하고, 각 단계의 세부 설정을 편집하는 화면입니다. 사용자가 직관적으로 자동화 흐름을 구성하고 검증할 수 있어야 합니다.

## 2. 화면 구성

### 레이아웃
- **헤더 (Top Bar)**:
    -   Left: 워크플로우 이름 (클릭하여 수정 가능)
    -   Right:
        -   **저장 버튼 (`Button`)**: "Save" (모든 설정이 유효할 때만 활성화)
        -   **테스트 버튼 (`Button`)**: "Run Test" (모의 데이터로 실행)
-   **메인 영역 (Canvas)**:
    -   `React Flow`를 사용한 무한 캔버스
    -   노드(Node)와 엣지(Edge)로 플로우 표현
-   **설정 패널 (Config Panel - Sidebar)**:
    -   노드 클릭 시 우측에서 슬라이드 인 (Slide-in)
    -   선택된 노드의 타입에 따라 다른 폼 렌더링

### 주요 컴포넌트

#### 2.1. 노드 추가 모달 (Node Selection Modal)
-   **진입점**:
    -   빈 캔버스의 "Add Trigger" 버튼 클릭
    -   **드래그 앤 드롭**: 노드의 핸들(Handle)에서 선을 끌어 빈 공간에 놓았을 때 실행
-   **구성**:
    -   **탭/카테고리**: Trigger / Action / Logic
    -   **검색창**: "discord", "email", "if" 등으로 검색
    -   **리스트 아이템**: Trigger, Action, Logic 노드 목록

#### 2.2. 설정 패널 (`ConfigPanel`) 상세 명세

**A. Trigger: IMAP Email (Naver 등)**
-   **Account (`Select`)**:
    -   등록된 계정 목록 표시
    -   **"+ 새 계정 연결" 옵션**: 선택 시 **인라인 모달**이 떠서 에디터를 벗어나지 않고 계정 등록 가능
-   **Mailbox (`Input`)**: 감시할 메일함 (기본값: "INBOX")
-   **Polling Interval (`Input`)**: 확인 주기 (분 단위, 최소 1분, 기본 30분)
-   **Filter Rules (조건식)**:
    -   "Add Condition" 버튼
    -   `Field` (Subject, From, Body) + `Operator` (Contains, Equals) + `Value`

**B. Trigger: Incoming Webhook**
-   **Webhook URL (`ReadOnly Input`)**: 생성된 고유 URL 표시 (복사 버튼 포함)
-   **API Key (`ReadOnly Input`)**: 인증용 헤더 값 표시

**C. Logic: Condition (If/Else)**
-   **Logic Type (`Select`)**: AND / OR
-   **Conditions**: 조건 목록 설정
-   **캔버스 표현**:
    -   출력 핸들 2개: **True (Green)**, **False (Red)**
    -   연결된 엣지(Edge) 위에 "Yes", "No" 라벨 표시

**D. Action: Discord Webhook**
-   **Webhook URL (`Input`)**: 디스코드 채널 웹훅 주소
-   **Message Content (`Textarea`)**:
    -   **변수 피커 (Variable Helper)**:
        -   데이터 출처별 그룹핑 표시
        -   예: `[Trigger] Subject`, `[Trigger] Date`

**E. Action: Notion Page**
-   **Account (`Select`)**: 등록된 Notion 계정 선택 (+ 인라인 연결 지원)
-   **Database ID (`Input`)**
-   **Properties (`JSON Editor`)**

#### 2.3. 테스트 모달 (Test Run Modal)
-   "Run Test" 클릭 시 표시
-   **Input Data**: Trigger가 생성할 가상의 데이터(JSON) 표시 및 수정 가능
-   **Result**: 실행 결과 로그 및 성공/실패 여부 표시

## 3. 인터랙션 및 UX 흐름
1.  **노드 추가 (Drag & Drop)**: 노드의 핸들에서 선을 끌어 빈 공간에 놓음 -> 노드 선택 모달 -> 노드 생성 및 자동 연결
2.  **계정 연동 (Inline)**: 설정 패널에서 계정 없음 -> "+ 연결" 클릭 -> 모달에서 로그인 -> 모달 닫힘 -> 드롭다운에 자동 선택됨
3.  **분기 시각화**: Condition 노드 연결 시 선 위에 "Yes/No" 라벨 자동 표시
4.  **유효성 검사**: 필수값이 입력되면 노드의 경고 아이콘(⚠️)이 체크(✅)로 변경
5.  **저장**: 모든 노드가 ✅ 상태일 때 상단 "Save" 버튼 활성화
