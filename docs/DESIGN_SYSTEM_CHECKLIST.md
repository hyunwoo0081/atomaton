# 디자인 시스템 적용 체크리스트 (Luminous Glassmorphism)

`docs/DESIGN_CONTEXTS.json`에 정의된 "Luminous Glassmorphism SaaS" 테마를 프로젝트 전반에 적용하기 위한 작업 목록입니다.

## 1. 전역 스타일 및 테마 설정 (Global Styles)
- [x] **Tailwind 설정 및 전역 CSS (`apps/web/src/index.css`)**
    - [x] **Colors**:
        - `bg-main`: `#0D0E12`
        - `primary-purple`: `#8A3FFC`
        - `vibrant-pink`: `#E02DFF`
        - `status-success`: `#00F5A0`
        - `status-error`: `#FF2E63`
    - [x] **Background Images**:
        - `gradient-flow`: `linear-gradient(135deg, #8A3FFC 0%, #E02DFF 100%)`
    - [x] `body` 배경색을 `#0D0E12`로 설정
    - [x] 기본 텍스트 색상을 `#FFFFFF`로 설정

## 2. 공용 UI 컴포넌트 리팩토링 (`packages/ui`)
- [x] **Card 컴포넌트 (`Card.tsx`)**
    - [x] 배경: `rgba(255, 255, 255, 0.05)`
    - [x] 테두리: `1px solid rgba(255, 255, 255, 0.1)`
    - [x] 효과: `backdrop-filter: blur(20px)`
    - [x] 그림자: `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8)`
    - [x] Border Radius: `32px`
- [x] **Button 컴포넌트 (`Button.tsx`)**
    - [x] **Primary**: 네온 그라데이션 배경 (`gradient-flow`), Pill-shape (`rounded-3xl`), Hover 시 Glow 효과
    - [x] **Secondary**: 투명 배경, 흰색 테두리/텍스트
- [x] **Input 컴포넌트 (`Input.tsx`)**
    - [x] 배경: 투명 또는 매우 옅은 흰색
    - [x] 테두리: 하단 강조 또는 전체 옅은 테두리
    - [x] 텍스트: 흰색 (Placeholder는 옅은 회색)

## 3. 레이아웃 및 배경 요소 (Layout & Atmosphere)
- [x] **Layout 컴포넌트 (`apps/web/src/components/Layout.tsx`)**
    - [x] **Floating Spheres**: 배경에 보라색/핑크색 구체(div with blur) 배치 (z-index: -1)
    - [x] 네비게이션 바: 글래스모피즘 효과 적용

## 4. 페이지별 스타일링 적용
- [x] **로그인 페이지 (`Login.tsx`)**
    - [x] 중앙 카드에 글래스모피즘 적용
- [x] **대시보드 (`Dashboard.tsx`)**
    - [x] 워크플로우 카드 리스트 스타일링
    - [x] 로그 테이블 스타일링 (투명 배경, 헤더 강조)
- [x] **워크플로우 에디터 (`WorkflowEditor.tsx`)**
    - [x] **React Flow 커스텀 스타일**:
        - 배경: 투명 (전역 배경이 보이도록)
        - 엣지(Edge): 네온 컬러 (`#8A3FFC` or `#E02DFF`)
        - 미니맵/컨트롤: 글래스모피즘 스타일
    - [x] **노드 컴포넌트 (`BaseNode.tsx`)**:
        - 글래스모피즘 카드 스타일 적용
        - 상태 아이콘(✅/⚠️) 색상 조정 (`#00F5A0`, `#FF2E63`)
    - [x] **사이드바 & 설정 패널**:
        - 화면 위에 떠 있는(Floating) 글래스 패널로 디자인 변경
