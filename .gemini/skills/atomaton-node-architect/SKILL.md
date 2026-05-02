---
name: atomaton-node-architect
description: Guide for adding new trigger or action nodes to the Atomaton workflow engine. Use when you need to extend the platform's capabilities with new integration types or logical nodes.
---

# Atomaton Node Architect

## Overview
This skill provides a rigorous multi-step workflow for extending the Atomaton engine. It ensures that new nodes are consistently typed, logically sound, and fully tested.

## Extension Workflow

### 1. Configuration Definition
- **File**: `apps/api/src/executors/types.ts`
- **Action**: Define a new interface for the node's configuration (e.g., `SlackActionConfig`).
- **Standard**: All fields must be explicitly typed. Use optional fields for non-mandatory settings.
- **Integration**: Add the new interface to the `ActionConfig` union type.

### 2. Implementation of Execution Logic
- **File**: `apps/api/src/executors/executor.ts`
- **Action**: Create a new execution function (e.g., `executeSlackAction`).
- **Resilience Mandate**: 
  - Wrap API calls in a loop with 5-attempt exponential backoff.
  - Correctly handle 429 (Rate Limit) and 5xx (Server Error) statuses.
  - Ensure `error.response` is checked before accessing nested properties.
- **Data Injection**: Use `applyTemplate(content, context.data)` for any user-provided text fields.

### 3. Engine Registration
- **File**: `apps/api/src/executors/executor.ts`
- **Action**: Add a new `case` to the `switch (node.type)` block inside `executeWorkflow`.
- **Logic**: 
  - Call the execution function.
  - If successful and relevant, merge results into `currentContext.data`.
  - Handle logging via `prisma.log.create`.

### 4. Unit Testing
- **File**: `apps/api/src/executors/__tests__/[node_name].spec.ts`
- **Requirements**:
  - Mock external dependencies using `vi.mock`.
  - Use `vi.useFakeTimers()` to verify retry logic without waiting.
  - Test at least 2 normal cases and 2 edge cases (e.g., API failure, missing config).

## Reference
- See `docs/DESIGN_CONTEXTS.json` for current node types and context structure.
- Adhere to `GEMINI.md` for coding standards and security protocols.
