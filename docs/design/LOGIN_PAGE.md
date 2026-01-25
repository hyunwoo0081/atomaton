# 로그인 페이지 설계 (Login Page)

## 1. 개요
사용자가 이메일과 비밀번호를 입력하여 시스템에 접속하는 진입점입니다.

## 2. 화면 구성

### 레이아웃
- **배경**: `bg-gray-50` (연한 회색)
- **컨테이너**: 화면 중앙 정렬 (`flex items-center justify-center min-h-screen`)

### 주요 컴포넌트

1.  **로그인 카드 (`Card`)**
    -   **헤더**:
        -   로고 또는 타이틀: "Sign in to your account" (`text-3xl font-extrabold`)
    -   **입력 폼**:
        -   **이메일 입력 (`Input`)**:
            -   Label: "Email address"
            -   Type: `email`
            -   Placeholder: "user@example.com"
        -   **비밀번호 입력 (`Input`)**:
            -   Label: "Password"
            -   Type: `password`
            -   Placeholder: "••••••••"
    -   **에러 메시지 영역**:
        -   로그인 실패 시 붉은색 텍스트로 표시 (`text-red-500`)
    -   **액션 버튼 (`Button`)**:
        -   Label: "Sign in"
        -   Variant: `primary`
        -   Width: `w-full`

## 3. 인터랙션
- **Submit**: 폼 제출 시 `/auth/login` API 호출
- **Success**:
    -   `token` 및 `user` 정보 저장 (LocalStorage)
    -   `is_developer` 여부에 따라 `/developer` 또는 `/`로 리다이렉트
- **Failure**: 에러 메시지 표시

## 4. 예시 코드 (구조)
```tsx
<div className="min-h-screen flex items-center justify-center bg-gray-50">
  <Card className="max-w-md w-full space-y-8">
    <h2>Sign in to your account</h2>
    <form>
      <Input label="Email" />
      <Input label="Password" type="password" />
      <Button className="w-full">Sign in</Button>
    </form>
  </Card>
</div>
```
