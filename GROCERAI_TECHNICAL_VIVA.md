# GrocerAI Technical Notes

## Native memory architecture

GrocerAI memory is implemented in `src/server/memoryEngine.ts` with reusable sanitation, ranking, and reflection rules in `src/server/memoryRules.ts`.

- **Persistence:** Supabase PostgreSQL table `public.grocerai_memories`; apply `supabase/migrations/20261021_native_grocerai_memory.sql` manually.
- **Retrieval:** PostgreSQL `tsvector`/GIN full-text search followed by application-side term-overlap relevance ranking.
- **Reflection:** deterministic repeated-kind patterns; a reflection is labeled as a pattern to validate against current data.
- **Authorization:** customer writes and reads require server-verified identity and filter by customer ID. Store and Security requests require a signed manager token and are restricted to its branch. The table grants access only to `service_role`.
- **Agent use:** Customer prompt recall is keyed by verified customer ID; Store prompts receive branch-scoped outcomes; Security analysis receives branch-scoped incident patterns. Current catalog, inventory, checkout validation, and authorization remain authoritative.
- **Failure behavior:** missing configuration, missing migration, query errors, and timeouts are returned as unavailable/failure states. There is no local persistence fallback.

No Hindsight SDK, cloud endpoint, daemon, embedding service, or memory-specific API key is required. Groq remains an independent optional reasoning dependency.

## Verification

`npm run test:native-memory` exercises scoring, redaction, PostgREST adapter storage/retrieval, deterministic reflection, scoped authorization, user/branch isolation, unavailable-database behavior, all 21 Customer/Store/Security memory scenarios, and the three agent context paths. It uses a fake database adapter; it is not a live Supabase round-trip.

`npm run build` runs TypeScript and the Vite production build. A live database persistence check requires applying the migration and using the configured Supabase project.

## Historical material

`LEGACY_HINDSIGHT_IMPLEMENTATION_ARCHIVE.md` preserves an earlier implementation report for historical reference only. Its endpoint, SDK, service-health, and live-cloud statements do not describe the current code.
