# ADR-004: Decoupled Domain Event Bus Architecture

## Status
Approved

## Context
As the SaaS platform expands, we need modules like Lease Renewals to notify other domains (e.g. Payments, Notifications, Auditing) about state updates without hardcoding references or imports. Direct synchronous calls create tight coupling and increase HTTP response times.

## Decision
We implemented a local in-process Domain Event Bus:
1. **Dot-Notated Naming Schema**: Event keys must follow a strict `domain.entity.action` naming convention (e.g. `lease.renewal.requested`).
2. **Asynchronous Execution**: Subscribers execute within standard macro-task queues, preventing handler failures from interrupting core transaction requests.

## Consequences
- **Pros**: Complete separation. Core modules remain lightweight and unaware of recipient operations.
- **Cons**: Event debugging requires trace matching through logs since execution runs asynchronously in the background.
