# Any 타입 제거 체크리스트

이 문서는 프로젝트 내의 `any` 타입을 단계별로 제거하기 위한 가이드라인입니다.

## 1. 개요
`any` 타입은 TypeScript의 타입 시스템을 무력화시키고 런타임 에러의 원인이 됩니다. 모든 `any`는 구체적인 인터페이스나 `unknown`으로 대체되어야 합니다.

## 2. 체크리스트

### 2.1. API Layer (apps/api)
- [x] `Request.userId` 확장 시 `any` 제거 -> `JwtPayload` 인터페이스 적용.
- [x] `request` 함수의 `body` 타입을 제네릭으로 변경 고려.
- [x] Prisma JSON 필드(`config`, `settings`) 할당 시 `unknown` 경유 명시적 캐스팅 적용.

### 2.2. Executor Engine
- [x] `action.config` -> `ActionConfig` 인터페이스 정의 및 적용.
- [x] `WorkflowContext.data` -> `WorkflowData (Record<string, unknown>)` 적용.
- [x] `updateData` -> `Prisma.WorkflowUpdateInput` 활용.
- [x] `account.credentials` -> `ImapCredentials` 인터페이스 정의.
- [x] `trigger.config` -> `TriggerConfig` 인터페이스 정의.

### 2.3. Error Handling
- [x] `catch (error)` -> `unknown` 및 타입 가드(`instanceof Error`) 적용.

## 3. 원칙
1. 가능한 구체적인 인터페이스를 정의한다.
2. 외부 데이터 수신 시에는 `unknown`을 사용하고 타입 가드로 좁힌다(Narrowing).
3. 명시적 타입 캐스팅을 최소화하고 설계를 우선 재검토한다.
