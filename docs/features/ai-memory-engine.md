# Feature: AI Memory Engine

## Current implementation
OpenAI-backed enrichment, retrieval-augmented memory chat, and a
cognitive/insights layer. **Strictly non-diagnostic** (disclaimers required).

## Architecture
- Client: `lib/openai.ts`.
- Enrichment: `lib/ai-memory.ts` (summary, tags, title, category, mood,
  sentiment, importance) on memory create → `memories.ai_*` columns.
- Embeddings: `lib/embeddings.ts` → `memories.embedding` (pgvector).
- Chat (RAG): `/api/memory-chat` + `lib/retrieve-memory-context.ts` (retrieves
  relevant memories as context). System prompt is non-diagnostic.
- Insights: `app/(app)/insights` driven by `lib/analytics/*` (memoryFrequency,
  streakAnalysis, emotionalVolatility, behavioralPatterns, inactivityDetection)
  and `lib/cognition/*` (cognitionScore, driftEngine — used only to feed the
  non-diagnostic plain-language summary; no score/chart is shown),
  `lib/insights/generateInsightSummary.ts`, `lib/data/insights.ts`. The
  fabricated cognitive-decline/biometric/Alzheimer-risk surfaces were removed
  (LA1 + LA5 de-medicalization) — do NOT reintroduce pseudo-clinical scoring.
- Disclaimers: `lib/constants/disclaimers.ts`, `components/ai/AIDisclaimer.tsx`,
  `components/insights/*`.

## Database dependencies
`memories.ai_*`, `memories.embedding`, scoring columns; `memory_clusters`.

## API routes
`/api/memory-chat` (POST), `/api/search` + `/api/memories/search` (POST).

## UI components
`app/(app)/memory-chat`, `app/(app)/insights`, `components/insights/*`,
`components/ai/AIDisclaimer.tsx`.

## Limitations
- **Compliance-critical:** all cognitive/risk output must remain non-clinical and
  carry disclaimers; never present as diagnosis/medical advice.
- Depth/accuracy of each cognition engine not individually audited here _(verify
  per file before relying on outputs)_.
- Cost/latency of OpenAI calls; failure handling _(verify)_.

## Future enhancements
Voice transcription; better retrieval; guardrails/evals on AI output;
EU AI Act transparency posture as features expand.
