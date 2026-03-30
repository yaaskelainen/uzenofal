# Üzenőfal (Message Board)

A robust, test-driven Message Board application built with Next.js, TypeScript, and Supabase, adhering to SOLID principles and Hexagonal Architecture.

## 🚀 Key Features

- **Anonymous Messaging**: Publicly accessible wall to post and view messages.
- **Hexagonal Architecture**: Core logic is isolated from the database (Supabase vs. In-Memory).
- **Auto-Configuring DB**: The app automatically prepares its database schema and security policies on startup (idempotent migrations).
- **100% TDD Coverage**: 121 tests covering unit, integration, component, and architectural constraints.
- **Enterprise Ready**: Modular design ready to be extracted into microservices.

---

## 🛠 Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Testing**: Jest & React Testing Library
- **UI**: Vanilla CSS (Premium design tokens)

---

## 💻 Local Development

### 1. Requirements
- Node.js 18+
- npm

### 2. Setup
```bash
git clone <your-repo-url>
cd teszt-feladat
npm install
```

### 3. Running with In-Memory DB (No setup needed)
The app defaults to an in-memory database if no Supabase keys are provided.
```bash
npm run dev
```

### 4. Running with local Supabase
Create a `.env.local` file:
```env
DB_ADAPTER=supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
POSTGRES_URL=your_direct_postgres_connection_string
```
The app will automatically run `src/db/schema.sql` on startup to prepare the tables.

---

## 🧪 Testing

We follow a strict Red-Green-Refactor cycle.

- **Run all tests**: `npm test`
- **Watch mode**: `npm run test:watch`
- **Test Categories**:
  - `unit/domain`: Pure business logic and custom errors.
  - `unit/adapters`: Repository implementations.
  - `unit/architecture`: Static analysis to prevent architectural leakage (Import Guards).
  - `integration/api`: Endpoint testing with mocked repository factory.
  - `component`: UI/UX interaction testing.

---

## 🌐 Deployment to Vercel

1. **Push to GitHub**: Push this repository to your GitHub account.
2. **Import to Vercel**: Connect your GitHub account to [Vercel](https://vercel.com) and import the project.
3. **Add Supabase Integration**:
   - Go to the **Storage** tab in your Project Dashboard.
   - Click **Connect Database** and select **Supabase**.
   - Vercel will automatically inject `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `POSTGRES_URL`.
4. **Environment Variable**:
   - In Vercel Settings -> Environment Variables, add `DB_ADAPTER=supabase`.
5. **Redeploy**: Deployment will automatically trigger the `instrumentation.ts` hook, which runs the SQL schema setup.

---

## 📚 Documentation

- [Architecture Overview](./ARCHITECTURE.md): Detailed explanation of the Hexagonal design and data flow.
- [Requirements](./Requirements.md): Functional and Technical specifications.
- [Test Plan](./TestPlan.md): Detailed TDD roadmap and assertion mapping.
