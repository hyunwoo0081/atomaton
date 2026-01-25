# 계정 관리 페이지 설계 (Accounts Page)

## 1. 개요
외부 서비스(Naver IMAP, Notion 등)와의 연동을 위한 계정 정보를 등록하고 관리하는 화면입니다. 워크플로우 설정 시 매번 비밀번호를 입력하는 대신, 여기서 등록한 계정을 선택하여 사용합니다.

## 2. 화면 구성

### 레이아웃
- **공통 레이아웃 (`Layout`)** 적용

### 주요 섹션

#### 2.1. 계정 목록
-   **헤더**:
    -   타이틀: "Connected Accounts"
    -   **연동 버튼 (`Button`)**: "+ Connect Account"
-   **리스트 (List/Grid)**:
    -   **계정 카드 (`Card`)**:
        -   **아이콘/타입**: Naver, Notion 등 로고 또는 텍스트
        -   **계정명**: 사용자 식별용 이름 (예: "My Personal Email")
        -   **상세 정보**: 이메일 주소 등 (비밀번호는 숨김)
        -   **삭제 버튼**: 연동 해제

#### 2.2. 계정 연결 모달 (또는 별도 페이지)
-   **서비스 선택**: Naver IMAP, Notion 등
-   **입력 폼 (Naver IMAP)**:
    -   Username (Email)
    -   Password (Encrypted on server)
    -   Host/Port (Default값 제공)

## 3. 인터랙션
- **계정 등록**: 정보 입력 -> API 호출 (`POST /accounts`) -> 목록 갱신
- **계정 삭제**: 삭제 버튼 -> 확인 팝업 -> API 호출 (`DELETE /accounts/:id`)

## 4. 데이터 구조 (예시)
```typescript
interface Account {
  id: string;
  type: 'NAVER_IMAP' | 'NOTION';
  name: string; // 사용자 지정 이름
  details: {
    username?: string;
    // password는 클라이언트에 전달되지 않음
  };
}
```
