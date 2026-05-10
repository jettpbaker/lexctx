# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**lexctx** is an AI-powered lecture/audio content management and chat application built as a single Next.js 16 app (not a monorepo). Users organize audio/video content into Collections, upload sources (transcribed via FAL.ai Wizper), index transcripts into ChromaDB for RAG, and chat with an OpenAI-powered assistant.

### Tech Stack

- **Runtime/Package Manager:** Bun 1.3.0 (`bun.lock` is the lockfile)
- **Framework:** Next.js 16.1.7 (App Router, Turbopack dev)
- **Language:** TypeScript (strict)
- **ORM:** Drizzle ORM (Neon Postgres)
- **Vector DB:** ChromaDB Cloud (hybrid dense+sparse search)
- **AI:** Vercel AI SDK 6.x, OpenAI (gpt-5.4-nano)
- **Linting:** oxlint
- **Formatting:** oxfmt

### Development Commands

All commands via `bun run <script>` (see `package.json`):

| Command                | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `bun dev`              | Start dev server (Turbopack) on port 3000 |
| `bun run lint`         | Lint with oxlint                          |
| `bun run lint:fix`     | Lint and auto-fix                         |
| `bun run format`       | Format with oxfmt                         |
| `bun run format:check` | Check formatting                          |
| `bun run typecheck`    | TypeScript type checking (`tsc --noEmit`) |
| `bun run build`        | Production build                          |
| `bun run db:push`      | Push Drizzle schema to DB                 |
| `bun run db:migrate`   | Run migrations                            |

### Environment Variables

All env vars are validated at startup via `@t3-oss/env-nextjs` in `src/env.ts`. The app **will not start** without them. Required:

- `DATABASE_URL` — Neon PostgreSQL connection URL
- `OPENAI_API_KEY` — OpenAI API key
- `CHROMA_HOST`, `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE` — ChromaDB Cloud credentials
- `UPLOADTHING_TOKEN` — UploadThing file upload token
- `FAL_KEY` — FAL.ai transcription key

These are injected as Cursor Cloud secrets. For local dev, place them in `.env` at the repo root (Next.js auto-loads it).

### Non-obvious Caveats

- **Env vars in tmux sessions:** When starting the dev server in a tmux session, env vars from the parent process are not inherited. Write secrets to `.env` at the repo root so Next.js picks them up automatically.
- **Build warnings:** `bun run build` emits `NotImplementedError` warnings about `worker_threads.Worker` options (stdout, stderr, resourceLimits) not being implemented in Bun. These are non-fatal and the build completes successfully.
- **Workflow plugin:** `next.config.ts` uses `withWorkflow(nextConfig)` which adds workflow routes at `/.well-known/workflow/v1/*`. The `workflow` package discovers directives at startup (adds ~2.5s to cold start).
- **No automated test suite:** This repo has no test framework or test files. Verification is done via lint, typecheck, and manual testing.
- **Patched dependencies:** Two packages have patches in `patches/` applied by Bun automatically.
