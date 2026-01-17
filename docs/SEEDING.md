# 데이터베이스 시딩 (User Seeding) 가이드

이 문서는 개발 및 테스트 목적으로 초기 사용자 데이터를 데이터베이스에 생성(Seeding)하는 방법을 설명합니다.

## 1. 사전 요구 사항

- 데이터베이스(MySQL 등)가 실행 중이어야 합니다.
- `.env` 파일에 `DATABASE_URL`이 올바르게 설정되어 있어야 합니다.
- 데이터베이스 마이그레이션이 완료되어 테이블이 생성되어 있어야 합니다.
  ```bash
  pnpm --filter @atomaton/db prisma migrate dev
  ```

## 2. 시드 실행 명령어

프로젝트 루트에서 다음 명령어를 실행합니다:

```bash
pnpm --filter @atomaton/db prisma db seed
```

## 3. 생성되는 계정 정보

명령어가 성공적으로 실행되면 다음 두 개의 계정이 생성됩니다. (비밀번호는 동일합니다)

| 역할 | 이메일 | 비밀번호 | 비고 |
| :--- | :--- | :--- | :--- |
| **개발자 (Developer)** | `dev@atomaton.com` | `password123` | `is_developer: true` |
| **일반 사용자 (User)** | `user@atomaton.com` | `password123` | `is_developer: false` |

## 4. 문제 해결

### `Unknown file extension ".ts"` 에러 발생 시
`packages/db/package.json`의 `seed` 스크립트가 다음과 같이 설정되어 있는지 확인하세요:
```json
"seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
```

### 데이터베이스 연결 에러
`.env` 파일의 `DATABASE_URL`이 올바른지 확인하세요.
