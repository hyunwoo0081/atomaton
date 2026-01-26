# 데이터 연동 및 저장 구현 체크리스트

이 문서는 워크플로우 에디터의 데이터를 백엔드와 실제로 연동하여 저장하고 불러오는 기능을 구현하기 위한 작업 목록입니다.

## 1. 백엔드 데이터 모델 및 API 확장 (`apps/api`)

- [x] **`schema.prisma` 수정**
    - [x] `Workflow` 모델에 `ui_config Json?` 필드 추가 (React Flow UI 상태 저장용)
    - [x] `Workflow` 모델에 `settings Json?` 필드 추가 (Global Settings 저장용)
    - [x] `Action` 모델의 `type` enum에 `CONDITION` 추가 (또는 `String` 타입 유지)
    - [x] `Action` 모델의 `config` 필드에 `Condition` 노드의 `rules` 및 다음 노드 ID를 저장할 수 있도록 구조 정의
    - [x] `prisma migrate dev` 실행

- [x] **`workflow.ts` 컨트롤러 수정**
    - [x] `createWorkflow`: 초기 `ui_config` 및 `settings` 저장 로직 추가
    - [x] `updateWorkflow` (`PUT /workflows/:id`):
        - [x] 요청 바디에서 `nodes`, `edges`, `globalSettings` 받기
        - [x] `ui_config` 필드에 `nodes`와 `edges`를 JSON 형태로 저장
        - [x] `settings` 필드에 `globalSettings`를 JSON 형태로 저장
        - [x] `nodes`와 `edges`를 파싱하여 `Trigger`와 `Action` (및 `Condition`) 모델을 업데이트/생성/삭제하는 로직 구현
    - [x] `getWorkflowById` (`GET /workflows/:id`):
        - [x] `ui_config`와 `settings` 필드를 `include`하여 반환하도록 확인

- [x] **`executor.ts` 실행 엔진 업그레이드**
    - [x] `ui_config` 또는 파싱된 `Trigger`/`Action` 데이터를 기반으로 그래프 순회 로직 구현
    - [x] `Condition` 타입의 `Action` 노드 로직 처리 (규칙 평가 및 흐름 분기)
    - [x] `globalSettings`의 실패 알림 설정(`enableFailureAlert`, `failureWebhookUrl`)을 활용한 최종 실패 알림 로직 추가

- [x] **테스트 실행 API (`POST /workflows/:id/test`) 구현**
    - [x] 새로운 라우트 및 컨트롤러 함수 생성
    - [x] 요청 바디에서 `nodes`, `edges`, `inputData` 받기
    - [x] `executor.ts`의 실행 로직을 호출하여 결과를 즉시 반환 (큐에 넣지 않음)

## 2. 프론트엔드 연동 (`apps/web`)

- [x] **`WorkflowEditor.tsx` 수정**
    - [x] `handleSaveWorkflow`: `useWorkflowStore`의 `nodes`, `edges`, `globalSettings`를 `PUT /workflows/:id` API로 전송
    - [x] `layoutWorkflow`: `GET /workflows/:id` 응답에서 `ui_config`를 파싱하여 `setNodes`, `setEdges`로 React Flow에 로드
    - [x] `layoutWorkflow`: `settings`를 파싱하여 `updateGlobalSettings`로 스토어에 로드

- [x] **`TestRunModal.tsx` 수정**
    - [x] `onRun` 함수에서 `POST /workflows/:id/test` API 호출 및 실제 결과 표시
