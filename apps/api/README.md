# 🧪 @atomaton/api (Server)

The backend server for the Atomaton automation platform.

## 🏗️ Architecture Role

This app acts as the **Control Plane** and **Execution Engine**. It provides RESTful APIs for the frontend and manages the persistent task queue for workflow executions.

## 🛠️ Key Modules

- **`/controllers`**: REST API handlers for users, workflows, and accounts.
- **`/executors`**: The core logic that traverses workflow nodes and executes actions.
- **`/services`**: Background tasks like IMAP polling and log cleanup.
- **`/middleware`**: JWT authentication and security guards.

## 🚀 Execution Logic

1.  **Trigger**: An event (Webhook/Email) arrives.
2.  **Context**: The engine builds a `WorkflowContext` with the event data.
3.  **Traversal**: The `Executor` follows the defined edges in the UI config.
4.  **Action**: Specialized handlers (Discord, HTTP, Notion) execute with automatic retries.
5.  **Logging**: Every step is recorded in the MySQL database for audit and recovery.

## 🧪 Testing

Run unit tests for the engine:

```bash
npx vitest run
```
