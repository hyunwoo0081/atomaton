# 팀용 경량 자동화 플랫폼 기획·설계서

## 1. 프로젝트 개요

본 프로젝트는 **개인 및 소규모 팀 알림 자동화**를 목표로 하는 경량 자동화 플랫폼이다.

- Naver IMAP, Gmail(GAS Webhook) 기반 이메일 트리거
- 외부 서비스(Webhook) 연동 트리거
- Discord / Notion 등으로 알림 및 액션 실행
- Make/Zapier와 유사한 UI를 제공하되, **개인 서버에서도 충분히 구동 가능한 경량 구조**를 지향

### 핵심 제약 조건

- 인프라:
    - MySQL 서버 1대
    - GCP e2-micro 인스턴스 1대 (PM2 + Node.js)
- Redis, 메시지 브로커 등 외부 인프라 ❌
- 스케줄 지연 수 분 허용

---

## 2. 사용자 / 권한 모델

### 기본 원칙

- **워크스페이스 개념 없음**
- **팀 ID = 개인 계정 ID**
- 계정은 공유 가능 (ID/비밀번호 공유)

### 계정 종류

| 구분 | 설명 |
| --- | --- |
| 일반 계정 | 자동화 생성 및 관리 |
| 개발자 계정 | 전체 트리거/액션 모니터링 전용 |

---

## 3. 트리거(Trigger) 설계

### 트리거 유형

### 3.1 IMAP Polling Trigger

- Naver IMAP 지원
- **계정당 여러 IMAP 계정 등록 가능**
- 사용자 설정 Polling 주기 (분 단위)
- Polling 지연 허용

**처리 기준**

- UID 기반 신규 메일 조회
- Message-ID 기반 중복 제거
- 메일 Date 헤더를 `receivedAt`으로 사용

```json
{
  "messageId": "<mail@id>",
  "uid": 12345,
  "receivedAt": "2025-03-01T09:12:00Z",
  "processedAt": "2025-03-01T09:13:00Z",
  "source": "naver-imap"
}
```

---

### 3.2 Webhook Trigger

- 서버에서 Webhook URL 발급
- 외부 서비스(Gmail GAS, 기타 API) 연동

**보안**

- `Authorization: Bearer {API_KEY}` 헤더 필수

```
POST /webhook/{accountId}/{triggerId}
Authorization: Bearer xxx
```

- Webhook은 Push 방식 → Polling 없음

---

## 4. Rule / 조건식 설계

### 조건식 범위 (1차)

- AND 조건만 지원
- 연산자:
    - contains
    - equals

### 확장 고려

- 추후 regex 연산자 추가 가능하도록 구조 설계

```json
{
  "field": "subject",
  "operator": "contains",
  "value": "ERROR"
}
```

---

## 5. Action 설계

### Action 실행 방식

- **순차 실행 (single-thread)**
- 실패 시 이후 Action 중단

### 지원 Action (1차)

- Discord Webhook
- Notion API

---

## 6. Retry & 안정성 정책

### Retry 정책

| HTTP 코드 | 처리 방식 |
| --- | --- |
| 4xx | 즉시 실패 (재시도 ❌) |
| 5xx | Retry Queue 이동 |

**Retry 전략**

- 최대 5회
- Backoff: 1s → 5s → 30s → 2m → 10m

---

## 7. Discord Rate Limit 정책

- Webhook URL 기준
- 초당 1~2건 제한
- 내부 Queue + setTimeout 기반

---

## 8. 데이터 저장 정책

### 저장 범위

- 메일: header만 저장
- body 저장 ❌
- 로그:
    - 최근 1000건
    - 3일 보존

---

## 9. IMAP 인증 정보 보안 설계

### 저장 방식

- IMAP 비밀번호는 **암호화 후 DB 저장**
- 애플리케이션에서 복호화하여 사용

### 암호화 방식 (권장)

- AES-256-GCM
- Master Key는 서버 환경변수로 관리

```
DB: encrypted_password
ENV: MASTER_KEY
```

> MySQL 자체 암호화(TDE)는 사용하지 않음
> 
> 
> 컬럼 단위 암호화는 애플리케이션 레벨에서 처리
> 

### 성능 고려

- IMAP Polling 빈도 낮음
- 암복호화 비용 미미 → 성능 영향 거의 없음

---

## 10. 프론트엔드 요구사항 (React)

### 사용자 화면

- 로그인
- Trigger 생성 / 수정
- Action 연결
- Rule ON/OFF
- 실행 플로우 시각화 (Make 스타일)

### 개발자 전용 화면

- 전체 Trigger 실행 현황
- Queue 상태
- 예정된 Action 목록
- 실패/Retry 모니터링

---

## 11. 백엔드 아키텍처

### 구성

- Node.js + Express
- PM2 cluster ❌ (single process)
- In-process Queue
- setInterval 기반 Polling

### Worker 전략

- Worker 분리 ❌
- 단일 프로세스 내 Task Loop

---

## 12. 로그 & 운영

- 콘솔 로그 + 파일 로그
- React UI에 최근 이벤트 표시

---

## 13. 추후 확장 고려

- Regex 조건식
- Slack / Teams Action
- Schedule Trigger
- AI 요약

---

## 14. 설계 원칙 요약

> 기능보다 안정성
> 
> 
> 확장보다 **단순성**
> 
> 대규모보다 **혼자 운영 가능한 구조**
>