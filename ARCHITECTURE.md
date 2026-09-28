# GrocerAI Architecture

## 1. System Overview

GrocerAI is a self-adaptive AI grocery store built around two coordinated AI agents:

- **Customer Agent** — understands the needs, mission, preferences, and next-best assistance for an individual customer.
- **Store Agent** — understands inventory, demand, sales, store activity, stockouts, queues, recommendations, and operational decisions.

The two agents operate over shared application state while maintaining separate responsibilities.

The core adaptive loop is:

**OBSERVE → RECALL → REASON → ACT → RE-OBSERVE → LEARN/RETAIN → FUTURE RECALL**

GrocerAI separates:

- **Structured application state** — current facts and operational state.
- **Hindsight memory** — meaningful experiences and outcomes that can influence future reasoning.

---

## 2. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │      Customer        │
                         │ Shared Store Display │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Customer Agent     │
                         │   Groq + Tools       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │     Application Services     │
                    │                              │
                    │ Cart • Mission • Inventory   │
                    │ Orders • Events • Voice      │
                    │ Notifications • Analytics    │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       ┌──────────────────────┐      ┌────────────────────────┐
       │ Structured State     │      │ Hindsight Memory       │
       │                      │      │                        │
       │ Current facts        │      │ Customer experiences   │
       │ Inventory            │      │ Store experiences      │
       │ Cart / Orders        │      │ Preferences            │
       │ Missions             │      │ Actions + outcomes     │
       │ Events              │      │ Previous decisions      │
       └──────────────────────┘      └────────────────────────┘
                    ▲                             ▲
                    │                             │
                    │                Recall / Retain / Reflect
                    │                             │
                    │                             │
             ┌──────┴─────────────────────────────┴──────┐
             │              Store Agent                  │
             │              Groq + Tools                 │
             └──────────────────┬────────────────────────┘
                                ▲
                                │
                 ┌──────────────┴──────────────┐
                 │ Store Signals               │
                 │                             │
                 │ Inventory • Demand          │
                 │ Sales • Traffic             │
                 │ Checkout Queues              │
                 │ Stockouts • Requests        │
                 └─────────────────────────────┘
