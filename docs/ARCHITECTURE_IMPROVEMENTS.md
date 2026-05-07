# 🚀 Atomaton Architecture Improvement Roadmap

현재 Atomaton은 초경량 자동화 엔진으로서 훌륭한 기초를 갖추고 있으나, 시스템 규모가 커짐에 따라 **안정성(Resiliency)**과 **유지보수 효율(Maintainability)** 측면에서 직면할 잠재적 문제점들이 있습니다. 이를 해결하기 위한 아키텍처 개선 방안을 제안합니다.

---

## 1. 현재 아키텍처의 한계점 (Current Bottlenecks)

### 1.1. 휘발성 인메모리 큐 (Volatile In-memory Queue)

- **문제**: `queue.ts`가 메모리 상에서만 동작합니다. 서버가 예기치 않게 재시작되거나 배포가 진행될 때, 대기 중이거나 재시도(Retry) 중인 모든 워크플로우 작업이 유실됩니다.
- **리스크**: 결제 알림이나 중요한 장애 보고와 같은 "유실되면 안 되는 데이터"의 신뢰성을 보장할 수 없습니다.

### 1.2. 거대 엔진 모듈 (The God Executor Module)

- **문제**: `executor.ts`의 `executeWorkflow` 함수가 워크플로우 조회, 노드 순회, 개별 액션 실행, 로깅까지 너무 많은 책임을 집고 있습니다.
- **유지보수**: 새로운 노드 타입이 추가될 때마다 거대한 `switch-case` 문을 수정해야 하며, 이는 코드 충돌과 회귀 버그(Regression)의 원인이 됩니다.

### 1.3. API와 엔진의 강한 결합 (Tight Coupling)

- **문제**: API 서버와 워크플로우 실행 엔진이 동일한 Node.js 프로세스에서 실행됩니다.
- **성능**: 특정 워크플로우가 CPU를 많이 사용하거나 무거운 API 호출을 수행할 때, 대시보드 사용자 경험(UI API)이 느려지거나 서버가 응답하지 않을 수 있습니다.

---

## 2. 권장 개선 전략 (Recommended Solutions)

### 2.1. 영속성 있는 큐 시스템 도입 (Persistent Task Queue)

- **전략**: 외부 인프라(Redis) 없이 경량화를 유지하고 싶다면, **SQLite 기반의 큐** 또는 현재 사용 중인 **MySQL의 전용 Task 테이블**을 큐로 활용합니다.
- **개선**: `Log` 테이블과는 별개로 `PendingTask` 테이블을 만들어 관리합니다. 서버 시작 시 미완료 작업을 자동으로 복구할 수 있습니다.

### 2.2. 플러그인 기반 노드 확장 (Plugin Architecture)

- **전략**: 각 노드(Discord, Notion, HTTP 등)를 별도의 클래스나 모듈로 분리하고, 이를 엔진에 등록(Registry)하는 방식으로 변경합니다.
- **개선**:
  - `BaseAction` 추상 클래스를 정의.
  - 신규 노드 추가 시 `executor.ts`를 고치지 않고, `actions/` 폴더에 파일 하나만 추가하면 자동으로 로드되는 구조를 지향합니다.

### 2.3. Control Plane과 Data Plane의 분리

- **전략**: API 서버(Control Plane)와 워커(Data Plane/Worker) 프로세스를 물리적으로 분리합니다.
- **개선**: PM2를 사용하여 하나는 API 서버로, 하나는 워커 서버로 띄웁니다. 워커는 DB에서 할 일을 가져와 처리만 담당하게 하여 부하를 분산합니다.

---

## 3. 로드맵 (Action Items)

### Phase 1: 안정성 확보 (Short-term)

- [ ] **Database Queue**: `Log` 테이블의 `ENQUEUED` 상태를 활용한 자동 복구 스케줄러 구현.
- [ ] **Graceful Shutdown**: 서버 종료 시 큐에 있는 작업을 DB에 안전하게 보존하는 로직 추가.

### Phase 2: 구조 개선 (Mid-term)

- [ ] **Node Strategy Pattern**: `switch-case` 로직을 전략 패턴(Strategy Pattern)으로 리팩토링.
- [ ] **Shared Types Package**: 프론트엔드와 백엔드 간 타입 중복을 제거하기 위해 `@atomaton/types` 공유 패키지 생성.

### Phase 3: 고도화 (Long-term)

- [ ] **Worker Isolation**: 워커 프로세스 분리 및 리소스 제한(Limit) 설정.
- [ ] **Circuit Breaker**: 특정 외부 API(예: Discord) 장애 시 해당 노드만 일시적으로 차단하는 회로 차단기 도입.

---

_이 가이드는 프로젝트의 성장에 발맞추어 지속적으로 업데이트되어야 합니다._
