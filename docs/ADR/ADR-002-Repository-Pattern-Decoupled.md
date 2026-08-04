# ADR-002: Clean Repository Pattern Separation

## Status
Approved

## Context
In early iterations, the data access layer was tightly coupled with business logic (e.g. status constraints, lease expiry checks, tenant eligibility rules). Embedding status lists directly into database query modules created duplication when different services needed to fetch identical entities with different states.

## Decision
We moved all data queries into a dedicated Repository pattern layer (`server/src/modules/lease-renewal/repository.js`):
1. **Query Only**: Repositories must perform standard MongoDB querying operations (finding, creating, updating, soft-deleting) without enforcing business states.
2. **Business Controls in Services**: All validation filters (e.g. check for active maintenance tickets, checking outstanding balances) must reside strictly in the Service layer, which orchestrates calls to repositories.

## Consequences
- **Pros**: Cleaner separation. Repositories can be reused across different services without side effects.
- **Cons**: Small increase in boilerplate methods mapping service filters to repository parameters.
