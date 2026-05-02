# 🏛️ Atomaton AI Constitution

This document defines the foundation rules and architectural mandates for all AI agents working on the `atomaton` repository. Adherence to these rules is mandatory to maintain project integrity and code quality.

---

## 1. Core Principles

### 1.1. Technical Integrity
- **No `any` Types**: Never use `any` in TypeScript. Prefer explicit interface definitions or Prisma-generated types (`@atomaton/db`).
- **Resilience First**: All asynchronous external calls (API, DB, I/O) MUST include retry logic. Use the established 5-attempt exponential backoff pattern found in `executor.ts`.
- **Atomic Updates**: When editing files, provide complete code sections. Never use ellipses (`...`) or placeholders for "unchanged code."

### 1.2. Security Mandates
- **Credential Protection**: Never log or print secrets. Use the `crypto` package for any sensitive data storage.
- **Lazy Key Loading**: Ensure that security-critical modules (like `crypto.ts`) load keys at runtime/call-time to support flexible test environments.

---

## 2. Development Workflow

### 2.1. Test-Driven Development (TDD)
- **Validation Mandate**: A task is NOT complete until all relevant unit tests pass.
- **Execution**: Always run `npx vitest run` after any core logic change.
- **New Features**: Every new trigger or action node MUST be accompanied by a new suite in `apps/api/src/executors/__tests__`.

### 2.2. Architectural Boundaries
- **Engine Logic**: All execution logic resides in `apps/api/src/executors/executor.ts`.
- **Node Definitions**: All configuration schemas reside in `apps/api/src/executors/types.ts`.
- **UI Consistency**: Frontend nodes in `apps/web/src/components/nodes` must align with the backend configuration schemas.

---

## 3. Context Pointers

- **Architecture Map**: Read `docs/DESIGN_CONTEXTS.json` for a machine-readable overview of node types and data flow.
- **Extension Guide**: Use the `atomaton-node-architect` skill when adding new functionality to the workflow engine.

---

*Note: This constitution is self-improving. If you encounter an environmental issue or a recurring bug pattern, propose an amendment to this file to prevent future AI instances from making the same mistake.*
