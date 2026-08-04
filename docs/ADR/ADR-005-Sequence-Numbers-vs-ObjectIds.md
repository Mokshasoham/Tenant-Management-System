# ADR-005: Serial Sequence Numbers vs MongoDB ObjectIds

## Status
Approved

## Context
Exposing database ObjectIds (`60c72b...`) in customer invoices, public documents, or customer dashboard routes is suboptimal for readability and leaks internal database volumes. We need user-friendly, non-sequential tracking numbers (like invoice numbers or renewal ticket references) that are unique, predictable, and concurrency-safe.

## Decision
We implemented a central database-backed Sequence Service:
1. **Atomic Increments**: Generates numbers using MongoDB's atomic `$inc` operators on a central Counter collection. This avoids memory locks and duplicate values.
2. **Standardized Serial Numbers**: Forms structured identifiers matching the pattern `{Prefix}-{Year}-{Serial}` (e.g. `LRN-2026-000042`).

## Consequences
- **Pros**: Clean, professional customer-facing serial keys. Concurrency-safe against race condition duplication.
- **Cons**: Requires a dedicated collection lookup step during record creation.
