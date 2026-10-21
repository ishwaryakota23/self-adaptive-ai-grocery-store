# GrocerAI Architecture

## 1. System Overview

GrocerAI is a self-adaptive AI grocery store built around two coordinated AI agents:

- **Customer Agent** â€” understands the needs, mission, preferences, and next-best assistance for an individual customer.
- **Store Agent** â€” understands inventory, demand, sales, store activity, stockouts, queues, recommendations, and operational decisions.

The two agents operate over shared application state while maintaining separate responsibilities.

The core adaptive loop is:

**OBSERVE â†’ RECALL â†’ REASON â†’ ACT â†’ RE-OBSERVE â†’ LEARN/RETAIN â†’ FUTURE RECALL**

GrocerAI separates:

- **Structured application state** â€” current facts and operational state.
- **Native memory** â€” scoped experiences and outcomes stored in Supabase PostgreSQL and retrieved for agent context.

---

## 2. High-Level Architecture

```text
                         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                         â”‚      Customer        â”‚
                         â”‚ Shared Store Display â”‚
                         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
                         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                         â”‚   Customer Agent     â”‚
                         â”‚   Groq + Tools       â”‚
                         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚     Application Services     â”‚
                    â”‚                              â”‚
                    â”‚ Cart â€¢ Mission â€¢ Inventory   â”‚
                    â”‚ Orders â€¢ Events â€¢ Voice      â”‚
                    â”‚ Notifications â€¢ Analytics    â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                   â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â–¼                             â–¼
       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â”‚ Structured State     â”‚      â”‚ Native Memory       â”‚
       â”‚                      â”‚      â”‚                        â”‚
       â”‚ Current facts        â”‚      â”‚ Customer experiences   â”‚
       â”‚ Inventory            â”‚      â”‚ Store experiences      â”‚
       â”‚ Cart / Orders        â”‚      â”‚ Preferences            â”‚
       â”‚ Missions             â”‚      â”‚ Actions + outcomes     â”‚
       â”‚ Events              â”‚      â”‚ Previous decisions      â”‚
       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                    â–²                             â–²
                    â”‚                             â”‚
                    â”‚                Recall / Retain / Reflect
                    â”‚                             â”‚
                    â”‚                             â”‚
             â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”
             â”‚              Store Agent                  â”‚
             â”‚              Groq + Tools                 â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                â–²
                                â”‚
                 â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                 â”‚ Store Signals               â”‚
                 â”‚                             â”‚
                 â”‚ Inventory â€¢ Demand          â”‚
                 â”‚ Sales â€¢ Traffic             â”‚
                 â”‚ Checkout Queues              â”‚
                 â”‚ Stockouts â€¢ Requests        â”‚
                 â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

