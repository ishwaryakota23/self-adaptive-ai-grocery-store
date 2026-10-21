# GrocerAI — Self-Adaptive AI Grocery Store Platform

GrocerAI is an intelligent physical grocery store platform driven by two coordinated autonomous agents operating over a shared event and inventory ledger:

1. **Customer Agent**: An Alexa+ inspired (unofficial) conversational grocery-shopping simulation. It understands natural-language requests (English, Telugu, Hindi), recommends only real catalogue products, explains its choices, manages the active cart, plans store routes, handles substitutions, and can use customer preferences where available.
2. **Store Agent**: Monitors physical store telemetry, inventory movements, shelf depletion, foot traffic, and demand funnels; autonomously synthesizes prioritized restock and operational recommendations for store managers; and adapts operational decisions over time through closed-loop experiential learning.

The Customer, Store, and Security agents use GrocerAI's native Supabase-backed memory engine for scoped recall and deterministic reflection. Setup and migration steps are in [NATIVE_MEMORY_ENGINE.md](./NATIVE_MEMORY_ENGINE.md).

$$\text{Observe} \longrightarrow \text{Recall} \longrightarrow \text{Reason} \longrightarrow \text{Act} \longrightarrow \text{Retain Outcome} \longrightarrow \text{Adapt Future Decisions}$$

---

## Architecture Overview

```
                                +-----------------------------+
                                |  Physical Grocery Store &   |
                                |  Customer / Manager Devices |
                                +--------------+--------------+
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
      +------------------------------+                    +------------------------------+
      |        Customer Agent        |                    |         Store Agent          |
      |   - Multilingual (En/Te/Hi)  |                    |   - 25 Operational Tools     |
      |   - Voice STT / TTS Pipeline |                    |   - Real-Time Store Telemetry|
      |   - 20 Real Backend Tools    |                    |   - Formulaic Restock Logic  |
      |   - Dynamic Substitutions    |                    |   - Closed-Loop Adaptation   |
      +--------------+---------------+                    +--------------+---------------+
                     |                                                   |
                     |  Supabase customer / branch / session scopes      |
                     +-------------------------+-------------------------+
                                               |
                                               v
                                +------------------------------+
                                |  Native GrocerAI Memory      |
                                |  - Supabase PostgreSQL       |
                                |  - Full-text + term ranking  |
                                |  - Deterministic reflection  |
                                +--------------+---------------+
                                               |
                                               v
                                +------------------------------+
                                | Authoritative Data & Events  |
                                |   - 17-Table Schema / DB     |
                                |   - Append-Only Event Ledger |
                                |   - Strict Session Isolation |
                                +------------------------------+
```

---

## Core Capabilities

### Customer Agent
- **Multilingual & Code-Mixed Understanding**: Native comprehension of English, Telugu (Telugu script & Romanized), Hindi (Devanagari & Hinglish), and code-mixed inputs.
- **Voice Pipeline**: Web Speech API STT and TTS with graceful degradation to text.
- **20 Real Backend Tools**: Product lookup, availability checking, price verification, shelf aisle routing, cart management, shopping mission tracking, and dynamic substitutions.
- **Personalized Memory Banks**: Remembers dietary restrictions (e.g. lactose intolerance, vegan) and preferred brands with cross-lingual recall.

### Store Agent & Dashboard
- **25 Managerial Tools**: Store overview, inventory status, stockout alarms, demand funnel telemetry, unfulfilled customer demand, aisle foot traffic, and checkout queue wait times.
- **Formulaic Restock Reasoning**: Synthesizes restock orders with multi-signal evidence, calculating quantities based on demand velocity, lost searches, and historical stockout post-mortems.
- **Closed-Loop Adaptation**: Learns from historical restock outcomes (e.g. adapting milk restock quantities from 30 to $\ge 50$ units after past rush stockouts).
- **Manager Memory Views**: Existing memory demonstration screens are legacy UI and are not yet connected to the native memory records.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **AI / LLM**: Groq Cloud API (`llama-3.3-70b-versatile` / `qwen/qwen3.8-27b`)
- **Memory Engine**: Native TypeScript service with Supabase/PostgreSQL full-text search
- **Database**: Supabase PostgreSQL (memory migration must be applied manually)
- **Testing**: Node.js / `tsx` automated verification suites (160 tests)

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Groq API Key (from [console.groq.com](https://console.groq.com/keys))

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your Groq API credentials:

Native memory also needs the existing server-side `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or service-role alias). Apply the migration described in [NATIVE_MEMORY_ENGINE.md](./NATIVE_MEMORY_ENGINE.md). No external memory service or memory-specific API key is required.

```bash
cp .env.example .env
```

Edit `.env`:
```ini
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

> **Security Note**: Never commit `.env` to Git. The `.gitignore` file is configured to strictly exclude `.env` and all secret files.

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Frontend Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the 17-screen physical grocery store application.

## Amazon Build, Ship, Shape Demo

The customer experience is an Alexa+ inspired GrocerAI simulation; it is not an official Amazon or Alexa service and does not require an Amazon account or Alexa device. Open the app, choose **Customer**, then open **Shopping Assistant** (or visit `/customer/assistant`). Chat is the default; voice mode uses the browser's speech-recognition and speech-synthesis support when available.

For a reliable live demo:

1. Configure `GROQ_API_KEY` in the server-side `.env` file to enable conversational reasoning. Product, availability, aisle, and cart facts are grounded by GrocerAI's existing catalogue and tools.
2. Configure Supabase using the existing `SUPABASE_URL`, publishable/anon key, and server-only secret key settings when demonstrating cross-device cart/session synchronization. Without Supabase, the local demo can still use the app's existing local data mode.
3. Run `npm install`, then `npm run dev`, and open `http://localhost:3000`.
4. Ask for a product or meal idea, then tap **Add to cart** on an in-stock catalogue card. If a request matches multiple brands or sizes, choose the exact item. Try “Remove [catalogue product] from my cart” and “What is in my cart?”, then confirm the same cart appears on the cart and checkout pages.
5. To demonstrate voice, allow microphone access in a supported browser. Start a conversation by tapping the voice control or saying “Hey Alexa”; follow-up turns remain conversational without repeating the wake phrase. Text chat stays available as a fallback.

Checkout and payment remain the existing store simulation; no real payment is taken. Native memory requires Supabase configuration and the manual migration above; shopping and checkout continue if memory is unavailable.

---

## Verification Test Suites

GrocerAI includes automated verification test suites:

```bash
# Native Memory, Agent Integration, Isolation, Outage Handling, and 21 Scenarios
npm run test:native-memory

# 2. Customer Agent Multilingual & Voice Tools (38 tests)
npx tsx src/tests/verify_customer_agent.ts

# 3. Store Agent Managerial Tools & Telemetry (42 tests)
npx tsx src/tests/verify_store_agent.ts

# 4. Phase 2 Session & Order Lifecycle Baseline (45 tests)
npx tsx src/tests/verify_phase2.ts

# 5. Production TypeScript Build
npm run build
```

The native memory test script covers ranked recall, deterministic reflection, authorization, user/branch isolation, database failure handling, all 21 memory scenarios, and Customer/Store/Security agent context paths.

---

## Documentation
- Native memory architecture and migration steps: [`NATIVE_MEMORY_ENGINE.md`](./NATIVE_MEMORY_ENGINE.md)
- Database schema: [`supabase/schema.sql`](./supabase/schema.sql)
- Sample seed data: [`supabase/seed.sql`](./supabase/seed.sql)

---

## License
MIT
