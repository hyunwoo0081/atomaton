# ⚡ atomation

**Lightweight Mail & Webhook Automation Platform**

`atomation`은 개인과 소규모 팀을 위한 초경량 자동화 워크플로우 엔진입니다. 복잡한 외부 인프라(Redis, Message Broker 등) 없이 저사양 환경에서도 안정적으로 구동되도록 설계되었습니다. Make나 Zapier의 무거운 구조 대신, 꼭 필요한 기능만을 담아 나만의 자동화 서버를 구축하세요.

---

## ✨ Key Features

* 📧 **Mail Trigger**: Naver(IMAP), Gmail(GAS Webhook) 연동 및 신규 메일 감지.
* 🔗 **Webhook Integration**: 외부 서비스로부터의 데이터를 수신하는 고유 Webhook URL 발급.
* 🛠️ **Simple Logic**: AND 조건 기반의 직관적인 필터링 엔진 (Subject, Content 등).
* 🚀 **Quick Actions**: Discord 알림 전송, Notion 페이지 생성 등 실무 중심의 액션 지원.
* 🔒 **Security First**: AES-256-GCM 암호화를 통한 안전한 IMAP 인증 정보 관리.
* 📊 **Monitoring**: 실행 로그 및 실패 건에 대한 지능적인 Retry(Backoff) 시스템.

---

## 🏗️ System Architecture

본 프로젝트는 최소한의 자원으로 최대의 효율을 내는 **Single Process Architecture**를 지향합니다.

* **Runtime**: Node.js (Managed by PM2)
* **Database**: MySQL (Single Instance)
* **Worker**: In-process Queue & Task Loop (No Redis required)
* **Encryption**: Application-level AES-256-GCM

---

## 🛠️ Tech Stack

| Category | Technology |
| --- | --- |
| **Frontend** | React, Tailwind CSS, Lucide React (UI) |
| **Backend** | Node.js, Express, PM2 |
| **Database** | MySQL 8.0+ |
| **Auth** | JWT, AES-256-GCM (Credential Encryption) |

---

## 🚀 Quick Start

### 1. Requirements

* Node.js 18.x+
* MySQL 8.0+
* (Optional) PM2

### 2. Environment Variables

/apps/api/ 경로에 `.env` 파일을 생성하고 아래 내용을 설정합니다.

```env
PORT=3006
DATABASE_URL="mysql://myuser:mypassword@localhost:3306/atomatonDB"
MASTER_KEY=your_super_secret_master_key # 32자 이상의 랜덤 문자열

```

### 3. Installation

```bash
# Clone the repository
git clone https://github.com/hyunwoo0081/atomaton.git

# Install dependencies
pnpm install

# Start the server (Development)
pnpm run dev

# Start the server (Production)
pm2 start app.js --name atomation

```

---

## 📋 Automation Flow

1. **Trigger**: Naver 메일 도착 혹은 Webhook 호출.
2. **Filter**: 설정된 규칙(예: 제목에 "결제" 포함) 검증.
3. **Action**: 조건을 만족할 경우 Discord 혹은 Notion으로 데이터 전송.
4. **Logging**: 성공/실패 여부를 저장하고 5xx 에러 발생 시 자동 재시도.

---

## 🛡️ Retry & Rate Limit Policy

* **Retry Strategy**: 5xx 에러 발생 시 최대 5회 재시도 (Exponential Backoff: 1s → 5s → 30s → 2m → 10m).
* **Discord Rate Limit**: Webhook URL당 초당 1~2건 제한을 준수하기 위해 내부 큐 처리.
* **Retention**: 실행 로그는 최근 1000건 혹은 3일간 보관하여 DB 부하 최소화.

---

## 🗺️ Roadmap

* [ ] Regex(정규표현식) 조건식 지원
* [ ] Slack / Microsoft Teams 액션 추가
* [ ] 특정 시간에 실행되는 Schedule 트리거
* [ ] LLM 기반 메일 본문 요약 기능

---

## 📄 License

This project is licensed under the MIT License.

---

**개발자 한마디**

> "복잡한 설정보다 확실한 동작을, 무거운 기능보다 가벼운 운영을 지향합니다."
