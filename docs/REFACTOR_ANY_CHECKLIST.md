# `any` 타입 제거 및 리팩토링 체크리스트

이 문서는 프로젝트 전반에 퍼져있는 `any` 타입을 제거하고, 구체적인 타입 정의를 적용하여 코드의 안정성과 가독성을 높이기 위한 작업 목록입니다.

## 1. 프론트엔드 (`apps/web`)

### 완료된 작업
- [x] **공통 타입 정의 (`apps/web/src/types/workflow.ts`)**: `NodeConfig`, `WorkflowBackendData`, `AccountResponse` 등 핵심 인터페이스 정의 완료.
- [x] **상태 관리 (`apps/web/src/store/workflowStore.ts`)**: Zustand 스토어의 `nodes`, `edges`, `config` 관련 `any` 제거 완료.
- [x] **페이지 (`apps/web/src/pages/WorkflowEditor.tsx`)**: 워크플로우 데이터 로딩/저장 로직의 `any` 제거 완료.
- [x] **컴포넌트 (`apps/web/src/components/ConfigPanel.tsx`)**: 설정 패널의 `config` 및 핸들러 관련 `any` 제거 완료.
- [x] **컴포넌트 (`apps/web/src/components/AccountConnectionModal.tsx`)**: 계정 설정 관련 `any` 제거 완료.
- [x] **`apps/web/src/components/TestRunModal.tsx`**
    - [x] `inputData` (JSON string), `result` (Execution Result) 타입 정의 및 적용.
    - [x] `onRun` 함수의 반환 타입 구체화.
- [x] **`apps/web/src/utils/api.ts`**
    - [x] `request` 함수의 `body: any`를 `unknown` 또는 제네릭으로 변경 고려.
    - [x] `error` 처리 시 `any` 대신 `unknown` 사용 및 타입 가드 적용.

## 2. 백엔드 (`apps/api`)

### 완료된 작업
- [x] **`apps/api/src/executors/executor.ts` (Priority: High)**
    - [x] `action.config as any` -> `ActionConfig` 인터페이스 정의 및 적용.
    - [x] `node.data.config` 접근 시 타입 단언 구체화.
    - [x] `executeWorkflow`의 `overrideWorkflowData` 타입 구체화.
- [x] **`apps/api/src/controllers/workflow.ts`**
    - [x] `req.body`의 `nodes`, `edges`, `globalSettings` 타입 정의.
    - [x] `updateData: any` -> `Prisma.WorkflowUpdateInput` 활용.
- [x] **`apps/api/src/services/imapPolling.ts`**
    - [x] `account.credentials as any` -> `ImapCredentials` 인터페이스 정의.
    - [x] `trigger.config as any` -> `TriggerConfig` 인터페이스 정의.
- [x] **`apps/api/src/controllers/auth.ts`**
    - [x] `error: any` -> `unknown` 및 타입 가드(`instanceof Error`) 적용.
