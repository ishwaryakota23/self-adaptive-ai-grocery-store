# GrocerAI — Self-Adaptive AI Grocery Store Platform

GrocerAI is an intelligent physical grocery store platform driven by two coordinated autonomous agents operating over a shared event and inventory ledger:

1. **Customer Agent**: Understands natural language shopping requests (multilingual & voice-enabled in English, Telugu, and Hindi), tracks real-time cart state, plans optimal store navigation routes, handles intelligent out-of-stock substitutions, and remembers individual customer dietary habits and preferences across visits.
2. **Store Agent**: Monitors physical store telemetry, inventory movements, shelf depletion, foot traffic, and demand funnels; autonomously synthesizes prioritized restock and operational recommendations for store managers; and adapts operational decisions over time through closed-loop experiential learning.

Both agents leverage **Hindsight** (`vectorize-io/hindsight`) as an experiential memory layer to retain past operational outcomes and customer preferences, semantic recall relevant context, and learn continuously:

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
                     |  grocerai-customer-${customerId}                  |  grocerai-store-main
                     +-------------------------+-------------------------+
                                               |
                                               v
                                +------------------------------+
                                |   Hindsight Memory Engine    |
                                |   - Embedded PostgreSQL      |
                                |   - pgvector 0.8.5           |
                                |   - Semantic Vector Recall   |
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
- **Manager Audit Panel**: Real-time Hindsight connection badge, interactive semantic recall sandbox, and live activity log.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **AI / LLM**: Groq Cloud API (`llama-3.3-70b-versatile` / `qwen/qwen3.8-27b`)
- **Memory Engine**: Hindsight (`@vectorize-io/hindsight-client`), running on Python 3.11 with `uvx hindsight-api`
- **Vector Database**: Embedded PostgreSQL 18.1.0 with pgvector 0.8.5
- **Testing**: Node.js / `tsx` automated verification suites (160 tests)

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Groq API Key (from [console.groq.com](https://console.groq.com/keys))

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your Groq API credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```ini
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
HINDSIGHT_BASE_URL=http://localhost:8888
HINDSIGHT_API_KEY=
HINDSIGHT_API_LLM_PROVIDER=groq
HINDSIGHT_STORE_BANK=grocerai-store-main
```

> **Security Note**: Never commit `.env` to Git. The `.gitignore` file is configured to strictly exclude `.env` and all secret files.

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Hindsight Server (Optional / For Persistent Memory)
```bash
python scripts/start-hindsight.py
```
*Note: If Hindsight is not running, GrocerAI automatically operates in graceful offline fallback mode without breaking user checkout or shopping interactions.*

### 5. Start Frontend Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the 17-screen physical grocery store application.

---

## Verification Test Suites

GrocerAI includes automated verification test suites:

```bash
# 1. Hindsight Experiential Memory & Learning (34 tests)
npx tsx src/tests/verify_hindsight.ts

# 2. Customer Agent Multilingual & Voice Tools (38 tests)
npx tsx src/tests/verify_customer_agent.ts

# 3. Store Agent Managerial Tools & Telemetry (42 tests)
npx tsx src/tests/verify_store_agent.ts

# 4. Phase 2 Session & Order Lifecycle Baseline (45 tests)
npx tsx src/tests/verify_phase2.ts

# 5. Production TypeScript Build
npm run build
```

**Verification Results: 160 / 160 Tests Passing (100%)**

---

## Documentation
- Detailed Hindsight implementation: [`HINDSIGHT_IMPLEMENTATION_REPORT.md`](./HINDSIGHT_IMPLEMENTATION_REPORT.md)
- Database schema: [`supabase/schema.sql`](./supabase/schema.sql)
- Sample seed data: [`supabase/seed.sql`](./supabase/seed.sql)

---

## License
MIT
