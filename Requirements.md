# Requirements: Message Board (Üzenőfal) Web Application

---

## 1. High-Level Requirements

### HLR-1 — Public Accessibility
The application must be publicly accessible via a hosted URL without any authentication or login requirement.

### HLR-2 — Message Submission
Users must be able to compose and submit a short text message through a text input field and a dedicated save/submit button.

### HLR-3 — Persistent Storage
All submitted messages must be durably persisted in a cloud database (Supabase) so they survive page reloads and server restarts.

### HLR-4 — Message Listing
The application must display all previously saved messages, sorted in reverse chronological order (newest first), retrieved directly from the database.

### HLR-5 — Message Deletion
Each listed message must be individually deletable via a dedicated delete button visible next to or on the message item. Deletion must be reflected immediately in the UI.

### HLR-6 — Hosting & Deployment
The application must be deployable and hosted on Vercel (free tier), integrated with a GitHub repository for CI/CD.

### HLR-7 — Technology Stack Constraints
- **Frontend & Backend**: Next.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (free tier)
- **Version Control**: GitHub

### HLR-8 — Interchangeable Database Backend
The application's business logic must be fully decoupled from the database technology. Switching from Supabase to any other data store (e.g., PostgreSQL via Prisma, MongoDB, an in-memory store, a REST API, etc.) must require **no changes** to the service layer, API routes, or UI. Only a new database adapter and its wiring need to be added.

---

## 2. Technical Requirements

### 2.1 Stack & Project Structure

#### TR-STACK-1 — Framework
Use **Next.js (latest stable)** with the **App Router** and **TypeScript** (strict mode enabled).

#### TR-STACK-2 — Package Manager
Use `npm` or `pnpm` (declare explicitly in `package.json`).

#### TR-STACK-3 — Folder Structure (SOLID / Clean Code / Adapter Pattern)
Organize the project so each backend concern is isolated. The database layer follows the **Ports & Adapters (Hexagonal)** pattern: the domain defines a port (interface), concrete adapters implement it, and a factory wires the chosen adapter at runtime.

```
/src
  /app                                    # Next.js App Router pages & layouts
    /page.tsx                             # Root page (message board UI)
    /layout.tsx                           # Root layout
    /api
      /messages
        /route.ts                         # REST API: GET (list) + POST (create)
        /[id]
          /route.ts                       # REST API: DELETE (single message)

  /components                             # Reusable UI components
    /MessageForm.tsx
    /MessageList.tsx
    /MessageItem.tsx

  /features
    /messages                             # Isolated message domain (extractable)
      /messageTypes.ts                    # Domain types: Message, CreateMessageInput, error classes
      /IMessageRepository.ts             # PORT — database-agnostic contract
      /IMessageService.ts                # Service interface
      /messageService.ts                 # Business logic — depends only on IMessageRepository
      /adapters
        /supabase
          /supabaseMessageRepository.ts  # ADAPTER — Supabase implementation
          /supabaseClient.ts             # Supabase client singleton (scoped here)
        /inMemory
          /inMemoryMessageRepository.ts  # ADAPTER — in-memory (for tests / local dev)
      /messageRepositoryFactory.ts       # FACTORY — selects & wires the active adapter

  /config
    /env.ts                              # Typed, validated environment variable access
```

> **Rationale**: `IMessageRepository` is the **port** — the only contract the service layer knows about. Each folder under `/adapters` is a self-contained **adapter**. `messageRepositoryFactory.ts` reads configuration (e.g., env var `DB_ADAPTER=supabase|inMemory`) and returns the correct implementation. Adding a new database (e.g., Prisma/PostgreSQL, MongoDB) means adding a new folder under `/adapters` with zero changes to service, API, or UI layers.

---

### 2.2 Database (Supabase)

#### TR-DB-1 — Table Schema
Create a single table named `messages` in the Supabase PostgreSQL database:

| Column       | Type          | Constraints                              |
|--------------|---------------|------------------------------------------|
| `id`         | `uuid`        | Primary Key, default `gen_random_uuid()` |
| `content`    | `text`        | NOT NULL                                 |
| `created_at` | `timestamptz` | NOT NULL, default `now()`                |

#### TR-DB-2 — Row Level Security (RLS)
- Enable RLS on the `messages` table.
- Since the app is public (no auth), create explicit policies:
  - **SELECT**: Allow all (`true`)
  - **INSERT**: Allow all (`true`)
  - **DELETE**: Allow all (`true`)
- **Note**: These are intentionally permissive for a public board; document as a known trade-off.

#### TR-DB-3 — Index
Add an index on `created_at DESC` to support fast ordered retrieval.

---

### 2.3 Environment Configuration

#### TR-ENV-1 — Environment Variables
The following environment variables must be defined (via `.env.local` locally and Vercel environment settings in production):

| Variable                         | Description                         |
|----------------------------------|-------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase anonymous (public) API key |
| `DB_ADAPTER`                     | Active adapter: `supabase` (default) or `inMemory` |

#### TR-ENV-2 — Typed Config Module
Access environment variables only via `/src/config/env.ts`, which validates presence at startup and throws a descriptive error if a required variable is missing.

---

### 2.4 API Layer (Next.js Route Handlers)

#### TR-API-1 — List Messages
- **Endpoint**: `GET /api/messages`
- **Response**: `200 OK` with JSON array of messages ordered by `created_at DESC`
- **Response body**:
  ```json
  [
    { "id": "uuid", "content": "string", "created_at": "ISO8601" }
  ]
  ```

#### TR-API-2 — Create Message
- **Endpoint**: `POST /api/messages`
- **Request body**: `{ "content": "string" }`
- **Validation**: `content` must be a non-empty string, max 1000 characters
- **Response**: `201 Created` with the created message object
- **Error**: `400 Bad Request` if validation fails

#### TR-API-3 — Delete Message
- **Endpoint**: `DELETE /api/messages/[id]`
- **Response**: `204 No Content` on success
- **Error**: `404 Not Found` if message with given `id` does not exist
- **Error**: `400 Bad Request` if `id` is not a valid UUID format

#### TR-API-4 — Error Handling
All API routes must return structured JSON error responses:
```json
{ "error": "Human-readable error message" }
```

API routes are thin orchestrators only: they call the factory, inject the repository into the service, delegate work to the service, and map the result to an HTTP response. No business logic lives here.

---

### 2.5 Business Logic (Service Layer)

#### TR-SVC-1 — Service Interface
Define an `IMessageService` TypeScript interface in `/features/messages/IMessageService.ts` with methods:
- `getMessages(): Promise<Message[]>`
- `createMessage(content: string): Promise<Message>`
- `deleteMessage(id: string): Promise<void>`

#### TR-SVC-2 — Service Implementation
`MessageService` implements `IMessageService`. Its constructor receives an `IMessageRepository` instance via **constructor injection** (Dependency Inversion Principle). It must never import or reference any concrete adapter (e.g., Supabase) directly.

#### TR-SVC-3 — Validation in Service
Input validation (content length, non-empty check) is performed in the service layer **only** — not in the route handler, not in the repository, and not in the adapter.

---

### 2.6 Repository Layer — Adapter Pattern

#### TR-REPO-1 — Port (IMessageRepository)
Define the `IMessageRepository` TypeScript interface in `/features/messages/IMessageRepository.ts`. This is the **only** contract between the service layer and any database. The interface must be database-agnostic — no Supabase types, no SQL, no HTTP specifics:

```typescript
import { Message } from './messageTypes';

export interface IMessageRepository {
  findAll(): Promise<Message[]>;            // ordered newest-first
  save(content: string): Promise<Message>;  // persists and returns the new record
  deleteById(id: string): Promise<void>;    // throws NotFoundError if not found
}
```

#### TR-REPO-2 — Supabase Adapter
`SupabaseMessageRepository` in `/adapters/supabase/supabaseMessageRepository.ts` implements `IMessageRepository` using the Supabase JS client. It is the **only** file allowed to import or use Supabase APIs. Responsibilities:
- Initialise the Supabase client (via the scoped `supabaseClient.ts`)
- Map Supabase response objects to the domain `Message` type
- Translate Supabase errors into domain-layer errors (`NotFoundError`, `RepositoryError`)

#### TR-REPO-3 — In-Memory Adapter
`InMemoryMessageRepository` in `/adapters/inMemory/inMemoryMessageRepository.ts` implements `IMessageRepository` using a plain in-memory array. Usage:
- Default adapter for **unit tests** (no real database connection needed)
- Optional fast local development mode (set `DB_ADAPTER=inMemory`)

#### TR-REPO-4 — Repository Factory (Wiring)
`messageRepositoryFactory.ts` is the **single wiring point**. It reads `DB_ADAPTER` and returns the correct `IMessageRepository` implementation:

```typescript
import { IMessageRepository } from './IMessageRepository';
import { SupabaseMessageRepository } from './adapters/supabase/supabaseMessageRepository';
import { InMemoryMessageRepository } from './adapters/inMemory/inMemoryMessageRepository';

export function createMessageRepository(): IMessageRepository {
  const adapter = process.env.DB_ADAPTER ?? 'supabase';
  switch (adapter) {
    case 'inMemory': return new InMemoryMessageRepository();
    case 'supabase':
    default:         return new SupabaseMessageRepository();
  }
}
```

No other file outside the factory may instantiate a concrete repository class.

#### TR-REPO-5 — Domain Error Types
Define shared domain error classes in `messageTypes.ts`:
- `NotFoundError` — thrown by adapters when a record cannot be found
- `RepositoryError` — thrown by adapters for unexpected database failures
- `ValidationError` — thrown by the service layer for invalid input

Adapters must translate all database-specific errors into one of these domain errors before they propagate upward. The service layer catches only domain errors, never driver-specific ones.

#### TR-REPO-6 — No Adapter Leakage Rule *(Hard Constraint)*
Enforced by code review:
- `messageService.ts` must **NOT** import anything from `/adapters/`
- API routes must **NOT** import anything from `/adapters/` directly
- Only `messageRepositoryFactory.ts` may import concrete adapter classes

---

### 2.7 Frontend / UI

#### TR-UI-1 — Message Input Form
- A clearly labelled text area for message composition
- A "Save" / "Mentés" button to submit the message
- The submit button must be disabled while a submission is in progress (loading state)
- After successful submission: clear the input field and refresh the message list
- On error: display a user-friendly inline error message

#### TR-UI-2 — Message List
- Display all messages fetched from `GET /api/messages`
- Sorted newest first (handled server-side; no client-side re-sorting required)
- Each message item displays:
  - The message text content
  - The formatted creation timestamp (locale-aware, human-readable format)
  - A "Delete" / "Törlés" button

#### TR-UI-3 — Delete Interaction
- Clicking the delete button sends `DELETE /api/messages/[id]`
- Show a loading/disabled state on the button while deletion is in progress
- On success: remove the item from the list immediately
- On error: display a user-friendly error message

#### TR-UI-4 — Styling
- Use vanilla CSS or Next.js CSS Modules (no external CSS framework required)
- Simple, clean, readable design suitable for a casual user
- Responsive layout (usable on both mobile and desktop)
- Accessible: meaningful button labels, proper semantic HTML (`<form>`, `<ul>`, `<li>`, `<button>`)

#### TR-UI-5 — Initial Data Load
The message list is fetched on page load. A loading indicator must be shown while data is being fetched. Errors during load must be surfaced to the user.

---

### 2.8 Non-Functional Requirements

#### TR-NFR-1 — Performance
- Page load (LCP) should be under 3 seconds on average hardware and connection
- Message list fetch must complete within 2 seconds under normal Supabase free-tier conditions

#### TR-NFR-2 — Reliability
- API routes must handle all adapter errors gracefully and return appropriate HTTP status codes
- No unhandled promise rejections in production

#### TR-NFR-3 — Security (Basic)
- No server secrets exposed on the client (only `NEXT_PUBLIC_*` Supabase anon key, which is by design public)
- Message content rendered as plain text — never via `innerHTML` (XSS prevention)
- No user authentication required; intentionally open board (documented trade-off)

#### TR-NFR-4 — Maintainability
- TypeScript strict mode enabled
- All functions/methods have a single, clear responsibility (SRP)
- No business logic in React components
- No database access outside the adapter classes

#### TR-NFR-5 — Deployability
- Must deploy successfully on Vercel free tier without custom server configuration
- `vercel.json` or Next.js config must not require any paid Vercel features

---

### 2.9 Testing

#### TR-TEST-1 — Unit Tests (Service Layer)
Unit tests for `messageService.ts` using a mocked `InMemoryMessageRepository` (no real DB):
- Valid message creation returns a `Message` object
- Empty content throws `ValidationError`
- Content exceeding 1000 characters throws `ValidationError`
- Deleting an existing message succeeds
- Deleting a non-existent message throws `NotFoundError`

#### TR-TEST-2 — Unit Tests (Adapters)
Unit tests for `InMemoryMessageRepository`:
- `findAll()` returns messages in descending order
- `save()` persists and returns a new message
- `deleteById()` removes a message successfully
- `deleteById()` throws `NotFoundError` for unknown id

#### TR-TEST-3 — Integration / API Tests *(Optional for MVP)*
Basic happy-path smoke tests for each API route using Next.js test utilities.

#### TR-TEST-4 — E2E Tests *(Out of scope for MVP)*
End-to-end tests (e.g., Playwright/Cypress) are out of scope for the initial MVP but the architecture must not block their future addition.

---

### 2.10 Version Control & CI/CD

#### TR-VCS-1 — GitHub Repository
The project must be hosted in a GitHub repository with:
- `.gitignore` excluding `.env.local` and `node_modules`
- A `README.md` with local setup instructions and environment variable documentation

#### TR-VCS-2 — Vercel Integration
- Connect the GitHub repository to Vercel for automatic deployments on push to `main`
- All required environment variables set in the Vercel project dashboard

---

## 3. Dependency Flow Diagram

```
[UI Components]
      │ fetch / mutate via HTTP
      ▼
[API Route Handlers]  ──creates──▶  [messageRepositoryFactory]
      │ injects IMessageRepository          │ returns concrete adapter
      │                                     ▼
      │                         [IMessageRepository]  ◀── PORT (interface)
      │                         ┌───────────┴──────────────────────┐
      │                         │                                  │
      │              [SupabaseMessageRepository]    [InMemoryMessageRepository]
      │              (Adapter: Supabase)            (Adapter: in-memory / tests)
      │
      ▼
[MessageService]  ──depends on──▶  [IMessageRepository]  (injected, never concrete)
```

> **Key invariant**: No arrow points from `MessageService` or API route handlers toward any concrete adapter class. Only the factory is permitted to cross that boundary.

---

## 4. Adding a New Database (How-to)

To replace or add a new database backend in the future:

1. Create `/src/features/messages/adapters/<newDb>/` folder.
2. Implement `IMessageRepository` in a new class (e.g., `PrismaMessageRepository`).
3. Translate all DB-specific errors to domain errors (`NotFoundError`, `RepositoryError`).
4. Add a new `case` to `messageRepositoryFactory.ts`.
5. Set `DB_ADAPTER=<newDb>` in the environment.

**Zero changes** required in: service layer, API routes, components, tests (except adapter-specific tests).

---

## 5. Known Trade-offs & Risks

| Area               | Trade-off / Risk                                                                          |
|--------------------|-------------------------------------------------------------------------------------------|
| Security           | No authentication → anyone can post or delete messages (intentionally open)              |
| Scalability        | Supabase free tier has request rate limits; not suitable for high-traffic production      |
| Data Validation    | Length enforced at service layer only; adapters may optionally add DB-level constraints   |
| RLS Policies       | Fully open RLS policies; acceptable for demo, must be revisited for production            |
| Hosting            | Vercel free tier has cold-start latency on serverless functions                           |
| Adapter Complexity | Slightly more files than a naïve single-file approach; justified by full DB portability   |
