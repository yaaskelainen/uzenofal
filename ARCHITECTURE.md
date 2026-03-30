# Message Board (Üzenőfal) Architecture

This project is built using a strict implementation of **Hexagonal Architecture** (also known as Ports & Adapters) combined with **Domain-Driven Design (DDD)** and **SOLID** principles. The goal of this architecture is to ensure that the core business logic is completely isolated from external frameworks, databases, and UI components.

## 1. Core Concepts

The architecture is divided into three primary layers:
1. **Domain Layer**: The heart of the application. Contains business entities and pure logic.
2. **Application/Service Layer**: Orchestrates use cases and delegates to abstract boundaries (Ports).
3. **Infrastructure/Adapter Layer**: Connects the abstracted Ports to external tools (Next.js, Supabase, File System).

### Ports & Adapters
- **Port (`IMessageRepository.ts`)**: An interface defining exactly what the application needs from a database (e.g., `findAll()`, `save()`, `deleteById()`), without specifying *how* those actions are performed.
- **Adapters**: Concrete implementations of the Port.
  - `InMemoryMessageRepository.ts`: Stores messages in a local array. Used for lightning-fast TDD/Unit testing and local development without needing a real database.
  - `SupabaseMessageRepository.ts`: Stores messages via the `@supabase/supabase-js` client. Used in production.

By relying on the Port instead of a specific Database Adapter, the `MessageService` remains database-agnostic. If we ever migrate from Supabase to MongoDB or PostgreSQL natively, the core logic does not change—we simply write a new Adapter.

## 2. Component Breakdown & Data Flow

When a user interacts with the app, the data flows seamlessly through the isolated layers:

```text
[ React Frontend ] (MessageForm / MessageList)
       │
       ▼  (HTTP POST/GET)
[ Next.js API Route ] (src/app/api/messages/route.ts)
       │
       ▼  (Dependency Injection)
[ messageRepositoryFactory ] (Reads DB_ADAPTER env var -> returns selected Adapter)
       │
       ▼  (Method Call)
[ MessageService ] (Business rules: Validates length, formats data)
       │
       ▼  (Delegation via IMessageRepository)
[ Adapter ] (InMemory OR Supabase)
       │
       ▼
[ External Storage ] (Array / Supabase DB)
```

## 3. Key Design Decisions

### 1. Static Import Guards
To prevent junior developers from accidentally coupling the business logic to the database, the test suite includes static **Import Guards**. These tests parse the AST (Abstract Syntax Tree) of the source code and explicitly fail if any file outside of the `factory` or `adapters` folder attempts to import `SupabaseMessageRepository` or `@supabase/supabase-js`.

### 2. Idempotent Auto-Migration
To fulfill the requirement of automatic database readiness, the application utilizes Next.js's native `instrumentation.ts` bootstrap hook.
- When the Node.js server starts, it checks if `POSTGRES_URL` exists and if the adapter is set to `supabase`.
- It dynamically reads `src/db/schema.sql` and executes it.
- The SQL uses `IF NOT EXISTS` and `DO $$ BEGIN ... END $$;` blocks, making it "idempotent" (safe to run repeatedly on every deployment or cold start without breaking existing data).

### 3. Shared Contract Tests (`sharedRepositoryTests.ts`)
To guarantee that `InMemoryMessageRepository` behaves exactly like `SupabaseMessageRepository`, a shared generic test suite asserts interface compliance on both. This guarantees that passing tests locally translate to passing logic in production.

## 4. Security Measures

- **No Client-Side Secrets**: Supabase URL and Anon keys are deliberately kept strictly on the Node.js backend. The frontend Next.js code only queries the `/api` routes. This prevents exposed API keys in the user's browser.
- **XSS Protection**: Instead of sanitizing the raw input on the server, user inputs are stored as-is (enabling tracking of malicious attempts). XSS is mitigated entirely via React's default DOM-text escaping during the render phase in `MessageList`.
- **Validation**: Payload lengths, empty strings, and malformed inputs are strictly rejected by the Domain Error classes inside `MessageService`.

## 5. Folder Structure
```text
src/
├── app/                  # Next.js App Router (UI & API endpoints)
├── components/           # React specialized UI Components
├── config/               # Environment variable validation wrapper
├── db/                   # Raw SQL schema templates
├── features/
│   └── messages/
│       ├── adapters/     # Infrastructure logic (Supabase & InMemory)
│       ├── IMessageRepository.ts
│       ├── IMessageService.ts
│       ├── messageService.ts
│       ├── messageTypes.ts
│       └── messageRepositoryFactory.ts
└── instrumentation.ts    # Application Bootstrap / Auto-Migration
```
