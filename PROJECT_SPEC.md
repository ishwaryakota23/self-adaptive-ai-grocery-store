# Self-Adaptive AI Grocery Store

## Vision

Build an intelligent physical grocery store that can understand customers,
remember past interactions, observe store conditions, take actions, and adapt
over time.

The system is not just a grocery chatbot or shopping assistant.

The store itself becomes intelligent and adaptive.

## Core Agents

### Customer Agent

Helps customers through:

- Voice interaction
- Chat interaction
- Multilingual interaction
- Natural-language shopping requests
- Shopping missions
- Product discovery
- Real-time availability
- Store navigation
- Personalized recommendations
- Proactive notifications
- Alternative suggestions when products are unavailable

### Store Agent

Understands and optimizes store operations through:

- Inventory state
- Customer requests
- Unmet demand
- Sales activity
- Aisle traffic
- Checkout queues
- Stock shortages
- Restocking recommendations
- Operational actions
- Action outcomes

## Core Learning Loop

Observe → Remember → Reason → Act → Re-observe → Learn

Customer interactions and store events become experiences that influence
future decisions.

## Memory

Hindsight is the long-term memory layer.

### Customer memory

- Preferences
- Brand preferences
- Rejected products/brands
- Budget preferences
- Shopping history
- Previous shopping missions
- Unavailable product requests
- Language preferences
- Interaction history

### Store memory

- Repeated product requests
- Stockout experiences
- Demand patterns
- Traffic patterns
- Queue patterns
- Previous operational actions
- Action outcomes
- Store-level experiences

Normal database state and Hindsight long-term memory must remain conceptually
separate.

## Required Interaction Modes

- Voice
- Chat
- Proactive agent interaction

Chat must not be treated as the entire application.

## Core Demo Story

1. Customer interacts with the Customer Agent.
2. Agent understands the shopping requirement.
3. Agent checks product availability.
4. Agent creates/updates a shopping mission.
5. Agent guides the customer through the store.
6. Agent proactively follows up.
7. Store Agent detects operational signals.
8. Store Agent identifies unmet demand or congestion.
9. Store Agent recommends an action.
10. Action is performed.
11. System re-observes the result.
12. Result becomes part of future memory.
13. Future interactions become more personalized and adaptive.
