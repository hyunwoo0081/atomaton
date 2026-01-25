# 개발자 대시보드 설계 (Developer Dashboard)

## 1. 개요
시스템 전체의 운영 상태를 모니터링하고, 성능 이슈나 오류를 식별하기 위한 개발자 전용 화면입니다.

## 2. 화면 구성

### 레이아웃
- **공통 레이아웃 (`Layout`)** 적용

### 주요 섹션

#### 2.1. 시스템 개요 (Overview Cards)
-   **Total Users**: 전체 가입자 수
-   **Total Workflows**: 전체 워크플로우 수
-   **Active Workflows**: 활성화된 워크플로우 수
-   **Success Rate**: 전체 실행 성공률 (Green/Red 색상 코딩)

#### 2.2. 문제 워크플로우 (Top Failing Workflows)
-   **타이틀**: "Top Failing Workflows"
-   **리스트**:
    -   실패 횟수가 높은 순으로 정렬된 워크플로우 목록
    -   **정보**: 워크플로우 이름, ID, 실패 횟수
    -   **스타일**: 경고 색상(`bg-red-50`) 활용

#### 2.3. (추후 확장) 큐 상태 (Queue Status)
-   현재 대기 중인 작업 수
-   처리량(Throughput) 그래프

## 3. 인터랙션
- **자동 갱신**: `React Query`의 `refetchInterval`을 사용하여 주기적으로 데이터 갱신 (예: 30초)
- **워크플로우 클릭**: 문제 있는 워크플로우의 상세 로그나 에디터로 이동 (디버깅 용도)

## 4. 예시 코드 (구조)
```tsx
<Layout>
  <h1>Developer Dashboard</h1>
  <div className="grid ...">
    <Card>Total Users: {stats.users}</Card>
    <Card>Success Rate: {stats.successRate}</Card>
  </div>
  <section>
    <h2>Top Failing Workflows</h2>
    <ul>
      {failingWorkflows.map(wf => (
        <li>{wf.name} - {wf.failures} failures</li>
      ))}
    </ul>
  </section>
</Layout>
```
