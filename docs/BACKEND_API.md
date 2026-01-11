# Backend API Documentation

This document provides an overview of the Express.js backend server located in `apps/api`. It outlines the available API endpoints and background services currently implemented.

## Base URL
The server runs on port `3000` by default (or `PORT` env variable).
Base URL: `http://localhost:3000`

## API Endpoints

### 1. Authentication (`/auth`)
Handles user registration and login.

- **POST** `/auth/register`
  - Registers a new user.
  - Body: `{ email, password, is_developer (optional) }`
- **POST** `/auth/login`
  - Authenticates a user and returns a JWT token.
  - Body: `{ email, password }`

### 2. Workflows (`/workflows`)
Manages automation workflows. All endpoints require authentication (Bearer Token).

- **POST** `/workflows`
  - Create a new workflow.
  - Body: `{ name }`
- **GET** `/workflows`
  - Retrieve all workflows for the authenticated user.
- **GET** `/workflows/:id`
  - Retrieve a specific workflow by ID.
- **PUT** `/workflows/:id`
  - Update an existing workflow.
  - Body: `{ name, is_active }`
- **DELETE** `/workflows/:id`
  - Delete a workflow.

### 3. Accounts (`/accounts`)
Manages connected accounts (integrations). All endpoints require authentication (Bearer Token).

- **POST** `/accounts`
  - Create/Connect a new account.
  - Body: `{ type, config }`
  - Note: Passwords for `NAVER_IMAP` accounts are encrypted before storage.
- **GET** `/accounts`
  - List all connected accounts.
- **GET** `/accounts/:id`
  - Get details of a specific account.
- **PUT** `/accounts/:id`
  - Update account details.
  - Body: `{ type, config }`
  - Note: Updating an IMAP account restarts its polling service.
- **DELETE** `/accounts/:id`
  - Remove an account and stop any associated polling.

### 4. Webhooks (`/webhook`)
External entry points for triggering workflows.

- **POST** `/webhook/:accountId/:triggerId`
  - Triggers a workflow execution based on the account ID and trigger ID.
  - Headers: `Authorization: Bearer {API_KEY}` (API Key stored in trigger config).
  - Body: JSON payload (passed as workflow data).

### 5. Logs (`/logs`)
Retrieves execution logs. Requires authentication.

- **GET** `/logs`
  - Retrieve logs with pagination.
  - Query Params: `workflowId` (optional), `page` (default 1), `limit` (default 25).

### 6. Miscellaneous
- **GET** `/`
  - Health check. Returns "Atomaton API is running!".
- **GET** `/protected`
  - Test endpoint to verify authentication. Returns user details.

## Background Services

The backend also includes background processes initialized in `index.ts` and `services/`:

- **Workflow Executor** (`executors/executor.ts`):
  - Configured to process the workflow queue (`setProcessor(executeWorkflow)`).
  - Executes workflows based on triggers and actions.
  - Supports **Discord Webhook** actions with rate limiting and retries.
  - Supports **Notion Page** actions (currently simulated).
  - Evaluates trigger rules (e.g., for IMAP polling) before executing actions.
  - Logs execution status (SUCCESS, FAILURE, SKIPPED) to the database.

- **In-Memory Queue** (`executors/queue.ts`):
  - Simple in-memory queue for managing workflow executions.
  - Processes items sequentially.

- **Log Cleanup**:
  - A scheduled job runs every 24 hours to clean up old logs (`cleanupOldLogs`).

- **IMAP Polling Service** (`services/imapPolling.ts`):
  - Handles polling of IMAP email accounts (specifically Naver IMAP) to trigger workflows upon receiving new emails.
  - Supports exponential backoff for connection retries.
  - Manages polling intervals per account.
