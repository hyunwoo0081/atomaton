# 워크플로우 에디터 정보 구조도 (IA)

이 문서는 워크플로우 에디터의 화면 구성 요소와 정보의 위계 구조를 정의합니다.

## 1. 전체 구조 (High-Level Structure)

에디터는 크게 **헤더(Header)**, **사이드바(Sidebar)**, **캔버스(Canvas)**, **설정 패널(Config Panel)**, **모달(Modals)**로 구성됩니다.

```mermaid
graph TD
    Root[Workflow Editor Page]
    
    Root --> Header
    Root --> Sidebar[Left Sidebar (Toolbox)]
    Root --> Canvas[Main Canvas Area]
    Root --> ConfigPanel[Right Config Panel]
    Root --> Modals[Overlay Modals]
```

## 2. 상세 구조 (Detailed Structure)

### 2.1. 헤더 (Header)
- **Workflow Title**: 워크플로우 이름 (클릭 시 수정 가능)
- **Status Badge**: 현재 상태 (Active / Inactive / Draft)
- **Global Settings Button**: 워크플로우 전역 설정 (실패 알림 등) 진입점

### 2.2. 사이드바 (Left Sidebar - Toolbox)
- **Action Buttons**:
    - `Save`: 저장 버튼 (유효성 검사 통과 시 활성화)
    - `Run Test`: 테스트 실행 버튼
- **Node List (Draggable)**:
    - **Trigger**: IMAP Email, Incoming Webhook
    - **Logic**: Condition (If/Else)
    - **Action**: Discord Webhook, Notion Page

### 2.3. 캔버스 (Canvas)
- **Nodes**:
    - Header (Icon + Label + Status Icon)
    - Body (Summary Info)
    - Handles (Input/Output Points)
    - Controls (Delete Button)
- **Edges**:
    - Connection Lines
    - Labels (Yes/No for Condition)
- **Controls**:
    - Zoom In/Out, Fit View

### 2.4. 설정 패널 (Right Config Panel)
*노드 선택 시 활성화됨*

- **Header**: Title, Close Button
- **Content (Dynamic Form)**:
    - **IMAP Trigger**: Account Select, Mailbox Input, Interval Input, Filter Rules
    - **Webhook Trigger**: URL Display, API Key Display
    - **Condition**: Logic Type Select, Rules List
    - **Discord Action**: URL Input, Content Textarea (Variable Picker 포함)
    - **Notion Action**: Account Select, DB ID Input, JSON Editor
- **Footer**: Cancel Button, Apply Button

### 2.5. 전역 설정 패널 (Global Settings Panel)
*헤더의 설정 버튼 클릭 시 활성화됨*

- **Failure Notification**:
    - **Enable Failure Alert**: 실패 알림 사용 여부 (Toggle)
    - **Discord Webhook URL**: 알림을 받을 채널 주소

### 2.6. 모달 (Modals)
- **Node Selection Modal**: 캔버스 드롭 시 노드 타입 선택
- **Account Connection Modal**: 계정 추가 인라인 팝업
- **Test Run Modal**: Input JSON Editor, Run Button, Result Viewer
