# ADR-003: AsyncLocalStorage for Correlation & Context Tracing

## Status
Approved

## Context
Debugging nested microservice flows or single-tenant requests across asynchronous executions was difficult without manually passing request identifiers (`requestId`, `correlationId`, `userId`, `organizationId`) through every service, repository, and provider method signature.

## Decision
We implemented Node's native `AsyncLocalStorage` engine (`server/src/platform/logging/logContext.js`):
1. **Dynamic Context Interception**: Request context middleware captures correlation parameters at the Express router boundary and populates the store.
2. **Implicit Context Injection**: The structured platform logger hooks into the active storage bucket, automatically appending tracing parameters to all log lines without modifying function arguments.

## Consequences
- **Pros**: Zero signature noise. Code readability is preserved while logging maintains complete trace tracking.
- **Cons**: Minor performance cost associated with native Node storage lookups under heavy request volumes.
