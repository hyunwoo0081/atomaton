# 🎨 @atomaton/web (Client)

The visual dashboard and workflow editor for Atomaton.

## 🏗️ Architecture Role

This app acts as the **User Interface**. It allows users to visually design, monitor, and manage their automation workflows.

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite
- **State Management**: Zustand (Global workflow state)
- **Data Fetching**: Tanstack Query (v5)
- **Visual Editor**: React Flow (Node-based DAG editor)
- **Styling**: Tailwind CSS 4.0

## 📂 Project Structure

- **`/src/pages`**: Main views like Dashboard, Editor, and Login.
- **`/src/store`**: `workflowStore.ts` manages the complex node/edge states.
- **`/src/components/nodes`**: Custom React Flow node definitions (Trigger, Action, Condition).
- **`/tests`**: Playwright E2E tests with API mocking for stable CI.

## 🧪 Testing

Run E2E tests (Mocked API):

```bash
pnpm test:e2e
```
