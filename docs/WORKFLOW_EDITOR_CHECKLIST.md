# 워크플로우 에디터 구현 체크리스트

이 문서는 `docs/design/WORKFLOW_EDITOR.md` 설계를 바탕으로 워크플로우 에디터를 구현하기 위한 상세 작업 목록입니다.

## Step 1: 상태 관리 및 기본 구조 (State Management)
- [x] **Zustand 스토어 생성 (`apps/web/src/store/workflowStore.ts`)**
    - [x] `nodes`, `edges` 상태 정의 (React Flow 타입 호환)
    - [x] `onNodesChange`, `onEdgesChange`, `onConnect` 액션 구현
    - [x] `selectedNodeId` 상태 관리
    - [x] `updateNodeData` 액션 구현 (설정 패널에서 데이터 수정 시 사용)
    - [x] `isValid` (저장 가능 여부) 계산 로직

## Step 2: 커스텀 노드 개발 (Custom Nodes)
- [x] **기본 노드 컴포넌트 (`apps/web/src/components/nodes/BaseNode.tsx`)**
    - [x] 공통 스타일 (아이콘, 라벨, 상태 뱃지 ✅/⚠️)
    - [x] 선택 상태 스타일링 (Selected state)
- [x] **Trigger 노드 (`TriggerNode.tsx`)**
    - [x] 단일 출력 핸들 (Bottom)
- [x] **Action 노드 (`ActionNode.tsx`)**
    - [x] 단일 입력 핸들 (Top), 단일 출력 핸들 (Bottom)
- [x] **Condition 노드 (`ConditionNode.tsx`)**
    - [x] 단일 입력 핸들 (Top)
    - [x] **두 개의 출력 핸들 (True/False)** - 위치 및 색상 구분 (Green/Red)

## Step 3: 캔버스 인터랙션 (Canvas Interaction)
- [x] **드래그 앤 드롭 연결 로직**
    - [x] Condition 노드 연결 시 엣지에 라벨("Yes"/"No") 자동 추가하는 `onConnect` 커스텀 로직
- [x] **노드 추가 UX (`onConnectEnd` 활용)**
    - [x] 엣지를 빈 공간에 놓았을 때 좌표 계산
    - [x] **노드 선택 모달 (`NodeSelectionModal`)** 호출
- [x] **노드 선택 모달 구현**
    - [x] Trigger / Action / Logic 탭 UI
    - [x] 검색 기능
    - [x] 선택 시 해당 위치에 노드 생성 및 자동 연결

## Step 4: 설정 패널 고도화 (Config Panel)
- [x] **패널 구조 개선**
    - [x] 선택된 노드 타입에 따라 동적으로 폼 렌더링 (`switch` case)
    - [x] 폼 데이터 변경 시 `workflowStore`의 `updateNodeData` 호출
- [x] **Trigger 설정 폼**
    - [x] **계정 선택 (`AccountSelect`)**: API 연동 (`GET /accounts`)
    - [x] **인라인 계정 연동 모달**: `AccountSelect` 내 "+ 연결" 버튼 클릭 시 호출 (링크만 구현)
    - [x] **필터 규칙 UI**: 조건 추가/삭제 기능
- [x] **Action 설정 폼**
    - [x] **변수 피커 (`VariablePicker`)**: 이전 노드들의 출력 데이터 스키마 기반으로 칩 목록 표시
    - [x] `Textarea`에 변수 삽입 기능
- [x] **Condition 설정 폼**
    - [x] 조건식(Field, Operator, Value) 입력 UI

## Step 5: 저장 및 테스트 (Save & Test)
- [x] **유효성 검사 로직**
    - [x] 각 노드의 필수 설정 확인 (`isValid` 업데이트)
    - [x] 모든 노드가 유효할 때만 "Save" 버튼 활성화
- [x] **API 연동**
    - [x] `PUT /workflows/:id`: 노드/엣지 데이터를 JSON으로 직렬화하여 저장
    - [x] `GET /workflows/:id`: 불러올 때 JSON 파싱하여 노드/엣지 복원
- [x] **테스트 모달 (`TestRunModal`)**
    - [x] 모의 데이터 입력 및 실행 API 호출 (Mock)

## Step 6: 추가 기능 구현 (Advanced Features)
- [x] **전역 설정 (Global Settings)**
    - [x] **UI**: 헤더에 설정 버튼 추가
    - [x] **모달/패널**: 실패 알림 활성화 토글 및 Discord Webhook URL 입력 폼 구현
    - [x] **상태 관리**: `workflowStore`에 전역 설정 상태 추가
    - [x] **API**: 워크플로우 저장 시 전역 설정 데이터도 함께 저장

- [x] **계정 연동 (Account Connection)**
    - [x] **UI**: `ConfigPanel`의 계정 선택 드롭다운 옆에 "+ Connect" 버튼 기능 활성화
    - [x] **모달**: 계정 타입(IMAP, Notion 등) 선택 및 인증 정보 입력 폼 구현
    - [x] **API**: 계정 생성 API (`POST /accounts`) 연동 및 성공 시 드롭다운 목록 갱신
