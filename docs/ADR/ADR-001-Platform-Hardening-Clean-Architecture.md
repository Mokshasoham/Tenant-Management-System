# ADR-001: Platform Hardening & Clean Decoupled Architecture

## Status
Approved

## Context
As the Tenant Management System transitions into a multi-tenant enterprise SaaS platform, we need to prevent business logic from polluting core infrastructure capabilities (caching, logging, file uploads, event brokers). Tightly coupling business services to specific databases, log libraries, or cloud providers (e.g. S3, Redis, Resend) makes the system fragile, difficult to test, and expensive to refactor.

## Decision
We established a strict **Clean Decoupled Platform Layer** under `/src/platform/`:
1. **Stable Lifecycle Contracts**: Shared contracts (`CacheProvider`, `EmailProvider`, `StorageProvider`, `JobDispatcher`) define stable interfaces, including lifecycle hooks (`initialize()`, `health()`, and `shutdown()`).
2. **IoC Dependency Registry Container**: We created `container.js` to manage providers. The container is frozen (`Object.freeze`) at bootstrap, making dependencies read-only during application runtime.
3. **AsyncLocalStorage Logger Context**: We used Node's native `AsyncLocalStorage` to store tracing parameters (request IDs, correlation IDs) implicitly, avoiding manual argument passing.
4. **Structured JSON Errors and Logs**: All exceptions are processed centrally in `errorHandler.js` to output structured logs and standardized client payloads carrying tracking IDs.

## Consequences
- **Pros**: swaps to Redis or AWS S3 require changing only the corresponding platform provider class without touching any code in business modules. Testing business logic is simplified by registering mock providers in the container.
- **Cons**: slightly increased file counts and boilerplate contracts in the platform folder.
