# 데이터 연동 및 저장 구현 체크리스트

이 문서는 워크플로우 에디터의 데이터를 백엔드와 실제로 연동하여 저장하고 불러오는 기능을 구현하기 위한 작업 목록입니다.

## 1. 데이터 구조 설계 (Data Structure)
- [ ] **프론트엔드 데이터 모델 정의**
    - [ ] `React Flow`의 `nodes`, `edges` 데이터를 백엔드 `Trigger`, `Action` 모델로 매핑하는 규칙 정의
    - [ ] `Condition` 노드와 같은 로직 노드를 백엔드에 어떻게 저장할지 결정 (현재 DB 스키마에는 `Action`만 있음. `Action`의 한 타입으로 저장하거나 스키마 확장 필요)

## 2. 백엔드 API 구현 (`apps/api`)
- [ ] **워크플로우 저장 API (`PUT /workflows/:id`) 수정**
    - [ ] 요청 바디로 `nodes`, `edges` (또는 변환된 `trigger`, `actions`) 받기
    - [ ] 기존 `Trigger`, `Action` 삭제 후 재생성 (또는 업데이트) 로직 구현
    - [ ] `Condition` 노드 처리 로직 추가
- [ ] **워크플로우 조회 API (`GET /workflows/:id`) 확인**
    - [ ] `Trigger`, `Action` (및 `Condition`) 데이터를 모두 포함(`include`)하여 반환하는지 확인

## 3. 프론트엔드 연동 (`apps/web`)
- [ ] **데이터 변환 유틸리티 (`utils/workflowConverter.ts`) 구현**
    - [ ] `nodes`, `edges` -> `BackendPayload` (저장용)
    - [ ] `BackendResponse` -> `nodes`, `edges` (불러오기용)
- [ ] **API 호출 연결**
    - [ ] `WorkflowEditor.tsx`의 `handleSaveWorkflow`에서 실제 `api.put` 호출 및 변환 로직 적용
    - [ ] `useQuery`로 불러온 데이터를 `layoutWorkflow`에서 변환 로직 적용하여 렌더링

## 4. 테스트
- [ ] **저장 테스트**: 에디터에서 노드 추가/연결 후 저장 -> DB 확인
- [ ] **불러오기 테스트**: 새로고침 후 저장된 노드/엣지가 그대로 복원되는지 확인
