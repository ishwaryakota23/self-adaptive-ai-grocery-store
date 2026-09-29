# GrocerAI — Self-Adaptive AI Grocery Store

## Vision

GrocerAI is an intelligent physical grocery store that understands customers, remembers meaningful experiences, observes store conditions, takes actions, and learns from outcomes.

It is not simply a grocery chatbot or shopping assistant. The goal is to make the store itself intelligent and adaptive.

Core loop:

**OBSERVE → RECALL → REASON → ACT → RE-OBSERVE → LEARN/RETAIN → FUTURE RECALL**

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

The Store Agent combines current store state, operational events, Hindsight memory, and Groq reasoning.

## Agent Separation

The two agents have separate responsibilities.

### Customer Agent

**Individual customer → personalized assistance**

### Store Agent

**Store-wide signals → operational intelligence**

Both agents can access authoritative application state through application services, while customer memories remain isolated between customers.

## Core Learning Loop

OBSERVE → RECALL → REASON → ACT → RE-OBSERVE → LEARN/RETAIN → FUTURE RECALL

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

Relevant past experience is retrieved from Hindsight.

### Reason

Groq combines:

* Current application state
* Current situation
* Relevant Hindsight experience
* Available tools

### Act

The agent performs or recommends an action.

### Re-observe

The system checks what happened after the action.

### Learn

Meaningful outcomes are retained in Hindsight so that similar future situations can benefit from the experience.

## Memory

Hindsight is the long-term experiential memory layer.

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

### Hindsight Memory

Hindsight stores meaningful experiences such as:

#### Customer Memory

* Preferences
* Brand preferences
* Accepted/rejected recommendations
* Substitution outcomes
* Recurring shopping patterns
* Previous shopping mission experiences
* Unavailable product requests

Customer memory is isolated by customer identity.

#### Store Memory

* Repeated product requests
* Stockout experiences
* Demand spikes
* Unfulfilled demand
* Restocking decisions
* Manager decisions
* Operational actions
* Action outcomes

Store memory represents store-level operational experience.

## Hindsight Operations

The implementation uses:

* Retain — store meaningful experiences and outcomes
* Recall — retrieve relevant previous experiences
* Reflect — selectively reason over accumulated experience

Raw clicks and raw audio are not treated as long-term memory by default.

## Customer Learning

The Customer Agent follows:

Customer Request
↓
Recall Relevant Experience
↓
Groq Reasoning
↓
Backend Action
↓
Observe Outcome
↓
Retain Meaningful Experience
↓
Future Personalized Assistance

The goal is to use previous experiences to improve future customer assistance.

## Store Learning

The Store Agent follows:

Store Signal
↓
Recall Relevant Experience
↓
Groq Reasoning
↓
Recommendation / Action
↓
Re-observe Outcome
↓
Retain Outcome
↓
Future Context-Aware Recommendation

Example:

A previous demand spike leads to a restocking action. The outcome is retained in Hindsight. When a similar demand spike occurs later, the previous experience can be recalled and used together with current store data to improve the next recommendation.

## Demand Funnel

GrocerAI distinguishes different levels of demand:

SEARCH DEMAND
↓
INTEREST
↓
SHOPPING INTENT
↓
CHECKOUT INTENT
↓
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

Voice Input → Speech-to-Text → Customer Agent → Groq Reasoning → Backend Tools → Response → Text-to-Speech

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

Hindsight stores selected meaningful experiential memory.

## Service Boundaries

The implementation maintains clear service boundaries including:

* customerAgent
* customerAgentTools
* storeAgent
* storeAgentTools
* hindsightService
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
* Keep Groq and Hindsight credentials out of frontend code
* Isolate customer memory by customer identity
* Protect manager functionality

## Current Runtime

The current implementation consists of:

React + TypeScript Frontend
↓
Application Services
↓
Customer Agent / Store Agent
↓
Groq Reasoning + Backend Tools
↓
Structured Application State
↕
Hindsight Experiential Memory

Current development persistence uses local persistence/localStorage.

Supabase/PostgreSQL integration and schema support are included for database-backed persistence.

Hindsight is configured through environment-based service configuration.

## Production Considerations

Deployment requires production-specific configuration for:

* Application hosting
* Persistent database
* Hindsight service endpoint
* Groq credentials
* Hindsight credentials
* Secure environment variables

A local Hindsight endpoint must not be assumed to be publicly accessible by a deployed application.

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

Hindsight is not an isolated feature. It is the experiential memory layer that enables the Customer Agent and Store Agent to improve future decisions from meaningful past experiences.
