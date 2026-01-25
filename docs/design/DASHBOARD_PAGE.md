# 대시보드 페이지 설계 (Dashboard Page)

## 1. 개요
사용자가 자신의 워크플로우 목록을 확인하고, 새로운 워크플로우를 생성하며, 최근 실행 로그를 모니터링하는 메인 화면입니다.

## 2. 화면 구성

### 레이아웃
- **공통 레이아웃 (`Layout`)** 적용: 상단 네비게이션 바 포함
- **컨텐츠 영역**: `max-w-7xl mx-auto` (중앙 정렬, 최대 너비 제한)

### 주요 섹션

#### 2.1. 워크플로우 섹션 (Workflows)
-   **헤더**:
    -   타이틀: "Workflows" (`text-3xl font-bold`)
    -   **생성 버튼 (`Button`)**:
        -   Label: "+ New Workflow"
        -   Action: 워크플로우 이름 입력 모달(또는 프롬프트) 호출 후 생성 API 요청
-   **리스트 (Grid Layout)**:
    -   `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
    -   **워크플로우 카드 (`Card`)**:
        -   **타이틀**: 워크플로우 이름 (`text-xl font-semibold`)
        -   **상태 뱃지**: Active(Green) / Inactive(Gray)
        -   **메타 정보**: 생성일 (`text-sm text-gray-500`)
        -   **클릭 시**: `/workflow/:id`로 이동

#### 2.2. 최근 활동 섹션 (Recent Activity)
-   **헤더**:
    -   타이틀: "Recent Activity" (`text-2xl font-bold`)
-   **로그 테이블 (`LogTable`)**:
    -   컬럼: Status, Message, Time
    -   스타일: `bg-white shadow rounded-lg`
    -   데이터: 최근 10건의 로그 표시

## 3. 인터랙션
- **워크플로우 생성**: 버튼 클릭 -> 이름 입력 -> API 호출 -> 목록 갱신 -> 에디터로 이동(선택 사항)
- **워크플로우 클릭**: 해당 워크플로우의 에디터 페이지로 이동

## 4. 예시 코드 (구조)
```tsx
<Layout>
  <div className="space-y-12">
    <section>
      <div className="flex justify-between">
        <h1>Workflows</h1>
        <Button>+ New Workflow</Button>
      </div>
      <div className="grid ...">
        {workflows.map(wf => (
          <Card>
            <h3>{wf.name}</h3>
            <span>{wf.status}</span>
          </Card>
        ))}
      </div>
    </section>
    <section>
      <h2>Recent Activity</h2>
      <LogTable logs={logs} />
    </section>
  </div>
</Layout>
```
