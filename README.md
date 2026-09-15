# lexctx

Chat with your lectures. Upload recordings, organize them into collections, and ask questions — answers cite the exact moment in the video.

## How it works

1. **Add sources** — drag lecture videos onto a collection. The browser hashes the file (dedupe), extracts the audio track locally (mediabunny), and uploads audio and video in parallel.
2. **Transcribe & index** — audio goes to FAL.ai Wizper for transcription (a durable [`workflow`](https://useworkflow.dev) function), segments are chunked and indexed into ChromaDB Cloud (hybrid dense + sparse search) alongside Postgres. Video goes to Mux for playback.
3. **Chat** — an AI SDK v6 chat with RAG tools (`sourceSearch`, `getNearbyRagChunks`, web search via Exa) answers from your sources. Citations are chips that open the source video at the cited timestamp.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Runtime / PM | Bun |
| Database | PlanetScale Postgres via Drizzle ORM |
| Vector search | ChromaDB Cloud (hybrid dense + sparse) |
| AI | Vercel AI SDK 6 via AI Gateway (OpenAI / Anthropic / xAI / DeepSeek) |
| Media | Mux (video), FAL.ai Wizper (transcription), UploadThing (audio), mediabunny (client-side extraction) |
| Durable jobs | `workflow` package (ingest, Mux polling) |
| UI | Tailwind v4, shadcn-style primitives, motion, streamdown |

## Development

Copy `.env` with the vars validated in [`src/env.ts`](src/env.ts) (the app refuses to boot without them), then:

```bash
bun install
bun dev              # dev server on :3000
bun run typecheck    # tsc --noEmit
bun run lint         # oxlint
bun run db:push      # push Drizzle schema
bun run db:studio    # inspect the DB
```

There is no test suite; `typecheck` + `lint` are the gates, and verification is manual. See [AGENTS.md](AGENTS.md) for agent-oriented notes and non-obvious caveats.
