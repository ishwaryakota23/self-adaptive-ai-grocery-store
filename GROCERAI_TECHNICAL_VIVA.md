# GrocerAI — Technical Hackathon Viva Guide

This guide is based on the repository implementation, not on product copy. It deliberately separates code evidence from tests, simulations, and live-service checks. File links are relative to the project root. No `.env` contents, credentials, personal data, or authorization headers are reproduced.

## Evidence labels

- **IMPLEMENTED AND CODE-VERIFIED** — the behavior is visible in source code.
- **IMPLEMENTED BUT NOT LIVE-VERIFIED** — code calls or supports a real external service, but this guide does not claim successful production operation.
- **SIMULATED / SEEDED DEMO** — fixed fixtures, local state, or scripted outcomes power the demonstrated behavior.
- **PARTIALLY IMPLEMENTED** — only part of the described capability is present, or separate live and demo paths coexist.
- **NOT IMPLEMENTED / NOT VERIFIED** — the repository does not establish the feature, or deployment/runtime evidence is unavailable.

These labels describe evidence, not a claim that a feature is production-ready.

## 1. Tech stack and architecture

| Area | Actual implementation | Evidence and status |
|---|---|---|
| Browser UI | React 19.3.0, TypeScript 6.0.3, Vite 8.3.1, Tailwind CSS 3.4.17, Lucide React, React Router 7.18.4, Framer Motion 14.0.0, Recharts 3.10.1. | **IMPLEMENTED AND CODE-VERIFIED.** Versions from `package-lock.json`; dependencies in [`package.json`](./package.json). |
| Backend/API | TypeScript API handlers under `api/`; Vite middleware dispatches those handlers during local development/preview. Vercel configuration deploys `api/**/*.ts` as functions. No Express server is declared. | **IMPLEMENTED AND CODE-VERIFIED.** [`vite.config.ts`](./vite.config.ts), [`vercel.json`](./vercel.json). |
| Customer and Store LLM | Groq Cloud chat-completions API called with server-side `fetch`; configured model comes from `GROQ_MODEL`, with source fallback `qwen/qwen3.8-27b`. Model name in the private runtime environment is intentionally not reproduced. | **IMPLEMENTED BUT NOT LIVE-VERIFIED** for the current deployment/model. [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts). |
| Groq SDK | `groq-sdk` 1.6.0 is installed, but the inspected Customer/Store server agent implementations call the HTTP API with `fetch`; do not say these paths use the SDK unless another specific call site is identified. | **IMPLEMENTED AND CODE-VERIFIED** dependency; agent path uses direct fetch. |
| Business-data database | Supabase JS 2.117.2; browser public client and server admin client are separate. SQL repository schema targets PostgreSQL. Whether the checked-in migrations/schema are deployed is **NOT VERIFIED**. | [`supabase.ts`](./src/services/supabase.ts), [`supabaseAdmin.ts`](./src/server/supabaseAdmin.ts), [`supabase/schema.sql`](./supabase/schema.sql). |
| Experiential memory | `@vectorize-io/hindsight-client` 0.10.1, Cloud base URL configured server-side. `@vectorize-io/hindsight-all` 0.10.1 is also installed. | **IMPLEMENTED AND CODE-VERIFIED**; successful read-only Cloud requests were performed in this conversation, but no live memory write/recall cycle was run. [`hindsightService.ts`](./src/services/hindsightService.ts). |
| Browser voice | Web Speech API `SpeechRecognition`/`webkitSpeechRecognition` and `speechSynthesis`; Web Audio API is used for a chime. Browser and microphone support varies. | **PARTIALLY IMPLEMENTED**; no physical-browser/device speech test in this analysis. [`voiceService.ts`](./src/services/voiceService.ts). |
| QR | `qrcode` 1.5.4 generates SVG/data URLs. Scanner checks browser `BarcodeDetector`, then `jsQR` 1.4.0, then ZXing `@zxing/library` 0.21.3; camera path uses `getUserMedia`. | **IMPLEMENTED AND CODE-VERIFIED**, physical-device scan not verified. [`qrService.ts`](./src/services/qrService.ts), [`CameraQRScanner.tsx`](./src/components/CameraQRScanner.tsx). |
| CCTV / CV | Local `<video>`/image playback and a manifest that emits scripted demo events. No frame inference, object detector, tracking model, OpenCV, or real camera ingest is established. | **SIMULATED / SEEDED DEMO.** [`CCTVSurveillanceHub.tsx`](./src/components/CCTVSurveillanceHub.tsx), [`cctvManifestService.ts`](./src/services/cctvManifestService.ts). |
| 3D landing scene | Three.js 0.186.1 with generated mesh/texture helpers and scripted camera/object motion. This is not a live connected store digital twin. | **IMPLEMENTED AND CODE-VERIFIED** as a rendered scene; live telemetry linkage **NOT IMPLEMENTED**. [`Store3DCanvas.tsx`](./src/components/Store3DCanvas.tsx), [`supermarketModels.ts`](./src/components/supermarketModels.ts). |
| Tests/build | The package exposes `npm run test:hindsight-policy` and `npm run build` (`tsc && vite build`). Other verification scripts/tests exist in `src/tests`, but are not all wired into package scripts. | The Hindsight policy/status suite passed 8/8 and production build passed in the preceding diagnostic work. Those results do not validate every integration or live service. |

### Request architecture at a glance

```text
React browser UI
  ├─ /api/customer-agent ─ GroqCustomerAgentServer ─ Groq chat completions
  │                         ├─ customer tools ─ db/catalog/cart
  │                         └─ Hindsight customer recall/retain/reflect
  ├─ /api/store-agent ──── GroqStoreAgentServer ── Groq chat completions
  │                         ├─ store tools ─ db/telemetry/business rules
  │                         └─ Hindsight store recall/reflect/retain
  ├─ /api/security ─────── deterministic SecurityAgent and policy services
  │                         └─ optional Hindsight context/experience
  └─ Supabase-backed API routes for sessions, carts, auth, inventory, etc.
                               └─ Supabase server admin client
```

The diagram describes code paths, not a guarantee every external service is configured in every environment. Local browser state and seeded fixtures also exist.

## 2. Hindsight implementation — judge answers

### 1. Which SDK and version?

**Judge answer:** “We use Vectorize’s TypeScript `@vectorize-io/hindsight-client` 0.10.1. The lockfile also resolves `@vectorize-io/hindsight-all` 0.10.1, but the application service imports the client package for server calls.”

**Technical detail / status:** The service imports `HindsightClient`, `sdk`, `createClient`, and `createConfig`. Package lock confirms exact installed version. **IMPLEMENTED AND CODE-VERIFIED.** No claim about changing model weights.

**References:** [`package.json`](./package.json), [`package-lock.json`](./package-lock.json), [`hindsightService.ts`](./src/services/hindsightService.ts).

**Follow-up:** “Did you validate that SDK against Cloud?” — Yes: read-only version/config requests from the project’s Node/Vite runtime succeeded during this conversation. No live retain or recall was performed.

### 2. How is the client instantiated?

**Judge answer:** “`HindsightService.getClient()` lazily resolves server environment configuration and constructs the SDK client with `baseUrl` and the optional API key. It rebuilds the cached client when either changes. The generated SDK client is also initialized for endpoint operations.”

**Technical detail / status:** Browser SDK calls are rejected. The Vite middleware reloads `.env` before dispatching API routes, so configuration is resolved lazily rather than captured at module import. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [`vite.config.ts`](./vite.config.ts).

**Follow-up:** “Is the credential returned to React?” — No; browser calls use the app’s own API routes.

### 3. How are endpoint and key loaded?

**Judge answer:** “The server reads `HINDSIGHT_BASE_URL` and `HINDSIGHT_API_KEY`. Cloud requires HTTPS and a key; HTTP is permitted only for loopback development.”

**Technical detail / status:** `resolveHindsightConfig()` validates URL/protocol and rejects remote config without the key. The example config documents the Cloud URL but actual `.env` values are private. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts), [`.env.example`](./.env.example).

**Follow-up:** “What endpoint is currently configured?” — In the prior safe inspection of the effective Vite-loaded configuration, its origin was `https://api.hindsight.vectorize.io`; no key value was shown.

### 4. Why must the Hindsight API key stay server-side?

**Judge answer:** “It authenticates the application to the Cloud account. Shipping it in a Vite `VITE_` variable would expose it in the browser bundle and let visitors use the account directly. The browser instead calls authenticated GrocerAI API routes.”

**Technical detail / status:** The service refuses browser SDK use, and `.env.example` describes server-only settings without `VITE_`. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [`.env.example`](./.env.example), [`api/hindsight`](./api/hindsight).

**Follow-up:** “Does server-side storage alone authorize every operation?” — No; application route authorization and bank/customer ownership checks are still required.

### 5. Which functions perform retain, recall, and reflect?

**Judge answer:** “The shared service exposes `retainCustomerExperience`, `retainStoreOperationalExperience`, and `retainSecurityExperience`, plus bank-specific recall helpers and `reflect()`. API handlers call these service methods after authorization.”

**Technical detail / status:** Hindsight-specific endpoints include `POST /api/hindsight/retain`, `/recall`, `/reflect`, `/lab`, `/test-bank`, and GET `/status`, `/activity`. `provisionBank()` exists for normal application workflows, but the read-only status check does not provision. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [`api/hindsight`](./api/hindsight), [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts).

**Follow-up:** “Does the diagnostic status endpoint mutate memory?” — No; it issues version and bank-config GETs only.

### 6. How does memory reach an LLM?

**Judge answer:** “Customer and Store server agents recall relevant text, take up to four results, optionally ask Hindsight to reflect with current context, and add the recalled evidence to the Groq prompt. Reflection is labeled as inference, not fact.”

**Technical detail / status:** Customer prompt distinguishes retrieved, empty, unavailable, and not-attempted memory. Store prompt tells the LLM to treat live/current telemetry as authoritative and use historical memory only when actually recalled. **IMPLEMENTED AND CODE-VERIFIED**, live retrieval for these agents not verified here.

**References:** [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts).

**Follow-up:** “Does Hindsight fine-tune Groq?” — No evidence of weight updates; it supplies retrievable experience/context.

### 7. What is the bank-ID strategy?

**Judge answer:** “Customer memories are partitioned as `grocerai-customer-{verifiedCustomerId}`. Store and Security map to fixed `grocerai-store-main` and `grocerai-security-main` IDs.”

**Technical detail / status:** System bank mapping intentionally ignores env overrides; customer IDs are restricted to a safe character/length pattern. The Cloud test bank used for the explicit synthetic integration flow is the existing `grocerai-hindsight-test`. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts), [`hindsightService.ts`](./src/services/hindsightService.ts).

**Follow-up:** “Does the dashboard display a customer bank?” — It displays the isolation pattern, not a shared customer bank.

### 8. How is customer isolation enforced?

**Judge answer:** “The API verifies a stored active customer identity token and matches its customer ID to the requested customer bank. A caller-provided bank ID alone is not accepted as proof of ownership.”

**Technical detail / status:** `assertCustomerBankOwner()` checks the verified identity and `customerBankId()` validates the identifier. Customer agent identity failure allows shopping assistance to continue but prevents saved-memory access. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts), [`api/_auth.ts`](./api/_auth.ts), [`api/customer-agent.ts`](./api/customer-agent.ts).

**Follow-up:** “Is the ID secret?” — No. Authorization depends on a valid active identity credential and server-side ownership checks.

### 9. How does a new customer get a stable identity?

**Judge answer:** “The OTP route verifies a contact channel and creates persistent customer and identity-token records when configured. The app uses that customer ID for the customer’s isolated memory bank; a visit’s shopping session is a separate identifier.”

**Technical detail / status:** The API stores OTP expiry, attempt count, and used state. Local/browser demo identity state also exists; deployed Supabase behavior and actual message delivery are not established in this document. **PARTIALLY IMPLEMENTED; LIVE VERIFICATION NOT DONE.**

**References:** [`api/auth/otp.ts`](./api/auth/otp.ts), [`supabase/schema.sql`](./supabase/schema.sql), [`db.ts`](./src/services/db.ts).

**Follow-up:** “Does every visit create a new person?” — No; customer identity and session identity are separate.

### 10. Empty memory versus a failed call?

**Judge answer:** “The Customer Agent uses separate statuses: `retrieved`, `empty`, `unavailable`, and `not_attempted`. An empty successful response is not treated as an API failure.”

**Technical detail / status:** Hindsight service methods return success/error fields; agent prompt construction preserves the distinction. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`hindsightService.ts`](./src/services/hindsightService.ts).

**Follow-up:** “What does the assistant do if memory is unavailable?” — It can still answer using current request/context and must not claim a remembered preference it did not retrieve.

### 11. How do failures surface?

**Judge answer:** “Retain and recall return explicit failure results and safe diagnostic messages; reflect failure does not become a fabricated successful memory. Customer and Store paths log graceful degradation server-side and continue without claiming the memory call succeeded.”

**Technical detail / status:** The status service emits safe diagnostic codes; the browser does not receive the API key, raw auth header, or raw server exception. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [`api/hindsight/status.ts`](./api/hindsight/status.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts).

**Follow-up:** “Can a failed retain be mistaken for a successful one?” — The service returns a failure shape; downstream confirmation must check that result.

### 12. What retention gates exist?

**Judge answer:** “The service rejects short/transient or sensitive content, applies category/worthiness checks, and applies stricter evidence requirements to production Store outcome retention.”

**Technical detail / status:** Verified Store outcome evidence requires `verified-operation` plus complete observed event, action, reobserved metric, and outcome summary; synthetic-demo outcomes are excluded from that production path. Security text is sanitized before retention. **IMPLEMENTED AND CODE-VERIFIED.**

**References:** [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts), [`hindsightService.ts`](./src/services/hindsightService.ts).

**Follow-up:** “Are these model-based guarantees?” — No; these are application predicates and sanitization checks, not proof that all upstream text is true.

### 13. How is synthetic data kept out of real memory?

**Judge answer:** “The stricter production Store retention path requires verified-operation evidence and excludes `synthetic-demo`. The Learning Lab uses separately named isolated synthetic banks; the test-bank flow is hard-coded to the already existing test bank.”

**Technical detail / status:** A general-purpose `provisionBank()` helper also exists, so isolation depends on calling the correct workflow and bank ID; not every possible application path is proven free of synthetic values. **PARTIALLY IMPLEMENTED.**

**References:** [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts), [`api/hindsight/lab.ts`](./api/hindsight/lab.ts), [`api/hindsight/test-bank.ts`](./api/hindsight/test-bank.ts).

**Follow-up:** “Does the status diagnostic use Learning Lab?” — No.

### 14. Does Hindsight train the model?

**Judge answer:** “We use Hindsight as an external memory system: the application retains eligible text and retrieves relevant memories into later prompts. I found no application path that updates Groq model weights.”

**Technical detail / status:** Retrieval, optional reflect, and prompt injection are visible; model fine-tuning is not. **IMPLEMENTED** as memory-context integration, **NOT IMPLEMENTED** as weight training.

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts).

**Follow-up:** “Why call it adaptive?” — Retrieved prior outcomes can change a later recommendation, subject to current tools/evidence; it does not imply parameter learning.

### 15. How is Learning Lab different?

**Judge answer:** “Learning Lab uses isolated synthetic scenario banks and a separate API workflow. It is a controlled demonstration, not evidence that the production Customer or Store agent just learned from a real event.”

**Technical detail / status:** Lab route and scenario utilities exist; deterministic/scripted learning examples also exist in `hindsightEngine.ts`. Status inspection avoids Lab calls. **SIMULATED / SEEDED DEMO** for scripted scenarios; Cloud workflow code **IMPLEMENTED BUT NOT LIVE-VERIFIED** here.

**References:** [`api/hindsight/lab.ts`](./api/hindsight/lab.ts), [`hindsightLearningScenarios.ts`](./src/services/hindsightLearningScenarios.ts), [`hindsightEngine.ts`](./src/services/hindsightEngine.ts).

**Follow-up:** “Could a lab event alter a production bank?” — The intended path uses separate bank IDs; confirm route/domain validation before making broader claims.

### 16. How does Cloud health and bank availability work?

**Judge answer:** “The read-only check requests `/version` and then GETs the configured Store and Security bank configs. It classifies connection state separately from each bank’s availability and uses `/health` only as a version-endpoint fallback.”

**Technical detail / status:** The current implementation uses supported generated SDK operations and per-request timeouts. 404 config means bank unavailable, not host unreachable. **IMPLEMENTED AND CODE-VERIFIED.** Prior Node/Vite checks in this conversation confirmed authenticated version/config GETs could reach Cloud.

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [`api/hindsight/status.ts`](./api/hindsight/status.ts).

**Follow-up:** “Does `connected` mean all banks exist?” — No; transport/API connectivity and bank presence are distinct.

### 17. What caused `NETWORK UNREACHABLE`?

**Judge answer:** “I can confirm a status-check compatibility defect, but I cannot prove it caused the historical `NETWORK UNREACHABLE` banner. The old status check used the SDK’s removed bank-profile endpoint, which Cloud answered with HTTP 410; I changed the diagnostic to the supported read-only bank-config endpoint. Separate live checks then reached Cloud successfully.”

**Technical detail / status:** Safe Node/Vite diagnostics resolved DNS, connected TCP 443, negotiated authorized TLS 1.3, got HTTP 200 from `/version`, and succeeded with authenticated SDK version/config reads. Existing test bank config returned successfully; Store and Security config reads returned 404. Thus the current endpoint is reachable, while the exact original incident cause is **NOT VERIFIED**. Do not describe the 410 as a DNS/network outage.

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [installed SDK declaration](./node_modules/@vectorize-io/hindsight-client/dist/index.d.ts), [installed SDK implementation](./node_modules/@vectorize-io/hindsight-client/dist/index.js).

**Follow-up:** “What manual check remains?” — Check the Hindsight Cloud workspace associated with the configured key for the exact existing Store and Security bank names. Do not create/rename them during diagnosis.

### 18. What is verified live versus local?

**Judge answer:** “The source implements server-side Cloud calls, and read-only authenticated Cloud checks succeeded during diagnosis. The local app also has seeded/in-memory browser data. I did not run a live retain/recall/reflect cycle, Learning Lab, migrations, or a production deployment.”

**Technical detail / status:** Mock-based tests prove request classification and control flow only. They do not prove the supplied bank can store/retrieve memories, that production secrets are correct, or that agent LLM requests succeed. **PARTIALLY IMPLEMENTED; live memory cycle NOT VERIFIED.**

**References:** [`scripts/test-hindsight-cloud-policy.mjs`](./scripts/test-hindsight-cloud-policy.mjs), [`hindsightDashboardStatus.safe.test.ts`](./src/tests/hindsightDashboardStatus.safe.test.ts), [`hindsightService.ts`](./src/services/hindsightService.ts).

**Follow-up:** “How would you verify memory safely?” — Use the explicitly authorized test-bank endpoint and its synthetic UUID-tagged test flow only after approval; it performs a real test-bank retain/recall and is not a read-only diagnostic.

### 19. How would you demonstrate retain → recall on the existing test bank?

**Judge answer:** “The app provides a manager-authorized `POST /api/hindsight/test-bank` workflow that targets `grocerai-hindsight-test` and does not call bank provisioning. Its phases are separate retain and recall calls with a caller-supplied UUID marker.”

**Technical detail / status:** The route can write synthetic test data, so it was not invoked for this analysis. Use an authorized environment and consent; use the same UUID for the recall phase and inspect only the returned synthetic test result. **IMPLEMENTED BUT NOT LIVE-VERIFIED as a round trip.**

**References:** [`api/hindsight/test-bank.ts`](./api/hindsight/test-bank.ts), [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts).

**Follow-up:** “Was that done here?” — No; only read-only config/version requests were made.

### 20. How should the dashboard interpret diagnostic codes?

**Judge answer:** “The code now distinguishes safe categories such as DNS failure, timeout, refusal, TLS failure, auth rejection, removed/incompatible endpoint, other HTTP error, and upstream unavailability. Bank-not-found is reported on the bank, not mislabeled as a network failure.”

**Technical detail / status:** Classification uses transport error codes and HTTP status fields; raw headers and credentials are not part of the diagnostic response. **IMPLEMENTED AND CODE-VERIFIED**, with synthetic fetch tests.

**References:** [`hindsightService.ts`](./src/services/hindsightService.ts), [`hindsightDashboardStatus.ts`](./src/services/hindsightDashboardStatus.ts), [`hindsightDashboardStatus.safe.test.ts`](./src/tests/hindsightDashboardStatus.safe.test.ts).

**Follow-up:** “Can all environments give the same network error code?” — No; proxies, runtime fetch implementations, and operating-system errors can expose different cause codes.

## 3. Multi-agent architecture

### Customer Agent

- **Judge answer:** “The Customer Agent is a Groq-backed tool-using server workflow. It receives an input, language/session context, and customer identity; the LLM may select typed catalog/cart tools; the server executes them and generates a grounded response.”
- **Technical detail:** `api/customer-agent.ts` validates any memory identity before calling `GroqCustomerAgentServer.processRequest()`. Tool definitions live in `customerAgentTools.ts`; they query local/app database services and check inventory for cart operations. The browser reconciles tool outcomes and shared cart state instead of trusting a natural-language claim.
- **Status:** **IMPLEMENTED BUT NOT LIVE-VERIFIED** against current Groq deployment; tools and deterministic fallback are code-verified.
- **References:** [`api/customer-agent.ts`](./api/customer-agent.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`customerAgentTools.ts`](./src/services/customerAgentTools.ts), [`customerAgent.ts`](./src/services/customerAgent.ts).
- **Follow-up:** “Is every reply generated by an LLM?” — No; the client has deterministic handling for supported shopping/cart commands and local fallbacks.

### Store Agent

- **Judge answer:** “The Store Agent uses Groq to interpret a manager request and choose from a constrained tool set, but store facts and actions come from application services and deterministic business logic.”
- **Technical detail:** It grounds prompt context using `getStoreOverview()`, low/out-of-stock products, and queue status. `executeStoreAgentTool()` applies approved domain operations. Rules tell the model that search/view/cart/checkout/confirmed sale are different funnel stages.
- **Status:** **PARTIALLY IMPLEMENTED**: LLM tool-selection code is real; underlying sample inventory and telemetry include seeded/local data, and there is no verified live store sensor feed.
- **References:** [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts), [`db.ts`](./src/services/db.ts).
- **Follow-up:** “Can the model invent stock?” — The prompt requires authoritative tools, and the tool/service layer owns the returned values; still validate action results before reporting success.

### Security Agent

- **Judge answer:** “Security handling is predominantly deterministic policy and event logic, not a third independently configured LLM. It can use Hindsight as supporting context for ambiguous events, but memory is not permission to bypass authorization.”
- **Technical detail:** `SecurityAgent` evaluates checkout/security cases, sanitizes experience data, and records resolution context. Some alert email paths are implemented separately; CCTV manifest demo alerts themselves are local notification/ledger behavior.
- **Status:** **PARTIALLY IMPLEMENTED**; deterministic code is verifiable, live provider/email behavior is not.
- **References:** [`securityAgent.ts`](./src/services/securityAgent.ts), [`cctvManifestService.ts`](./src/services/cctvManifestService.ts), [`emailProvider.ts`](./src/server/email/emailProvider.ts).
- **Follow-up:** “Does the security agent make guilt determinations?” — It should not; source policy frames events as evidence and supports benign/false-positive resolution.

### Orchestration, validation, and permissions

- **Judge answer:** “The main pattern is request/response with model-selected tool calls. The server executes named operations; it is not a free-running distributed agent scheduler.”
- **Technical detail:** Customer and Store tool schemas constrain arguments and available operations. API routes enforce manager or customer authorization before sensitive actions. The source does not support a claim of a generalized multi-agent message bus or autonomous parallel planner.
- **Status:** **IMPLEMENTED AND CODE-VERIFIED** for exposed tool/API calls; full production adversarial testing is **NOT VERIFIED**.
- **References:** [`api/_auth.ts`](./api/_auth.ts), [`api/store-agent/index.ts`](./api/store-agent/index.ts), [`api/customer-agent.ts`](./api/customer-agent.ts), [`customerAgentTools.ts`](./src/services/customerAgentTools.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts).
- **Follow-up:** “Why call it multi-agent?” — The project separates customer-facing, store-operations, and security responsibilities, tool sets, and memory scopes; security is more deterministic than the two Groq-backed agents.

## 4. JARVIS — LLM, voice, context, and tools

### Architecture and request trace

1. `JarvisCustomerCommandCenter` or `CustomerAssistantPage` captures typed input or speech transcript.
2. UI calls `CustomerAgent.processInput()` with session/customer context and history.
3. Browser posts to `POST /api/customer-agent`.
4. API validates customer identity / session handoff and calls `GroqCustomerAgentServer.processRequest()`.
5. Server optionally retains a qualified customer preference, recalls from that customer’s Hindsight bank, and adds relevant recalled facts/reflection to the prompt.
6. Groq chat completions can return typed tool calls. Server executes the selected tool and makes a follow-up completion.
7. Browser reconciles cart state, checks/syncs the shared session cart when applicable, renders the response, and may speak it.

**Status:** **IMPLEMENTED** end to end in source. Current live Groq/browser/device behavior is **NOT VERIFIED** here.

**References:** [`JarvisCustomerCommandCenter.tsx`](./src/components/JarvisCustomerCommandCenter.tsx), [`CustomerAssistantPage.tsx`](./src/pages/CustomerAssistantPage.tsx), [`customerAgent.ts`](./src/services/customerAgent.ts), [`api/customer-agent.ts`](./api/customer-agent.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts).

### Judge-ready details

- **Provider/model:** Groq chat-completions API; server reads `GROQ_MODEL`, fallback `qwen/qwen3.8-27b`. Model availability and the private configured value are **NOT VERIFIED / not printed**. Calls use tool choice `auto`; inspected selection/follow-up temperatures are 0.2/0.3; some error paths retry/fallback. **IMPLEMENTED BUT NOT LIVE-VERIFIED.**
- **Prompt/context:** concise multilingual directions, current cart/mission, product context, limited recent conversation, eligible Hindsight recall (up to four entries), and explicit rule to confirm mutations only after success. **IMPLEMENTED AND CODE-VERIFIED.**
- **Language:** `languageDetector` recognizes Telugu/Devanagari scripts and heuristic Romanized Telugu/Hindi patterns; neutral short follow-ups can inherit a session language. This is heuristic language/context logic, not proof of a dedicated multilingual ASR/NLU model. **IMPLEMENTED, quality NOT VERIFIED.**
- **Speech-to-text:** browser `SpeechRecognition` or prefixed `webkitSpeechRecognition`, with locale selection such as `en-IN`, `te-IN`, `hi-IN`. **PARTIALLY IMPLEMENTED** because browser support/device tests vary.
- **Text-to-speech:** browser `speechSynthesis`, with voice selection/fallback logic; a Web Audio chime is also used. Telugu voice availability depends on installed browser voices. **PARTIALLY IMPLEMENTED.**
- **Follow-up references:** the server can resolve ordinal selection and a unique previously offered product context. Catalog search uses product matching/synonyms; do not claim general fuzzy typo correction for every product.
- **Cart safety:** tool implementation checks actual stock and the browser reconciles response/cart state. The system prompt says not to claim success on failed tool execution. **IMPLEMENTED AND CODE-VERIFIED**; real concurrent multi-device behavior depends on configured persistence.
- **Limitations:** model/provider availability, transcription quality, broad misspellings, and durable conversation history are not assured. Conversation history is held in session-keyed in-memory structures and is not evidence of durable cross-device chat.

**References:** [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`customerAgentTools.ts`](./src/services/customerAgentTools.ts), [`languageDetector.ts`](./src/services/languageDetector.ts), [`voiceService.ts`](./src/services/voiceService.ts), [`sessionSyncService.ts`](./src/services/sessionSyncService.ts).

## 5. CCTV and computer vision

**Judge answer:** “The CCTV screen is a local-media and scripted-event demonstration. It does not run object detection or tracking on video frames.”

- `CCTVSurveillanceHub` renders local media using HTML `<video>`/`<img>`.
- `cctvManifestService` maps demo assets to authored `expected_event`, confidence, and timeline metadata; `processCCTVVideo()` creates the event from that manifest rather than vision inference.
- The generated event is marked as demo CCTV. The visible “possible concealment” style labels are preset scenario output, not a model conclusion.
- No CV inference dependency, weights file, frame extraction loop, tracking implementation, RTSP ingest, or live camera pipeline was identified.
- CCTV manifest alert/manager-notification paths are local ledger/UI actions. A separate `SecurityAgent.dispatchManagerAlertEmail()` and email provider integration exist, but actual delivery/configuration is **NOT LIVE-VERIFIED**; do not equate a demo banner with an email being sent.
- False-positive handling is primarily deterministic security logic/scenario actions with optional memory context, not detector confidence calibration.

**Status:** **SIMULATED / SEEDED DEMO** for video events; **NOT IMPLEMENTED** for real-time CV inference based on inspected source.

**References:** [`CCTVSurveillanceHub.tsx`](./src/components/CCTVSurveillanceHub.tsx), [`cctvManifestService.ts`](./src/services/cctvManifestService.ts), [`cctvSurveillance.test.ts`](./src/tests/cctvSurveillance.test.ts), [`securityAgent.ts`](./src/services/securityAgent.ts), [`emailProvider.ts`](./src/server/email/emailProvider.ts), [`public/cctv/`](./public/cctv).

**Follow-up:** “What would be needed for genuine CV?” — A frame-ingest/decoder pipeline, named and versioned detection model/weights, inference and tracking code, and validation against labeled footage. None should be claimed as present.

## 6. Store Agent and operational data

- **Data sources:** catalog, inventory, sales/order funnels, queue status, and operational state are obtained through `db` and `storeAgentTools`. Seeded app state and local persistence are visible; a live POS/sensor/CCTV integration is not established.
- **Recommendation split:** Groq interprets manager language and chooses tools; deterministic code calculates stock/reorder and ROI fields. Store prompt asks for evidence such as quantity vs threshold, confirmed sales, and unfulfilled demand.
- **Restock logic:** `generateRestockRecommendation` / related tool logic considers current quantity, reorder threshold, sales velocity, and unmet demand. Certain demo paths add fixed synthetic demand (for example a zero-stock scenario); disclose which records are generated versus authoritative.
- **Action execution:** typed tool definitions constrain operations such as overview, inventory, recommendations, approvals, action/outcome capture, and ROI. Results come from tool execution, not the model asserting a side effect.
- **Outcome verification:** strict production Store Hindsight retention checks verified-operation evidence and nonempty observed event/action/reobserved metric/summary; synthetic-demo evidence does not qualify. This protects against treating an estimate as a measured success, but the validity of the source observation still depends on upstream data.
- **Hindsight influence:** recalled evidence may inform later recommendations, but current inventory/telemetry is instructed to remain authoritative. `hindsightEngine.ts` also includes fixed learning/convergence scenarios; do not present those scripted numbers as live optimization.
- **Status:** operational UI/tools are **IMPLEMENTED**; backing store signals and real business outcomes are **SIMULATED / NOT LIVE-VERIFIED** unless a specific live source is independently configured and tested.

**References:** [`storeAgentTools.ts`](./src/services/storeAgentTools.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts), [`db.ts`](./src/services/db.ts), [`roiEngine.ts`](./src/services/roiEngine.ts), [`hindsightEngine.ts`](./src/services/hindsightEngine.ts), [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts).

## 7. Supabase and database design

### What the repository establishes

- Supabase JS 2.117.2 is installed. `getSupabaseClient()` uses public/publishable configuration for browser-safe access; `getSupabaseAdminClient()` uses server-only credentials with persisted auth disabled.
- `supabase/schema.sql` declares a PostgreSQL relational design. Main groups include `customers`, `verified_customer_emails`, `customer_identity_tokens`, `customer_preferences`, `otps`, `shopping_sessions`, `customer_sessions`, `carts`, `categories`, `products`, `cart_items`, `session_handoffs`, `orders`, `order_items`, `payments`, `sales`, `inventory`, `inventory_movements`, `security_events`, `manager_accounts`, `manager_actions`, `checkout_queues`, `shopping_missions`, `customer_requests`, `store_events`, and `ai_recommendations`.
- Constraints visible in SQL include customer email/WhatsApp uniqueness, foreign keys between customer/session/cart/product records, check constraints on language/status/quantity, and unique `(cart_id, product_id)` for cart items.
- The persistent session/cart-sync migration adds `shopping_session_state` with a session-keyed JSON item snapshot and revision. The API uses expected-revision comparison and conditional update to return `409` on concurrent updates.
- `20261011_rls_server_access.sql` enables RLS and grants business-table access to `service_role`, while allowing public product reads. This expresses intended security posture, **not proof the migration has run**.
- There is also `db.ts` browser localStorage-backed app state, including demo/local sessions. This means not all UI reads imply Supabase persistence.

**Migration status:** SQL files are present, but no database history/live Supabase inspection was run. Whether any migration is applied is **NOT VERIFIED**. Do not say “the production database has this schema” based solely on checked-in SQL.

**Transactions/concurrency:** The session cart path uses optimistic revision/CAS behavior. Broader transaction guarantees, deployment DB isolation, and all duplicate-registration race cases are **NOT VERIFIED** from repository files alone.

**Why Supabase?** The code uses its hosted Postgres, REST client, and server-side privileged access. A project-specific selection rationale is not provable from source; describe the integration rather than inventing a decision history.

**References:** [`supabase/schema.sql`](./supabase/schema.sql), [`supabase/migrations`](./supabase/migrations), [`supabase.ts`](./src/services/supabase.ts), [`supabaseAdmin.ts`](./src/server/supabaseAdmin.ts), [`session-sync.ts`](./api/session-sync.ts), [`db.ts`](./src/services/db.ts).

## 8. Customer QR, session QR, mobile handoff

- **QR generation:** `qrcode` creates SVG and data URL output. Customer identity payload is the stored `qr_payload` or JSON containing type `CID`, customer ID, token, store, and issue time. Session QR uses stored server-generated `qr_payload` (a mobile URL containing a handoff credential); local QR service also documents an `SQ` JSON fallback shape.
- **URL/origin:** `api/session-sync.ts` constructs mobile/kiosk URLs using the configured application origin and client-origin fallback logic; `.env.example` documents `APP_BASE_URL`. The exact deployed host selection must be checked in that environment.
- **Token:** the server API uses Node `crypto.randomBytes(32).toString('base64url')`, persists it, and expires it after two hours. QR exchange marks the original handoff used and rotates to a new sync token. This is an opaque bearer token, not a signed JWT. Session API validates active status, expiry, session/customer ownership, and handoff token.
- **Mobile:** `CustomerMobileDashboard` treats an ID in the URL as a hint, not authorization. It validates/exchanges the handoff through the API, then loads shared session/cart data.
- **Cart sync:** cart hydration validates products and inventory and derives current prices server-side. Expected revision prevents stale writes; conflict returns `409` with latest state.
- **Scanner:** attempts browser `BarcodeDetector`, then `jsQR`, then ZXing; camera permission is required for camera scanning, with manual paths where available.
- **Security caveat / mixed paths:** the production API handoff path uses cryptographic randomness. A separate local/demo `sessionHandoffService.ts` contains demo-style state/token behavior. Do not conflate that local path with the server API implementation or claim every deployment uses Supabase.
- **Status:** source-verified implementation; **NOT LIVE-VERIFIED** for physical mobile devices, HTTPS origin, deployed database migrations, or race/one-time behavior.

**References:** [`qrService.ts`](./src/services/qrService.ts), [`CameraQRScanner.tsx`](./src/components/CameraQRScanner.tsx), [`QRSessionModal.tsx`](./src/components/QRSessionModal.tsx), [`api/session-sync.ts`](./api/session-sync.ts), [`sessionSyncService.ts`](./src/services/sessionSyncService.ts), [`CustomerMobileDashboard.tsx`](./src/pages/CustomerMobileDashboard.tsx), [`sessionHandoffService.ts`](./src/services/sessionHandoffService.ts), [`sessionHandoff.safe.test.ts`](./src/tests/sessionHandoff.safe.test.ts).

## 9. 3D landing page and rendering

**Judge answer:** “The landing page contains an actual Three.js scene rendered in the browser, with generated store geometry/textures and a scripted guided camera/cart sequence. It is a visual digital-store demo, not a live synchronized digital twin.”

- Three.js 0.186.1 is installed; `Store3DCanvas.tsx` constructs scene objects, renderer/camera, animation/interpolation, and generated visuals. `supermarketModels.ts` and `supermarketTextures.ts` provide procedural geometry/material/texture helpers.
- `LandingPage.tsx` scripts stages and movement/timing between authored waypoints.
- Do not say React Three Fiber; no use established in the inspected scene implementation. Do not say a pre-rendered video is the landing scene; separately supplied MP4 demo assets do not prove that.
- Performance/device frame-rate validation is **NOT VERIFIED**. Avoid claiming adaptive LOD or production GPU optimization absent evidence.
- The landing page connects into app routes through React Router/application navigation.

**Status:** **IMPLEMENTED AND CODE-VERIFIED** as Three.js visual rendering; data-linked twin and performance benchmarks **NOT VERIFIED**.

**References:** [`LandingPage.tsx`](./src/pages/LandingPage.tsx), [`Store3DCanvas.tsx`](./src/components/Store3DCanvas.tsx), [`supermarketModels.ts`](./src/components/supermarketModels.ts), [`supermarketTextures.ts`](./src/components/supermarketTextures.ts), [`package.json`](./package.json).

## 10. Authentication and security

- **Customer identity:** OTP API flow stores expiry/attempt/used state and maintains customer identity records. Customer pass is a bearer credential; do not call it Supabase Auth unless using a distinct Supabase Auth flow.
- **Manager identity:** custom server-issued HMAC-SHA256 token with claims, expiry/role validation, timing-safe signature comparison. It is not a standards-based JWT merely because it is a bearer token. Client token persistence in `localStorage` increases impact of browser compromise.
- **Server authorization:** `authenticateManagerRequest()` protects manager routes; customer identity token ownership is checked in customer/session APIs. Hindsight customer-bank access checks verified customer identity against the bank suffix.
- **Secrets:** public Supabase publishable key may be browser-side; Supabase admin/service key, Groq key, Hindsight key, manager signing secret and email credentials must remain server-side. Never print `.env` values.
- **RLS:** checked-in migration restricts business-table direct browser access and leaves product SELECT public; actual application of this migration is **NOT VERIFIED**.
- **Limitations:** custom OTP hashing helper is not established as a standard password KDF; manager bootstrap/demo fallback exists in code; localStorage bearer token is accessible to injected script; routes and rate limits require a broader security review. This is a hackathon prototype, not an assertion of production-grade auth.
- **Input/error handling:** API routes validate expected IDs, tokens and action arguments, but coverage across every route has not been fully audited in this viva.

**References:** [`api/_auth.ts`](./api/_auth.ts), [`api/auth/otp.ts`](./api/auth/otp.ts), [`api/auth/manager.ts`](./api/auth/manager.ts), [`managerService.ts`](./src/services/managerService.ts), [`backendAuthority.ts`](./src/server/backendAuthority.ts), [`supabase/migrations/20261011_rls_server_access.sql`](./supabase/migrations/20261011_rls_server_access.sql), [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts).

## 11. Forty likely technical judge questions

Each spoken response is designed to fit roughly 20–40 seconds at normal pace. Use the deeper note and follow-up if judges probe.

### Hindsight and experiential memory

#### 1. What does “self-adaptive” mean here?
**Spoken:** “In this prototype, adaptation means we can retain an eligible, verified experience and retrieve it as context for a later recommendation. It is external memory, not a model-weight update. Some learning examples are scripted, so I distinguish those from real Cloud-backed experiences.”
**Deeper / refs:** Hindsight service + Groq prompt injection; `hindsightEngine.ts` has scripted scenarios. [`hindsightService.ts`](./src/services/hindsightService.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts), [`hindsightEngine.ts`](./src/services/hindsightEngine.ts).
**Status:** **PARTIALLY IMPLEMENTED**; live memory cycle not run.
**Follow-up:** “Does the model improve permanently?” — Not its parameters; only future prompts can include retrieved experience.

#### 2. How do you isolate one shopper’s preferences?
**Spoken:** “We derive a bank name from the verified customer ID, and the API verifies that the active identity belongs to that customer before allowing memory access. A browser-supplied bank name is not the ownership proof.”
**Deeper / refs:** `customerBankId`, `assertCustomerBankOwner`, customer token validation. [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts), [`api/_auth.ts`](./api/_auth.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**; deployed authorization tests not run.
**Follow-up:** “What if identity cannot be verified?” — Shopping can continue without saved-memory access.

#### 3. How do you tell no memories from a failed request?
**Spoken:** “The Customer Agent tracks retrieved, empty, unavailable, and not-attempted separately. Only a successful empty recall is called empty; timeout or API error is unavailable.”
**Deeper / refs:** memory status and timeout branch. [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**.
**Follow-up:** “What does the LLM see?” — It receives retrieved text only on successful recall and is instructed not to fabricate remembered preferences.

#### 4. How do you stop bad operational outcomes entering memory?
**Spoken:** “The production Store outcome path requires verified-operation evidence and complete event, action, reobserved metric, and summary fields. Synthetic-demo evidence is rejected there.”
**Deeper / refs:** `hasVerifiedOutcomeEvidence` and Store action tool retention gate. [`hindsightCloudPolicy.ts`](./src/server/hindsightCloudPolicy.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**; upstream evidence truth still matters.
**Follow-up:** “Does a complete record prove it is true?” — No, it proves the application received the required fields/source marker.

#### 5. Did your status check create a bank?
**Spoken:** “No. The health check uses GET for version and bank configuration. It does not call create, retain, recall, reflect, or provisioning.”
**Deeper / refs:** `checkOperationalStatus()` and API status handler. [`hindsightService.ts`](./src/services/hindsightService.ts), [`api/hindsight/status.ts`](./api/hindsight/status.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**; previous live diagnostics were also GET-only.
**Follow-up:** “Does the test-bank button remain read-only?” — No, the separate retain/recall test workflow writes synthetic data and was not invoked.

### LLMs and agent orchestration

#### 6. Which models power the agents?
**Spoken:** “Customer and Store server code use the Groq chat-completions API and read `GROQ_MODEL`, defaulting in source to `qwen/qwen3.8-27b`. The deployed override and live model availability are not established in this guide.”
**Deeper / refs:** server model getters and request payloads. [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts), [`.env.example`](./.env.example).
**Status:** **IMPLEMENTED BUT NOT LIVE-VERIFIED**.
**Follow-up:** “Do the three agents each use a separate model?” — Customer and Store share configuration logic; Security is primarily deterministic in inspected paths.

#### 7. How do LLM tool calls become actions?
**Spoken:** “The model returns a named tool call with structured arguments. The server maps it to an application tool implementation, executes it, and uses the result for the follow-up answer. The model does not directly write arbitrary database commands.”
**Deeper / refs:** tool definitions and executor functions. [`customerAgentTools.ts`](./src/services/customerAgentTools.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**.
**Follow-up:** “Can the model invent a successful action?” — The prompt requires confirmation only after a successful tool result; client reconciliation checks cart state.

#### 8. Is this a multi-agent framework with autonomous planning?
**Spoken:** “It is a role-separated application architecture: Customer, Store, and Security have distinct responsibilities and tools. The main LLM paths are request-response tool selection, not a general autonomous planner or message-bus framework.”
**Deeper / refs:** API handlers and per-domain tool sets. [`api/customer-agent.ts`](./api/customer-agent.ts), [`api/store-agent/index.ts`](./api/store-agent/index.ts), [`securityAgent.ts`](./src/services/securityAgent.ts).
**Status:** **IMPLEMENTED** role separation; generalized orchestration **NOT IMPLEMENTED** in inspected code.
**Follow-up:** “Why call them agents?” — They combine domain prompts/policies, contextual state, and executable domain tools.

#### 9. What happens when Groq is unavailable?
**Spoken:** “The server detects missing configuration and returns an explicit error. Some supported shopping actions can be handled deterministically on the client, but that fallback does not mean the LLM request succeeded.”
**Deeper / refs:** agent config checks, error responses, deterministic cart command path. [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts), [`customerAgent.ts`](./src/services/customerAgent.ts).
**Status:** **IMPLEMENTED**, live provider outage behavior not exercised here.
**Follow-up:** “Does it silently switch model providers?” — Not established; source uses configured Groq path and its documented fallback handling.

#### 10. How is hallucination risk reduced?
**Spoken:** “Prompts tell the model to use tools for prices, stock, and operational facts, and to distinguish a search from a confirmed sale. The tool layer returns catalogue or app-state values; recommendations are not the authority for the underlying data.”
**Deeper / refs:** Customer/Store prompt rules and tools. [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**, not a formal hallucination guarantee.
**Follow-up:** “Can prompting eliminate hallucinations?” — No; we constrain and verify side effects and factual data rather than claiming elimination.

### JARVIS and voice processing

#### 11. Which STT engine is used?
**Spoken:** “The browser uses Web Speech API recognition, either `SpeechRecognition` or `webkitSpeechRecognition`, with an India locale selected for English, Telugu, or Hindi. It is not a server-hosted transcription model.”
**Deeper / refs:** recognition creation/locale in voice service. [`voiceService.ts`](./src/services/voiceService.ts).
**Status:** **PARTIALLY IMPLEMENTED**; browser/vendor availability not tested across devices.
**Follow-up:** “Does it work offline?” — Not established; browser speech recognition availability and network behavior vary.

#### 12. Which TTS engine is used?
**Spoken:** “Speech output uses browser `speechSynthesis` and installed system voices. Telugu voice selection can fall back if a Telugu voice is unavailable; chat remains the alternative.”
**Deeper / refs:** voice enumeration, language selection, synthesis error handling. [`voiceService.ts`](./src/services/voiceService.ts).
**Status:** **PARTIALLY IMPLEMENTED**, device voice quality not verified.
**Follow-up:** “Is this a Groq voice model?” — No evidence of a Groq TTS integration in the inspected path.

#### 13. How are Telugu-English requests interpreted?
**Spoken:** “The app uses language heuristics and prompt instructions, and passes a detected/preferred response language. It can recognize scripts and common Romanized patterns, but this is not a guarantee of perfect code-mixed understanding.”
**Deeper / refs:** `languageDetector` patterns and Groq prompt. [`languageDetector.ts`](./src/services/languageDetector.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts).
**Status:** **PARTIALLY IMPLEMENTED**; quality benchmark not verified.
**Follow-up:** “Is there a dedicated translation service?” — None established in this path.

#### 14. How does “add the third option” resolve?
**Spoken:** “The server tracks offered product context and can resolve ordinal follow-ups against that list. A unique offered SKU can be selected and then passed through the normal product/cart tool path.”
**Deeper / refs:** offered-product resolution and catalog tools. [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`customerAgentTools.ts`](./src/services/customerAgentTools.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**; broad typo correction is not.
**Follow-up:** “What if there are two possible third options?” — The request should be clarified; selection should not be guessed.

#### 15. Is conversation history durable across kiosk and mobile?
**Spoken:** “The shared handoff is designed to synchronize session and cart state. The inspected assistant history is session-keyed in memory; I cannot claim a durable shared transcript across devices.”
**Deeper / refs:** client/server recent history vs session sync APIs. [`customerAgent.ts`](./src/services/customerAgent.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts), [`sessionSyncService.ts`](./src/services/sessionSyncService.ts).
**Status:** **PARTIALLY IMPLEMENTED**; cart/session sync code exists, persistent conversation history not established.
**Follow-up:** “What is the durable shared object?” — The session and cart snapshot/revision, subject to deployed migration.

### CCTV and computer vision

#### 16. Does the app run object detection on video?
**Spoken:** “No. CCTV currently displays local media and emits a pre-authored event from a manifest. There is no detected object output, frame inference, or video tracking in the inspected code.”
**Deeper / refs:** media rendering and manifest event generation. [`CCTVSurveillanceHub.tsx`](./src/components/CCTVSurveillanceHub.tsx), [`cctvManifestService.ts`](./src/services/cctvManifestService.ts).
**Status:** **SIMULATED / SEEDED DEMO**; CV inference **NOT IMPLEMENTED**.
**Follow-up:** “Is there a YOLO model?” — No detector or weights were identified; do not claim YOLO/OpenCV.

#### 17. Are CCTV alerts real?
**Spoken:** “The displayed scenario event is authored in demo metadata. The manifest can record an alert in local state; a separate email provider exists, but I did not verify actual delivery.”
**Deeper / refs:** manifest demo flag/notification path and separate alert integration. [`cctvManifestService.ts`](./src/services/cctvManifestService.ts), [`securityAgent.ts`](./src/services/securityAgent.ts), [`emailProvider.ts`](./src/server/email/emailProvider.ts).
**Status:** **SIMULATED** UI event; email integration **IMPLEMENTED BUT NOT LIVE-VERIFIED**.
**Follow-up:** “Was a real theft detected?” — No; no real camera inference was performed.

#### 18. How are false positives handled?
**Spoken:** “The Security Agent has deterministic resolution logic and can use memory as context. In this CCTV demo, the initial event is scripted; the project does not calibrate false positives from detector output because no detector is present.”
**Deeper / refs:** security resolution and manifest. [`securityAgent.ts`](./src/services/securityAgent.ts), [`cctvManifestService.ts`](./src/services/cctvManifestService.ts).
**Status:** **PARTIALLY IMPLEMENTED**; no real model evaluation.
**Follow-up:** “What metric would you need?” — Labeled event ground truth with precision/recall and camera/environment evaluation.

#### 19. Is there real-time camera processing?
**Spoken:** “I found local MP4/image playback and manifest-generated events, not a live RTSP/camera feed or inference loop. It should be presented as a CCTV scenario demo.”
**Deeper / refs:** UI uses browser media elements; package/source inspection found no CV runtime. [`CCTVSurveillanceHub.tsx`](./src/components/CCTVSurveillanceHub.tsx), [`package.json`](./package.json).
**Status:** **NOT IMPLEMENTED** for live inference.
**Follow-up:** “Can it be extended?” — Yes, but live ingestion, decoding, model serving, and event validation must be built and tested.

### Store Agent and business logic

#### 20. Where do inventory and prices come from?
**Spoken:** “The Store and Customer tools read app catalog/inventory state through the project’s `db` and service layer. Seeded/local state exists; I did not find a verified external POS feed.”
**Deeper / refs:** catalog/cart tool functions and DB seed/persistence. [`customerAgentTools.ts`](./src/services/customerAgentTools.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts), [`db.ts`](./src/services/db.ts).
**Status:** **PARTIALLY IMPLEMENTED**; live retailer feed **NOT VERIFIED**.
**Follow-up:** “Can the model supply the price?” — No, price should come from the tool/catalog record.

#### 21. How are restock quantities calculated?
**Spoken:** “The LLM can choose the restock-recommendation tool, but the quantity logic is deterministic and uses current quantity, thresholds, demand/sales inputs, and unmet demand. Some scenarios include explicitly synthetic values.”
**Deeper / refs:** recommendation tool code and sample DB state. [`storeAgentTools.ts`](./src/services/storeAgentTools.ts), [`db.ts`](./src/services/db.ts).
**Status:** **IMPLEMENTED** formula over application data; the data may be **SIMULATED / SEEDED**.
**Follow-up:** “Is this a trained forecasting model?” — No such forecasting model was established.

#### 22. How do you distinguish demand from sales?
**Spoken:** “The Store prompt separates search, view, cart addition, checkout, and confirmed sale. Unfulfilled demand is a different signal; we do not call every product search a sale.”
**Deeper / refs:** system prompt and funnel tools. [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts), [`storeAgentTools.ts`](./src/services/storeAgentTools.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**; source signal fidelity is a deployment question.
**Follow-up:** “What confirms a sale?” — A confirmed order/payment record in the authoritative application data path, not a recommendation.

#### 23. Is the ROI a measured real-world result?
**Spoken:** “The ROI engine distinguishes actual, estimated, and projected results and has insufficient-data checks. Demo scenarios may contain synthetic values; I will not present projected or scripted values as observed savings.”
**Deeper / refs:** ROI calculation/classification and scenario fixtures. [`roiEngine.ts`](./src/services/roiEngine.ts), [`hindsightLearningScenarios.ts`](./src/services/hindsightLearningScenarios.ts).
**Status:** **PARTIALLY IMPLEMENTED**; live measurement **NOT VERIFIED**.
**Follow-up:** “What would make it actual?” — A verified operation and reobserved authoritative metric, retained with evidence.

#### 24. How do Hindsight memories affect a recommendation?
**Spoken:** “Store agent recalls up to four relevant outcomes and may request a reflection, then includes those as historical context. Its prompt says current inventory and telemetry remain authoritative.”
**Deeper / refs:** memory recall/reflection and prompt rules. [`groqStoreAgent.ts`](./src/server/groqStoreAgent.ts), [`hindsightService.ts`](./src/services/hindsightService.ts).
**Status:** **IMPLEMENTED BUT NOT LIVE-VERIFIED** for agent retrieval in this viva.
**Follow-up:** “Can prior memory override stock today?” — It should not; current tool data is authoritative.

### Supabase and database

#### 25. What is persisted in Postgres?
**Spoken:** “The schema models customers, identity tokens, preferences, OTPs, shopping sessions, carts/items, products, inventory, orders/payments, telemetry, and security events. It is repository schema evidence, not proof of a deployed database.”
**Deeper / refs:** table declarations and relationships. [`supabase/schema.sql`](./supabase/schema.sql).
**Status:** **IMPLEMENTED IN SQL FILE; DEPLOYMENT NOT VERIFIED**.
**Follow-up:** “How many tables are live?” — Not verified without inspecting the deployed schema.

#### 26. Does the browser write directly to all tables?
**Spoken:** “The intended split is public browser Supabase client versus privileged server admin client. The RLS migration revokes business-table access for public roles and grants service role; the product table has public read access.”
**Deeper / refs:** clients and RLS migration. [`supabase.ts`](./src/services/supabase.ts), [`supabaseAdmin.ts`](./src/server/supabaseAdmin.ts), [`20261011_rls_server_access.sql`](./supabase/migrations/20261011_rls_server_access.sql).
**Status:** **IMPLEMENTED IN CODE/SQL; LIVE RLS NOT VERIFIED**.
**Follow-up:** “Was the RLS migration applied?” — Unknown; migration files do not prove application.

#### 27. How are kiosk/mobile cart conflicts handled?
**Spoken:** “The shared-cart API uses a revision. A client sends its expected revision; the server checks it and performs a conditional update. A stale or losing writer gets HTTP 409 and the latest cart.”
**Deeper / refs:** `shopping_session_state`, CAS update and conflict response. [`api/session-sync.ts`](./api/session-sync.ts), [`20261010_persistent_session_cart_sync.sql`](./supabase/migrations/20261010_persistent_session_cart_sync.sql).
**Status:** **IMPLEMENTED IN CODE; LIVE DATABASE PATH NOT VERIFIED**.
**Follow-up:** “Is this a database transaction?” — It is optimistic concurrency via conditional update; broader transaction guarantees are not claimed.

#### 28. Are local records the same as live Supabase data?
**Spoken:** “Not necessarily. `db.ts` has a localStorage-backed state path and seeded catalog/demo records, while server routes can use Supabase. A successful UI action alone does not prove Supabase persistence.”
**Deeper / refs:** local state load/save and server admin client. [`db.ts`](./src/services/db.ts), [`supabaseAdmin.ts`](./src/server/supabaseAdmin.ts).
**Status:** **PARTIALLY IMPLEMENTED**; backend selection/configuration determines runtime path.
**Follow-up:** “What would verify it?” — Check the configured project and confirm the record through a read-only authorized query or app readback.

### QR and session security

#### 29. What exactly is in the session QR?
**Spoken:** “The server returns a mobile URL containing an opaque handoff token; `qrcode` encodes the stored payload. The QR is not just a session ID. A local fallback shape also includes type, session ID, token, and expiry.”
**Deeper / refs:** server URL creation, QR generation, API validation. [`api/session-sync.ts`](./api/session-sync.ts), [`qrService.ts`](./src/services/qrService.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**; deployed URL not checked.
**Follow-up:** “Can someone authorize by guessing a session ID?” — The API requires the bearer handoff credential and checks session/customer ownership.

#### 30. How is the handoff token generated?
**Spoken:** “The server API generates 32 random bytes and encodes them as base64url, stores the token and an expiry, and rotates it when exchanging the one-time QR for a sync credential. It is an opaque bearer secret, not a signed JWT.”
**Deeper / refs:** `randomBytes`, expiry, `used_at`, token exchange. [`api/session-sync.ts`](./api/session-sync.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**; DB/migration operation not live-tested.
**Follow-up:** “Is it single-use?” — QR exchange marks it used and replaces the stored token; practical enforcement depends on the deployed conditional DB update.

#### 31. How do QR scans work on devices?
**Spoken:** “The scanner prefers native `BarcodeDetector`, then `jsQR`, then ZXing, using camera access when available. A physical-device permission and compatibility test remains necessary.”
**Deeper / refs:** scanner fallback order and `getUserMedia`. [`CameraQRScanner.tsx`](./src/components/CameraQRScanner.tsx).
**Status:** **IMPLEMENTED**, physical-device behavior **NOT VERIFIED**.
**Follow-up:** “What if camera access is blocked?” — The scanner should expose its fallback/manual path rather than claiming a scan succeeded.

#### 32. Is the customer pass the same as a session handoff?
**Spoken:** “No. Customer identity is persistent across visits; a session handoff is temporary, visit-specific, expiring, and used to share that active session/cart with a phone.”
**Deeper / refs:** identity-token and session-handoff schema, routes. [`supabase/schema.sql`](./supabase/schema.sql), [`api/auth/otp.ts`](./api/auth/otp.ts), [`api/session-sync.ts`](./api/session-sync.ts).
**Status:** **IMPLEMENTED IN CODE/SCHEMA; deployed state NOT VERIFIED**.
**Follow-up:** “What expires?” — The session handoff token; customer identity has a distinct active/revoked lifecycle.

### 3D frontend and rendering

#### 33. Is the landing page actually 3D?
**Spoken:** “Yes, the landing scene is rendered with Three.js meshes, a camera, materials, and generated textures. It is a scripted visualization rather than a live store digital twin.”
**Deeper / refs:** renderer and scene helpers. [`Store3DCanvas.tsx`](./src/components/Store3DCanvas.tsx), [`supermarketModels.ts`](./src/components/supermarketModels.ts), [`supermarketTextures.ts`](./src/components/supermarketTextures.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**.
**Follow-up:** “Is it React Three Fiber?” — No evidence of that dependency/path; the implementation uses Three.js directly.

#### 34. How does the scene animate?
**Spoken:** “`LandingPage` defines narrative stages and timing; the canvas interpolates camera and object positions across authored waypoints. The motion is presentation logic, not a simulation responding to actual shop sensors.”
**Deeper / refs:** stage script/interpolation. [`LandingPage.tsx`](./src/pages/LandingPage.tsx), [`Store3DCanvas.tsx`](./src/components/Store3DCanvas.tsx).
**Status:** **IMPLEMENTED**, live-data connection **NOT IMPLEMENTED**.
**Follow-up:** “Is performance optimized for every device?” — No benchmark is available in this analysis.

### Testing, failure handling, limits, scale

#### 35. What do your tests actually prove?
**Spoken:** “The Hindsight policy/status test suite verifies policy and mocked request outcomes; the build verifies TypeScript/Vite compilation. Neither proves the production Groq, Supabase, email, or Hindsight memory workflow works end to end.”
**Deeper / refs:** package scripts and safe tests. [`package.json`](./package.json), [`scripts/test-hindsight-cloud-policy.mjs`](./scripts/test-hindsight-cloud-policy.mjs), [`hindsightDashboardStatus.safe.test.ts`](./src/tests/hindsightDashboardStatus.safe.test.ts).
**Status:** Hindsight tests passed 8/8 and build passed previously; broader tests not run for this document.
**Follow-up:** “Did you test real Hindsight?” — Read-only version/config calls succeeded; no retain/recall was performed.

#### 36. Which Hindsight status problem did you fix?
**Spoken:** “The old status path queried the removed bank-profile endpoint and Cloud returned 410. The implementation now uses the SDK’s supported config GET and reports a missing bank separately. That compatibility defect is proven, but it does not prove the screenshot’s earlier network message was caused by it.”
**Deeper / refs:** current `getBankConfig` check; installed SDK `getBankProfile` marked deprecated/removed. [`hindsightService.ts`](./src/services/hindsightService.ts), SDK `dist/index.js`.
**Status:** **FIXED AND CODE-VERIFIED**; historical banner cause **NOT VERIFIED**.
**Follow-up:** “What was the manual next check?” — Confirm the exact Store/Security bank names exist in the configured Cloud workspace; previous safe GETs returned 404.

#### 37. What limits should you disclose?
**Spoken:** “CCTV events are scripted, store inputs include local/seeded state, voice behavior depends on browser support, and production Supabase migrations/configuration have not been verified here. The product is a hackathon prototype with real integration code but not universal live proof.”
**Deeper / refs:** CCTV manifest, db local state, voice APIs, migration directory. [`cctvManifestService.ts`](./src/services/cctvManifestService.ts), [`db.ts`](./src/services/db.ts), [`voiceService.ts`](./src/services/voiceService.ts), [`supabase/migrations`](./supabase/migrations).
**Status:** **PARTIALLY IMPLEMENTED / SIMULATED**.
**Follow-up:** “What is strongest live evidence?” — Read-only Hindsight API connectivity and existing test-bank config request from Node/Vite in this session.

#### 38. How does the application avoid claiming a failed cart action succeeded?
**Spoken:** “Tool execution returns a structured result; the prompt asks the model to confirm only after verified success, and browser reconciliation checks inventory/cart state and shared-cart sync. Errors should be described as unconfirmed rather than success.”
**Deeper / refs:** customer tool execution and client reconciliation. [`customerAgentTools.ts`](./src/services/customerAgentTools.ts), [`customerAgent.ts`](./src/services/customerAgent.ts).
**Status:** **IMPLEMENTED AND CODE-VERIFIED**, full failure-injection coverage not established.
**Follow-up:** “What if the response times out after the write?” — The UI must read authoritative state before claiming completion; do not infer success from a missing response.

#### 39. What is the main scaling boundary?
**Spoken:** “The code has server API handlers and a hosted database integration, but localStorage-backed demo state, in-memory agent history, external API latency, and per-request tool operations are prototype limits. We have not benchmarked throughput or concurrency at store scale.”
**Deeper / refs:** Vite/Vercel routes, db local persistence, agent memory maps and timeouts. [`vite.config.ts`](./vite.config.ts), [`vercel.json`](./vercel.json), [`db.ts`](./src/services/db.ts), [`groqCustomerAgent.ts`](./src/server/groqCustomerAgent.ts).
**Status:** **PARTIALLY IMPLEMENTED**; performance testing **NOT VERIFIED**.
**Follow-up:** “Do you have a load-test result?” — None established by the inspected test/build evidence.

#### 40. What is your honest end-to-end demo claim?
**Spoken:** “I can demonstrate the application flows and code paths, and I can show a successful read-only Hindsight Cloud connection. I will label seeded CCTV/store scenarios as demos and will not claim a real memory-learning cycle, deployed migration, live CV detection, or measured business savings without validating those separately.”
**Deeper / refs:** whole architecture; Hindsight test flow is write-enabled and separately authorized. [`api/hindsight/status.ts`](./api/hindsight/status.ts), [`api/hindsight/test-bank.ts`](./api/hindsight/test-bank.ts), [`cctvManifestService.ts`](./src/services/cctvManifestService.ts), [`roiEngine.ts`](./src/services/roiEngine.ts).
**Status:** **IMPLEMENTED / PARTIALLY IMPLEMENTED / SIMULATED**, depending on individual path.
**Follow-up:** “What would you verify next?” — Confirm the two configured system banks in the Cloud workspace, then—only with approval—run the UUID-tagged existing test-bank retain/recall flow.

## 12. Technical cheat sheet

### Exact verified stack

- React **19.3.0**, TypeScript **6.0.3**, Vite **8.3.1**, Tailwind CSS **3.4.17**.
- Groq HTTP chat-completions integration; source fallback model `qwen/qwen3.8-27b`. Runtime model override intentionally not reproduced.
- `groq-sdk` **1.6.0** installed, but the inspected agent path uses `fetch`.
- Supabase JS **2.117.2**; PostgreSQL schema in repo. Deployed DB/migration status unknown.
- Hindsight TypeScript client **0.10.1**, Cloud API responded with **0.10.2** during prior read-only diagnostics.
- `qrcode` **1.5.4**, `jsqr` **1.4.0**, `@zxing/library` **0.21.3**.
- Three.js **0.186.1**, Framer Motion **14.0.0**, Recharts **3.10.1**.
- Browser Web Speech APIs for STT/TTS; no distinct hosted speech API established.

### Important routes/functions

- `POST /api/customer-agent` → `GroqCustomerAgentServer.processRequest()`.
- `POST /api/store-agent` → Store Agent request/tool execution; manager auth required.
- `GET /api/hindsight/status`, `GET /api/hindsight/activity`.
- `POST /api/hindsight/retain`, `/recall`, `/reflect`, `/lab`, `/test-bank`.
- `POST /api/session-sync` → handoff generation, exchange, session/cart sync.
- `api/auth/otp.ts`, `api/auth/manager.ts` → customer verification / manager session flows.

### Database and security reminders

- Business tables are described in `supabase/schema.sql`; `shopping_session_state` comes from `20261010_persistent_session_cart_sync.sql`.
- RLS intent appears in `20261011_rls_server_access.sql`; **do not say it is applied without deployed DB evidence**.
- Customer identity != visit session; customer-bank identity != session QR bearer token.
- API keys and service-role secrets stay server-side; do not expose `.env` or headers.

### QR, graphics, and CCTV

- QR generation: `qrcode`; scan fallback: `BarcodeDetector` → `jsQR` → ZXing.
- Session handoff server token: 32 bytes from `crypto.randomBytes`, base64url, stored, expiring and exchanged; not JWT.
- Landing visual: direct Three.js scene with generated assets and scripted interpolation.
- CCTV: local demo media and scripted manifest events; **no evidenced object detection/tracking pipeline**.

### Three strongest technical ideas to explain

1. Separate customer identity from visit-specific session/cart and isolate customer memory by verified identity.
2. Keep LLM recommendations separate from typed tools and authoritative domain values; use evidence gates before operational outcome retention.
3. Treat external memory as retrieval/context with explicit empty/failure states, rather than claiming model-weight learning.

### Five limitations to disclose

1. CCTV events are scripted demo events, not real-time vision inference.
2. Store/inventory telemetry includes local/seeded prototype state; no live POS/sensor feed was verified.
3. Groq, email delivery, voice devices, and deployed Supabase behavior were not all live-tested.
4. Schema/migration files do not prove migrations were applied; localStorage state may differ from database state.
5. Scripted Learning Lab / ROI examples are not verified real-world outcomes; Hindsight memory write→recall was not performed here.

### 60-second architecture explanation

“GrocerAI is a React and TypeScript application served by Vite locally and configured for Vercel API functions. The Customer and Store agents use Groq chat completions for language and tool selection, while typed application tools own catalog, cart, inventory, and recommendation operations. Supabase is the intended authoritative persistence layer, with separate public and server-admin clients; local seeded/browser state also supports the demo. Hindsight is an external memory layer: the server keeps its key private, uses customer-specific and fixed Store/Security banks, and injects retrieved experience into later prompts. QR handoff code shares a verified session/cart with a mobile client. The Three.js landing scene is real browser 3D, while CCTV is scripted local-media demonstration, not computer vision. We have source-level tests and a successful build, plus read-only Hindsight Cloud connectivity checks; deployed database migrations and a live memory retain/recall cycle remain to be verified.”

### Two-minute technical explanation

“The app is organized around domain responsibilities rather than one unrestricted chatbot. The Customer UI submits language, session, cart, and available identity context to `/api/customer-agent`. The server validates any customer-memory identity, retrieves eligible Hindsight preferences, builds a prompt grounded in current application state, and lets Groq choose among typed product and cart tools. Tool results are executed by the application; the client reconciles the cart and shared-session revision before presenting a success message. The Store Agent follows the same pattern with manager authorization: the LLM interprets intent, but Store tools return current quantities and deterministic recommendation calculations. The Security Agent is predominantly deterministic and may use memory as supporting context, never as an authorization bypass.

“Hindsight uses the TypeScript client on the server. Customer banks are derived from verified customer IDs; Store and Security IDs are fixed. Retention gates distinguish durable/verified evidence from transient, sensitive, or synthetic demo content. Memory retrieval is contextual information, not weight training. The status check uses read-only version/configuration GETs. During this diagnostic we verified DNS, TLS, HTTPS, and authenticated SDK access from Node/Vite; the existing test bank responded, while Store and Security bank config returned 404. The earlier code used a removed bank-profile route that returned 410, and it has been replaced by the supported config read; that compatibility bug does not prove the exact cause of the historical network banner.

“The database repository describes customer, session, cart, inventory, order, payment, security, and telemetry tables. Separate public and privileged Supabase clients and an RLS migration show the intended boundary, but deployment and migration application are not verified. Session QR uses a server-generated random bearer token with expiry and a one-time exchange, while cart synchronization uses revisions and conflict responses. The 3D landing experience is a scripted Three.js scene. CCTV is local media mapped to synthetic manifest events; there is no demonstrated video inference or tracker. So I describe the project accurately as a hackathon prototype with real integration code, deterministic application logic, and clearly labeled seeded/simulated demonstrations.”

### Claims not to make

- “The CCTV uses YOLO/OpenCV, detects theft, or tracks people in real time.”
- “All product/inventory/footfall data comes from a live store/POS/sensors.”
- “The agents fine-tune or update model weights through Hindsight.”
- “A build or mocked test proves live Groq, Supabase, email, or memory-write behavior.”
- “All SQL migrations are deployed or RLS is active in production.”
- “A scripted ROI or Learning Lab value is an observed business result.”
- “The screenshot’s historical `NETWORK UNREACHABLE` cause is definitively known.”
- “The Store and Security Cloud banks exist.” Prior read-only config checks returned 404 for those exact IDs.
- “The test bank retain→recall cycle was run.” It was not.
- “The app uses React Three Fiber, an external speech model, or a CV model” without a new source verification.

