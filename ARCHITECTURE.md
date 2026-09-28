# Architecture

## High-Level Architecture

Customer
   ↓
Customer Agent
   ↓
Application Services
   ↓
Database + Hindsight Memory
   ↑
Store Agent
   ↑
Store Events / Inventory / Traffic / Queues

## Frontend

- React
- TypeScript
- Tailwind CSS
- Responsive UI

## Backend / Data

- Supabase
- PostgreSQL
- Authentication
- Application state

## Long-Term Memory

Hindsight is used for persistent agent memory.

Database:
- Current application state
- Inventory
- Orders
- Missions
- Events
- Operational state

Hindsight:
- Long-term experiences
- Customer preferences
- Store experiences
- Previous actions and outcomes
- Context used for future reasoning

## Agent Services

The implementation should maintain clear service boundaries:

- customerAgent
- storeAgent
- memoryService
- voiceService
- notificationService

## Customer Flow

Interaction
→ Understand intent
→ Create/update mission
→ Check availability
→ Recommend
→ Navigate
→ Proactively follow up
→ Complete shopping

## Store Flow

Observe store
→ Detect signal
→ Recall relevant experience
→ Reason
→ Recommend action
→ Execute action
→ Re-observe
→ Store outcome

## Important Principle

Do not turn the application into a collection of disconnected screens.

Navigation, state changes, agent actions, memory, and database state should
form one connected system.
