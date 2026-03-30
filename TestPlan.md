# Test Plan: Message Board (Üzenőfal) — TDD Approach

---

## 0. TDD Philosophy & Process

This project follows the **Red → Green → Refactor** cycle strictly:

1. **Red** — Write a failing test that describes the desired behaviour. The test must fail because the production code does not exist yet.
2. **Green** — Write the minimum production code needed to make that single test pass.
3. **Refactor** — Clean up code without breaking any passing test.

> **Rule**: No production code is written unless a failing test drives it. Every failing test must be committed before the implementation that makes it green.

### Test tool choices

| Tool | Purpose |
|---|---|
| **Jest** | Test runner, assertion library, mocking framework |
| **ts-jest** | TypeScript support in Jest |
| **@testing-library/react** | Component rendering & interaction |
| **@testing-library/user-event** | Simulates real user interactions |
| **@testing-library/jest-dom** | Custom DOM matchers |
| **msw** (Mock Service Worker) | Intercepts `fetch` in component/integration tests |
| **jest-environment-jsdom** | DOM environment for React component tests |

### Coverage target

- **Domain types / error classes**: 100 %
- **InMemoryMessageRepository**: 100 %
- **MessageService**: 100 %
- **messageRepositoryFactory**: 100 %
- **env config**: 100 %
- **API route handlers**: ≥ 95 % (excluding Next.js internals)
- **React components**: ≥ 90 % (statements + branches)
- **SupabaseMessageRepository**: ≥ 80 % (remainder covered by integration tests, mocked Supabase client)

---

## 1. Test Suite Map

```
__tests__/
  unit/
    domain/
      messageTypes.test.ts             # Error class hierarchy
    config/
      env.test.ts                      # Env config validation
    adapters/
      inMemoryMessageRepository.test.ts
      supabaseMessageRepository.test.ts
    service/
      messageService.test.ts
    factory/
      messageRepositoryFactory.test.ts
  integration/
    api/
      messages.GET.test.ts
      messages.POST.test.ts
      messages.[id].DELETE.test.ts
  component/
    MessageForm.test.tsx
    MessageList.test.tsx
    MessageItem.test.tsx
```

---

## 2. Unit Tests — Domain Types (`messageTypes.test.ts`)

**Requirements covered**: TR-REPO-5

### 2.1 ValidationError

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-DOM-01 | `ValidationError` is an instance of `Error` | Red → Green | `instanceof Error === true` |
| TU-DOM-02 | `ValidationError` carries the provided message | Red → Green | `error.message === 'provided message'` |
| TU-DOM-03 | `ValidationError` has name `"ValidationError"` | Red → Green | `error.name === 'ValidationError'` |
| TU-DOM-04 | `ValidationError` is distinguishable from `NotFoundError` | Red → Green | `error instanceof NotFoundError === false` |

### 2.2 NotFoundError

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-DOM-05 | `NotFoundError` is an instance of `Error` | Red → Green | `instanceof Error === true` |
| TU-DOM-06 | `NotFoundError` carries the provided message | Red → Green | `error.message === 'provided message'` |
| TU-DOM-07 | `NotFoundError` has name `"NotFoundError"` | Red → Green | `error.name === 'NotFoundError'` |
| TU-DOM-08 | `NotFoundError` is distinguishable from `ValidationError` | Red → Green | `error instanceof ValidationError === false` |

### 2.3 RepositoryError

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-DOM-09 | `RepositoryError` is an instance of `Error` | Red → Green | `instanceof Error === true` |
| TU-DOM-10 | `RepositoryError` carries the provided message | Red → Green | `error.message === 'provided message'` |
| TU-DOM-11 | `RepositoryError` wraps an optional cause | Red → Green | `error.cause === originalError` |
| TU-DOM-12 | `RepositoryError` has name `"RepositoryError"` | Red → Green | `error.name === 'RepositoryError'` |

---

## 3. Unit Tests — InMemoryMessageRepository (`inMemoryMessageRepository.test.ts`)

**Requirements covered**: TR-REPO-1, TR-REPO-3, TR-TEST-2

### 3.1 `findAll()`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-INMEM-01 | Returns empty array when store is empty | Red → Green | `[]` |
| TU-INMEM-02 | Returns all saved messages | Red → Green | Array length equals saved count |
| TU-INMEM-03 | Returns messages in descending `created_at` order (newest first) | Red → Green | First element has the latest timestamp |
| TU-INMEM-04 | Returns a copy — mutating result does not affect the store | Red → Green | Store size unchanged after external mutation |
| TU-INMEM-05 | **Performance**: `findAll()` with 10,000 items completes in < 100 ms | Red → Green | `jest.setTimeout` + `Date.now()` assertion |

### 4.2 `save(content)`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-INMEM-06 | Returns a `Message` object with `id`, `content`, `created_at` | Red → Green | All fields present and typed |
| TU-INMEM-07 | Persisted message is retrievable via `findAll()` | Red → Green | `findAll()` after save includes the new message |
| TU-INMEM-08 | Generated `id` is a valid UUID v4 | Red → Green | Matches UUID regex |
| TU-INMEM-09 | `created_at` is a valid ISO 8601 timestamp | Red → Green | `new Date(created_at)` is not `NaN` |
| TU-INMEM-10 | Each saved message receives a unique `id` | Red → Green | 100 saves → 100 unique IDs |
| TU-INMEM-11 | Saves the exact content without modification | Red → Green | `result.content === input` |
| TU-INMEM-12 | **Extreme**: Saves content of exactly 1000 characters (boundary) | Red → Green | Message stored successfully |
| TU-INMEM-13 | **Extreme**: Saves an empty string (adapter has no validation concern) | Red → Green | Message stored (validation is service's responsibility) |
| TU-INMEM-14 | **Security**: Content containing HTML/script tags is stored as-is (no sanitisation at adapter level) | Red → Green | `result.content === '<script>alert(1)</script>'` |

### 4.3 `deleteById(id)`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-INMEM-15 | Resolves without error for an existing id | Red → Green | `Promise<void>` resolves |
| TU-INMEM-16 | Message is no longer returned by `findAll()` after deletion | Red → Green | Array does not contain the deleted id |
| TU-INMEM-17 | Throws `NotFoundError` for a non-existent id | Red → Green | `await expect(...).rejects.toBeInstanceOf(NotFoundError)` |
| TU-INMEM-18 | Throws `NotFoundError` for an empty-string id | Red → Green | Same as above |
| TU-INMEM-19 | Throws `NotFoundError` for a syntactically valid UUID that was never saved | Red → Green | `NotFoundError` |
| TU-INMEM-20 | Deleting does not affect other messages in the store | Red → Green | Count decrements by exactly 1 |
| TU-INMEM-21 | **Extreme**: Deleting the same id twice throws `NotFoundError` on second call | Red → Green | Second call rejects |

---

## 5. Unit Tests — SupabaseMessageRepository (`supabaseMessageRepository.test.ts`)

**Requirements covered**: TR-REPO-2

> **Strategy**: The Supabase JS client is mocked at the module level using `jest.mock`. No real network calls are made.

### 5.1 `findAll()`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-SUPA-01 | Calls Supabase with correct table, column order, and direction | Red → Green | Mock called with `order('created_at', { ascending: false })` |
| TU-SUPA-02 | Maps Supabase rows to domain `Message` objects | Red → Green | Result matches the `Message` interface shape |
| TU-SUPA-03 | Returns empty array when Supabase returns no rows | Red → Green | `[]` |
| TU-SUPA-04 | Throws `RepositoryError` when Supabase returns an error | Red → Green | `rejects.toBeInstanceOf(RepositoryError)` |
| TU-SUPA-05 | `RepositoryError` wraps the original Supabase error as `.cause` | Red → Green | `error.cause` is the Supabase error object |

### 5.2 `save(content)`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-SUPA-06 | Calls Supabase `insert` with the correct payload | Red → Green | Mock called with `{ content }` |
| TU-SUPA-07 | Returns the created `Message` row mapped to the domain type | Red → Green | Result matches `Message` interface |
| TU-SUPA-08 | Throws `RepositoryError` on Supabase insert error | Red → Green | `rejects.toBeInstanceOf(RepositoryError)` |
| TU-SUPA-09 | Throws `RepositoryError` when Supabase returns null/empty data | Red → Green | `rejects.toBeInstanceOf(RepositoryError)` |

### 5.3 `deleteById(id)`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-SUPA-10 | Calls Supabase `delete` with correct `eq('id', id)` filter | Red → Green | Mock called with correct filter |
| TU-SUPA-11 | Resolves without error when Supabase reports 1 row affected | Red → Green | `Promise<void>` resolves |
| TU-SUPA-12 | Throws `NotFoundError` when Supabase reports 0 rows affected | Red → Green | `rejects.toBeInstanceOf(NotFoundError)` |
| TU-SUPA-13 | Throws `RepositoryError` on Supabase delete error | Red → Green | `rejects.toBeInstanceOf(RepositoryError)` |

---

## 6. Unit Tests — MessageRepositoryFactory (`messageRepositoryFactory.test.ts`)

**Requirements covered**: TR-REPO-4, TR-ENV-1

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-FAC-01 | Returns `SupabaseMessageRepository` when `DB_ADAPTER=supabase` | Red → Green | `instanceof SupabaseMessageRepository` |
| TU-FAC-02 | Returns `SupabaseMessageRepository` when `DB_ADAPTER` is not set (default) | Red → Green | `instanceof SupabaseMessageRepository` |
| TU-FAC-03 | Returns `InMemoryMessageRepository` when `DB_ADAPTER=inMemory` | Red → Green | `instanceof InMemoryMessageRepository` |
| TU-FAC-04 | Returns `SupabaseMessageRepository` for unknown `DB_ADAPTER` values (default fallback) | Red → Green | `instanceof SupabaseMessageRepository` |
| TU-FAC-05 | Returned object satisfies the `IMessageRepository` interface (has `findAll`, `save`, `deleteById`) | Red → Green | All three methods are functions |

---

## 7. Unit Tests — MessageService (`messageService.test.ts`)

**Requirements covered**: TR-SVC-1, TR-SVC-2, TR-SVC-3, TR-REPO-5, TR-TEST-1

> **Strategy**: `MessageService` is constructed with a fresh `InMemoryMessageRepository` instance before each test. No mocking framework needed — the in-memory adapter IS the test double.

### 7.1 `getMessages()`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-SVC-01 | Returns empty array when no messages exist | Red → Green | `[]` |
| TU-SVC-02 | Returns all messages ordered newest first | Red → Green | First item has the latest `created_at` |
| TU-SVC-03 | Propagates `RepositoryError` from the repository | Red → Green | `rejects.toBeInstanceOf(RepositoryError)` |

### 7.2 `createMessage(content)`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-SVC-04 | Returns a `Message` with `id`, `content`, `created_at` | Red → Green | All fields present |
| TU-SVC-05 | Persisted message appears in subsequent `getMessages()` | Red → Green | `getMessages()` includes new message |
| TU-SVC-06 | Throws `ValidationError` for empty string `""` | Red → Green | `rejects.toBeInstanceOf(ValidationError)` |
| TU-SVC-07 | Throws `ValidationError` for whitespace-only string `"   "` | Red → Green | `rejects.toBeInstanceOf(ValidationError)` |
| TU-SVC-08 | Throws `ValidationError` for content of 1001 characters | Red → Green | `rejects.toBeInstanceOf(ValidationError)` |
| TU-SVC-09 | Accepts content of exactly 1000 characters (boundary, valid) | Red → Green | Resolves with a `Message` |
| TU-SVC-10 | Accepts content of exactly 1 character (boundary, valid) | Red → Green | Resolves with a `Message` |
| TU-SVC-11 | Throws `ValidationError` for `null` input | Red → Green | `rejects.toBeInstanceOf(ValidationError)` |
| TU-SVC-12 | Throws `ValidationError` for `undefined` input | Red → Green | `rejects.toBeInstanceOf(ValidationError)` |
| TU-SVC-13 | **Security**: Accepts content with HTML/script tags (no sanitisation at this layer) | Red → Green | Stored as-is; rendering is the UI's concern |
| TU-SVC-14 | **Security**: Accepts SQL-injection-like strings without modification | Red → Green | `content` preserved exactly |
| TU-SVC-15 | **Extreme**: Creating 1000 messages concurrently all succeed | Red → Green | `Promise.all` resolves, `getMessages()` length = 1000 |
| TU-SVC-16 | Propagates `RepositoryError` from the repository | Red → Green | `rejects.toBeInstanceOf(RepositoryError)` |

### 7.3 `deleteMessage(id)`

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TU-SVC-17 | Resolves for an existing message id | Red → Green | `Promise<void>` resolves |
| TU-SVC-18 | Message is absent from `getMessages()` after deletion | Red → Green | Array does not include deleted id |
| TU-SVC-19 | Propagates `NotFoundError` for a non-existent id | Red → Green | `rejects.toBeInstanceOf(NotFoundError)` |
| TU-SVC-20 | Propagates `NotFoundError` for an empty-string id | Red → Green | `rejects.toBeInstanceOf(NotFoundError)` |
| TU-SVC-21 | Propagates `RepositoryError` from the repository | Red → Green | `rejects.toBeInstanceOf(RepositoryError)` |
| TU-SVC-22 | **Extreme**: Deleting all messages one by one leaves empty list | Red → Green | `getMessages()` returns `[]` |

---

## 8. Integration Tests — API Routes

**Requirements covered**: TR-API-1, TR-API-2, TR-API-3, TR-API-4, TR-NFR-2, TR-NFR-3

> **Strategy**: Import route handler functions directly. Inject `InMemoryMessageRepository` (via `DB_ADAPTER=inMemory` env override) so tests are self-contained and fast. Use Next.js `NextRequest` for building test requests.

### 8.1 `GET /api/messages` (`messages.GET.test.ts`)

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TI-GET-01 | Returns `200 OK` with an empty array when no messages exist | Red → Green | `status=200`, body=`[]` |
| TI-GET-02 | Returns `200 OK` with all messages, newest first | Red → Green | Array ordered by `created_at DESC` |
| TI-GET-03 | Response body is valid JSON | Red → Green | `JSON.parse(body)` does not throw |
| TI-GET-04 | Each message object has `id`, `content`, `created_at` fields | Red → Green | Schema check on each item |
| TI-GET-05 | Returns `500` with `{ error: "..." }` when repository throws `RepositoryError` | Red → Green | `status=500`, body has `error` key |
| TI-GET-06 | **Performance**: Response time with 500 messages < 200 ms | Red → Green | `Date.now()` delta assertion |

### 8.2 `POST /api/messages` (`messages.POST.test.ts`)

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TI-POST-01 | Returns `201 Created` with the new message object | Red → Green | `status=201`, body has `id`, `content`, `created_at` |
| TI-POST-02 | Returns `400` for empty `content` field | Red → Green | `status=400`, body has `error` key |
| TI-POST-03 | Returns `400` for whitespace-only `content` | Red → Green | `status=400` |
| TI-POST-04 | Returns `400` for content exceeding 1000 characters | Red → Green | `status=400` |
| TI-POST-05 | Returns `400` when `content` field is missing from request body | Red → Green | `status=400` |
| TI-POST-06 | Returns `400` for non-string `content` (e.g., number, array) | Red → Green | `status=400` |
| TI-POST-07 | Returns `400` for completely empty request body | Red → Green | `status=400` |
| TI-POST-08 | Returns `400` for malformed JSON body | Red → Green | `status=400` |
| TI-POST-09 | Returns `500` when repository throws `RepositoryError` | Red → Green | `status=500`, `error` key present |
| TI-POST-10 | **Security**: `content` with XSS payload is stored and returned as-is (not executed) | Red → Green | `response.content === '<script>alert(1)</script>'` |
| TI-POST-11 | **Security**: Request with extra fields beyond `content` does not cause an error | Red → Green | Extra fields ignored, `201` returned |

### 8.3 `DELETE /api/messages/[id]` (`messages.[id].DELETE.test.ts`)

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TI-DEL-01 | Returns `204 No Content` for an existing message id | Red → Green | `status=204`, no body |
| TI-DEL-02 | Returns `404` for a valid UUID that does not exist | Red → Green | `status=404`, `error` key present |
| TI-DEL-03 | Returns `400` for a non-UUID `id` parameter (e.g., `"abc"`) | Red → Green | `status=400` |
| TI-DEL-04 | Returns `400` for an empty `id` parameter | Red → Green | `status=400` |
| TI-DEL-05 | Returns `500` when repository throws `RepositoryError` | Red → Green | `status=500`, `error` key present |
| TI-DEL-06 | Message is not retrievable via `GET` after successful deletion | Red → Green | Subsequent GET body does not include deleted id |
| TI-DEL-07 | **Security**: ID path traversal attempt (e.g., `"../secret"`) returns `400` | Red → Green | `status=400` |

---

## 9. Component Tests

**Requirements covered**: TR-UI-1 through TR-UI-5, TR-NFR-3

> **Strategy**: Render components using `@testing-library/react`. Mock `fetch` using `msw` handlers or `jest.spyOn(global, 'fetch')`. Test through the public interface (what the user sees and does), not implementation details.

### 9.1 `MessageForm` (`MessageForm.test.tsx`)

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TC-FORM-01 | Renders a labelled textarea | Red → Green | `getByRole('textbox')` is in the document |
| TC-FORM-02 | Renders a "Mentés" / Save button | Red → Green | `getByRole('button', { name: /ment[eé]s/i })` present |
| TC-FORM-03 | Submit button is disabled when textarea is empty | Red → Green | `button.disabled === true` |
| TC-FORM-04 | Submit button is enabled when textarea has content | Red → Green | `button.disabled === false` |
| TC-FORM-05 | Submit button is disabled while submission is in progress | Red → Green | Loading state: button disabled during pending `fetch` |
| TC-FORM-06 | Textarea is cleared after successful submission | Red → Green | `textarea.value === ''` after success |
| TC-FORM-07 | `onSuccess` callback is called after successful submission | Red → Green | Mock callback invoked |
| TC-FORM-08 | Displays an error message when the API returns an error | Red → Green | Error text visible in the DOM |
| TC-FORM-09 | Error message is cleared when the user starts typing again | Red → Green | Error element removed or hidden |
| TC-FORM-10 | **Accessibility**: textarea has a visible label or `aria-label` | Red → Green | `getByLabelText(...)` finds the element |
| TC-FORM-11 | **Accessibility**: Error message has `role="alert"` | Red → Green | `getByRole('alert')` present on error |
| TC-FORM-12 | **Security**: Submitted content is passed to `fetch` as JSON string, not evaluated | Red → Green | `fetch` called with correct JSON body |
| TC-FORM-13 | **Extreme**: User pastes 2000-character content — submit is still disabled (over limit) | Red → Green | ValidationError shown, button disabled |
| TC-FORM-14 | **Extreme**: Pressing Enter in textarea does not submit the form (text area, not input) | Red → Green | `fetch` not called on Enter key |

### 9.2 `MessageList` (`MessageList.test.tsx`)

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TC-LIST-01 | Shows a loading indicator while fetching | Red → Green | Loading element visible before fetch resolves |
| TC-LIST-02 | Renders a list of messages after successful fetch | Red → Green | One `<li>` per message |
| TC-LIST-03 | Shows an empty-state message when the list is empty | Red → Green | "No messages yet" or equivalent visible |
| TC-LIST-04 | Shows an error message when fetch fails | Red → Green | Error text visible |
| TC-LIST-05 | Displays each message's `content` text | Red → Green | `getByText(message.content)` found |
| TC-LIST-06 | Displays each message's formatted `created_at` timestamp | Red → Green | Element with timestamp text found |
| TC-LIST-07 | Refresh is triggered after a message is submitted (via form `onSuccess`) | Red → Green | `fetch` called a second time |
| TC-LIST-08 | **Security**: Message content containing HTML is rendered as text, not injected as HTML | Red → Green | `innerHTML` of item does not equal raw HTML tag |

### 9.3 `MessageItem` (`MessageItem.test.tsx`)

| ID | Test name | Phase | Expected result |
|---|---|---|---|
| TC-ITEM-01 | Renders the message content | Red → Green | Content text in the document |
| TC-ITEM-02 | Renders a formatted, human-readable timestamp | Red → Green | Timestamp element not a raw ISO string |
| TC-ITEM-03 | Renders a "Törlés" / Delete button | Red → Green | `getByRole('button', { name: /törl[eé]s/i })` present |
| TC-ITEM-04 | Delete button is disabled while deletion is in progress | Red → Green | `button.disabled === true` during pending fetch |
| TC-ITEM-05 | Calls `onDelete` callback with the message `id` on success | Red → Green | Mock callback called with correct id |
| TC-ITEM-06 | Displays an error when deletion fails | Red → Green | Error text visible after failed fetch |
| TC-ITEM-07 | **Accessibility**: Delete button has descriptive `aria-label` including message id or content hint | Red → Green | `aria-label` attribute present |
| TC-ITEM-08 | **Security**: Content is rendered in a DOM text node, not via `dangerouslySetInnerHTML` | Red → Green | Verify prop not used (static analysis) OR inject `<b>` and assert it appears unrendered |
| TC-ITEM-09 | **Extreme**: Content of 1000 characters renders without layout overflow (snapshot test) | Red → Green | Snapshot matches |

---

## 10. Cross-Cutting & Additional Test Cases

### 10.1 Adapter Contract Tests (Shared Behaviour Tests)

> These tests verify that **any** `IMessageRepository` implementation behaves identically. Run the same test suite against both `InMemoryMessageRepository` and (with mocked Supabase) `SupabaseMessageRepository`.

| ID | Test name |
|---|---|
| TU-CONTRACT-01 | `findAll()` returns `Message[]` with correct shape |
| TU-CONTRACT-02 | `save()` returns a `Message` with a non-empty UUID `id` |
| TU-CONTRACT-03 | `save()` persists — `findAll()` after save includes new record |
| TU-CONTRACT-04 | `deleteById()` with existing id resolves |
| TU-CONTRACT-05 | `deleteById()` with missing id rejects with `NotFoundError` |

*Implementation pattern*: extract shared contract into a `sharedRepositoryTests` helper function parameterised by the repository instance.

### 10.2 No Adapter Leakage — Import Guard Tests

> Verify **TR-REPO-6** statically. These are not runtime tests — they run as a custom Jest transform or a simple `grep`-based script.

| ID | Test name | Expected result |
|---|---|---|
| TU-LEAK-01 | `messageService.ts` contains no import from `./adapters/` | Zero matches |
| TU-LEAK-02 | `app/api/messages/route.ts` contains no import from `features/messages/adapters/` | Zero matches |
| TU-LEAK-03 | `app/api/messages/[id]/route.ts` contains no import from `features/messages/adapters/` | Zero matches |

### 10.3 TypeScript Strict Mode

These are validated by the TypeScript compiler (`tsc --noEmit`) as part of every CI run, not by Jest:

- All functions have return types declared.
- No `any` usage in production code (use ESLint `@typescript-eslint/no-explicit-any`).
- All `Promise` chains are awaited.

---

## 11. Test Execution Order (TDD Red→Green Schedule)

The order in which failing tests are written and then made green, respecting the build-up of dependencies:

```
Phase 1 — Foundation (no dependencies)
  TU-DOM-01 → TU-DOM-12      messageTypes (error classes)

Phase 2 — Adapter (depends on domain types)
  TU-INMEM-01 → TU-INMEM-21  InMemoryMessageRepository
  TU-CONTRACT-01 → TU-CONTRACT-05  Contract tests (green for InMemory)

Phase 3 — Service (depends on IMessageRepository + domain types)
  TU-SVC-01 → TU-SVC-22      MessageService

Phase 4 — Factory (depends on both adapters)
  TU-SUPA-01 → TU-SUPA-13    SupabaseMessageRepository (mocked client)
  TU-FAC-01 → TU-FAC-05      messageRepositoryFactory
  TU-CONTRACT-01 → TU-CONTRACT-05  Contract tests (green for Supabase adapter)

Phase 5 — API Routes (depends on service + factory)
  TI-GET-01 → TI-GET-06      GET /api/messages
  TI-POST-01 → TI-POST-11    POST /api/messages
  TI-DEL-01 → TI-DEL-07      DELETE /api/messages/[id]

Phase 6 — Components (depends on API endpoints via fetch mock)
  TC-ITEM-01 → TC-ITEM-09    MessageItem
  TC-LIST-01 → TC-LIST-08    MessageList
  TC-FORM-01 → TC-FORM-14    MessageForm

Phase 7 — Cross-cutting
  TU-LEAK-01 → TU-LEAK-03    Import guard tests
```

---

## 12. Test Configuration Notes

### Jest configuration (`jest.config.ts`)

```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',          // for unit & integration tests
  projects: [
    {
      displayName: 'unit+integration',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/unit/**', '**/__tests__/integration/**'],
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['**/__tests__/component/**'],
      setupFilesAfterFramework: ['@testing-library/jest-dom'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
  ],
  coverageThresholds: {
    global: {
      statements: 90,
      branches:   85,
      functions:  90,
      lines:      90,
    },
  },
};
```

### Environment for tests

```
# .env.test
DB_ADAPTER=inMemory
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key
```

---

## 13. Summary Table

| Suite | # Tests | Layer | Key coverage area |
|---|---|---|---|
| Domain types | 12 | Unit | Error hierarchy, identity |
| InMemoryMessageRepository | 21 | Unit | Adapter, ordering, boundaries |
| SupabaseMessageRepository | 13 | Unit | Adapter, error translation |
| messageRepositoryFactory | 5 | Unit | Wiring, fallback logic |
| MessageService | 22 | Unit | Validation, delegation, errors |
| Contract tests | 5 | Unit | Interface compliance |
| GET /api/messages | 6 | Integration | Happy path, errors, perf |
| POST /api/messages | 11 | Integration | Validation, security, errors |
| DELETE /api/messages/[id] | 7 | Integration | Happy path, not-found, security |
| MessageForm | 14 | Component | UX states, accessibility, security |
| MessageList | 8 | Component | Loading, empty, error, XSS |
| MessageItem | 9 | Component | Render, delete UX, accessibility |
| Import guards | 3 | Static | No adapter leakage |
| **Total** | **136** | | |
