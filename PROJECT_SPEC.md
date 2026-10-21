# GrocerAI â€” Self-Adaptive AI Grocery Store

## Vision

GrocerAI is an intelligent physical grocery store that understands customers, remembers meaningful experiences, observes store conditions, takes actions, and learns from outcomes.

It is not simply a grocery chatbot or shopping assistant. The goal is to make the store itself intelligent and adaptive.

Core loop:

**OBSERVE â†’ RECALL â†’ REASON â†’ ACT â†’ RE-OBSERVE â†’ LEARN/RETAIN â†’ FUTURE RECALL**

## Core Agents

### Customer Agent

The Customer Agent focuses on the needs of an individual customer.

It supports:

* Voice and chat interaction
* English, Telugu, Hindi and code-mixed interaction
* Natural-language shopping requests
* Product discovery and details
* Real-time availability
* Store navigation
* Shopping missions
* Cart assistance
* Personalized recommendations
* Product substitutions
* Proactive notifications

The Customer Agent uses Groq for reasoning and backend tools for interacting with application state.

### Store Agent

The Store Agent focuses on store-wide operational intelligence.

It works with:

* Inventory
* Customer requests
* Demand
* Unfulfilled demand
* Sales
* Aisle traffic
* Checkout queues
* Stockouts
* Restocking
* Operational recommendations
* Manager actions
* Action outcomes

The Store Agent combines current store state, operational events, Native Memory memory, and Groq reasoning.

## Agent Separation

The two agents have separate responsibilities.

### Customer Agent

**Individual customer â†’ personalized assistance**

### Store Agent

**Store-wide signals â†’ operational intelligence**

Both agents can access authoritative application state through application services, while customer memories remain isolated between customers.

## Core Learning Loop

OBSERVE â†’ RECALL â†’ REASON â†’ ACT â†’ RE-OBSERVE â†’ LEARN/RETAIN â†’ FUTURE RECALL

### Observe

The agents observe current state and events.

Examples:

* Customer request
* Current mission
* Product availability
* Inventory levels
* Search demand
* Stockouts
* Sales
* Traffic
* Checkout queues
* Manager decisions

### Recall

Relevant past experience is retrieved from Native Memory.

### Reason

Groq combines:

* Current application state
* Current situation
* Relevant Native Memory experience
* Available tools

### Act

The agent performs or recommends an action.

### Re-observe

The system checks what happened after the action.

### Learn

Meaningful outcomes are retained in Native Memory so that similar future situations can benefit from the experience.

## Memory

Native Memory is the long-term experiential memory layer.

### Structured Application State

The application state represents current facts such as:

* Customers and sessions
* Products
* Inventory
* Carts
* Missions
* Orders
* Payments
* Events
* Notifications
* Store activity
* Demand signals
* Recommendations

The current runtime uses local persistence/localStorage as its active fallback.

Supabase/PostgreSQL schema and integration support are included for database-backed persistence.

### Native Memory

The native TypeScript engine stores eligible, actual experiences and outcomes in Supabase PostgreSQL:

#### Customer Memory

* Preferences
* Brand preferences
* Accepted/rejected recommendations
* Substitution outcomes
* Recurring shopping patterns
* Previous shopping mission experiences
* Unavailable product requests

Customer memory is filtered by verified customer identity. Store and Security records are limited to the authorized manager branch.

#### Store Memory

* Repeated product requests
* Stockout experiences
* Demand spikes
* Unfulfilled demand
* Restocking decisions
* Manager decisions
* Operational actions
* Action outcomes

Store memory represents branch-level operational experience.

## Native Memory Operations

The implementation provides:

* Retain â€” store meaningful experiences and outcomes
* Recall â€” retrieve relevant previous experiences
* Reflect â€” apply deterministic, reusable pattern rules to recalled history

Raw clicks and raw audio are not treated as long-term memory by default.

## Customer Learning

The Customer Agent follows:

Customer Request
â†“
Recall Relevant Experience
â†“
Groq Reasoning
â†“
Backend Action
â†“
Observe Outcome
â†“
Retain Meaningful Experience
â†“
Future Personalized Assistance

The goal is to use previous experiences to improve future customer assistance.

## Store Learning

The Store Agent follows:

Store Signal
â†“
Recall Relevant Experience
â†“
Groq Reasoning
â†“
Recommendation / Action
â†“
Re-observe Outcome
â†“
Retain Outcome
â†“
Future Context-Aware Recommendation

Example:

A previous demand spike leads to a restocking action. The outcome is retained in Native Memory. When a similar demand spike occurs later, the previous experience can be recalled and used together with current store data to improve the next recommendation.

## Demand Funnel

GrocerAI distinguishes different levels of demand:

SEARCH DEMAND
â†“
INTEREST
â†“
SHOPPING INTENT
â†“
CHECKOUT INTENT
â†“
CONFIRMED DEMAND

Unfulfilled demand is tracked separately.

Only successful purchases become confirmed sales.

Cart additions, searches, product views, and failed or abandoned checkout attempts are not automatically treated as completed purchases.

## Transaction Semantics

### Cart

Temporary shopping intent.

### Checkout

Attempt to complete a transaction.

### Successful Payment

Creates the confirmed order and completed transaction state.

### Failed / Abandoned Payment

Does not create:

* Completed order
* Confirmed sale
* Inventory deduction

## Product Substitution

When a requested product is unavailable, the system can evaluate alternatives.

Substitution outcomes can record:

* Requested product
* Availability
* Suggested substitute
* Customer acceptance/rejection
* Quantity
* Resulting purchase/order
* Timestamp

Meaningful substitution outcomes can become future customer experiences.

## Customer Store Display

The main store display supports:

* Store entry
* Interaction mode
* Product discovery
* Product details
* Availability
* Shopping missions
* Store navigation
* Recommendations
* Cart
* Checkout
* Customer Agent
* Voice interaction

The store display is a shared physical interface.

## Customer Mobile Companion

A QR/session flow activates a personal mobile companion.

It focuses on:

* Shopping mission
* Mission progress
* Items still needed
* Recommendations
* Customer Agent
* Notifications
* Availability
* Location guidance
* Personalized navigation
* Preferences
* Synchronized cart/session state

The mobile companion and store display use the same customer session and shopping state.

## Manager Dashboard

The protected manager experience provides:

* Inventory intelligence
* Sales analytics
* Demand analysis
* Unmet demand
* Aisle traffic
* Checkout queues
* Store Agent recommendations
* Store memory
* Operational actions

Recommendations can be:

* Approved
* Modified
* Dismissed

Actions and outcomes are retained for future operational learning.

## Interaction Modes

GrocerAI supports:

### Voice

Voice Input â†’ Speech-to-Text â†’ Customer Agent â†’ Groq Reasoning â†’ Backend Tools â†’ Response â†’ Text-to-Speech

### Chat

Natural-language interaction with the Customer Agent.

### Proactive Assistance

Context-aware notifications and follow-up based on the customer's active mission and application state.

Chat is one interaction mode, not the entire application.

## Event History

GrocerAI maintains an event stream for application and operational activity.

Events can include:

* Customer ID
* Product ID
* Session ID
* Event type
* Timestamp
* Metadata
* Related order
* Related action
* Agent information

The event stream provides operational history.

Native Memory stores selected meaningful experiential memory.

## Service Boundaries

The implementation maintains clear service boundaries including:

* customerAgent
* customerAgentTools
* storeAgent
* storeAgentTools
* memoryEngine
* memoryService
* sessionService
* missionService
* cartService
* inventoryService
* orderService
* paymentService
* eventService
* notificationService
* voiceService
* analyticsService
* managerService

## Security

The system must:

* Keep API credentials server-side
* Use environment variables for secrets
* Never commit .env
* Provide .env.example
* Keep Groq and Supabase service-role credentials out of frontend code
* Isolate customer memory by customer identity
* Protect manager functionality

## Current Runtime

The current implementation consists of:

React + TypeScript Frontend
â†“
Application Services
â†“
Customer Agent / Store Agent
â†“
Groq Reasoning + Backend Tools
â†“
Structured Application State
â†•
Native GrocerAI Memory

Current development persistence uses local persistence/localStorage.

Supabase/PostgreSQL integration and schema support are included for database-backed persistence.

Native memory uses the existing server-side Supabase URL and service-role secret; it does not require a separate memory service or key.

## Production Considerations

Deployment requires production-specific configuration for:

* Application hosting
* Persistent database
* Supabase PostgreSQL database and manually applied memory migration
* Groq credentials
* Supabase server credential
* Secure environment variables

The native memory migration is not applied automatically. See `NATIVE_MEMORY_ENGINE.md` before deployment.

## Core Demo Story

### Customer

1. Customer interacts with the Customer Agent.
2. Agent understands the shopping requirement.
3. Agent checks availability.
4. Agent creates or updates a shopping mission.
5. Agent recommends or navigates to relevant products.
6. Customer receives proactive assistance.
7. Meaningful experience is retained.

### Store

8. Store Agent observes operational signals.
9. Agent identifies demand, stockout, traffic, queue, or unmet-demand patterns.
10. Agent recalls relevant previous experience.
11. Agent reasons about the current situation.
12. Agent recommends an action.
13. Manager approves, modifies, or dismisses it.
14. Action is performed.
15. System re-observes the result.
16. Outcome becomes future memory.
17. A later similar situation can recall that experience.

## Core Product Principle

GrocerAI must not become a collection of disconnected screens.

The customer interface, mobile companion, manager dashboard, application state, agents, events, memory, and operational actions form one connected system.

**The store observes, remembers, reasons, acts, observes again, and learns from the outcome.**

Native memory is used by Customer, Store, and Security agent paths to retrieve scoped past experiences and outcomes for future context.

