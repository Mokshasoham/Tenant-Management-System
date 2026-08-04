# Platform Manifest

This document serves as the central platform catalog and reference guide.

---

## 1. Registered Platform Providers (IoC Container)

The following providers are registered and managed by `platform/container.js`:

| Key | Interface Contract | Concrete Implementation | Lifecycle Hooks |
| :--- | :--- | :--- | :--- |
| `cache` | `CacheProvider` | `MemoryCacheProvider` | `initialize()`, `health()`, `shutdown()` |
| `jobs` | `JobDispatcher` | `LocalJobDispatcher` | `initialize()`, `health()`, `shutdown()` |
| `storage` | `StorageProvider` | `LocalStorageProvider` | `initialize()`, `health()`, `shutdown()` |

---

## 2. Configuration Blocks (`platform/config/`)

All settings are modularized and exposed under a single configuration namespace:

- `app.js`: Node environment, PORT, base URLs, logging configurations.
- `database.js`: MongoDB connection strings and timeout thresholds.
- `email.js`: SMTP, Resend credentials, and fallback settings.
- `features.js`: Flag states, descriptions, expirations, and metadata.
- `security.js`: JWT, CORS origins, cookie sign settings.
- `storage.js`: Local filesystem uploads and AWS S3 properties.

---

## 3. Feature Flags Catalog

| Flag Name | Type | Rollout | Description | Expiration | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `LEASE_RENEWAL` | Boolean | 100% | Enables Lease Renewal SaaS capabilities. | 2026-12-31 | Lease Operations Team |
| `AI_OPERATIONS` | Boolean | 0% | Enables AI Property Operations Assistant. | 2026-12-31 | Product Team |
| `PAYMENTS_AUTOMATION` | Boolean | 100% | Enables Stripe billing collections. | 2026-12-31 | Billing Operations Team |

---

## 4. Domain Event Catalog (`platform/events/`)

Dot-notated names used in the Domain Event Bus:

- `lease.renewal.requested`: Dispatched when tenant requests renewal.
- `lease.renewal.offered`: Dispatched when manager sends counter-offer.
- `lease.renewal.approved`: Dispatched when manager approves request.
- `lease.renewal.rejected`: Dispatched when manager rejects request.
- `lease.renewal.signed`: Dispatched when tenant executes agreement.
- `lease.renewal.completed`: Dispatched when renewal goes active.
- `lease.renewal.cancelled`: Dispatched when renewal is soft deleted.
- `payment.completed` / `payment.failed`: Stripe billing results.
- `maintenance.created` / `maintenance.updated`: Maintenance requests.
- `user.login` / `user.logout`: Access operations.
- `document.uploaded`: Digital files uploads.

---

## 5. Health Diagnostics & Probes

Probes are mapped relative to the server host:

- `/live`: Basic process status.
- `/ready`: Health checks queried on all platform components.
- `/health`: Build details, platform version, and environment.
- `/metrics`: System metrics aggregation.

Standardized Health Response Schema:
```json
{
  "status": "UP",
  "latencyMs": 8,
  "lastChecked": "2026-08-04T11:00:00Z",
  "version": "1.0.0",
  "details": {}
}
```

---

## 6. Observability Metrics Roadmap

Future metrics exposed on the `/metrics` endpoint:

### HTTP
- `http_requests_total`: Total number of HTTP requests.
- `http_request_duration_seconds`: Average response latency.
- `http_errors_total`: Error status rates.
- `http_active_connections`: Current active keep-alive sockets count.

### Database (Mongoose)
- `db_connections_active`: Total active connections.
- `db_query_duration_seconds`: Mean query latency.

### Cache (Memory/Redis)
- `cache_hits_total`: Cache hit rate.
- `cache_misses_total`: Cache miss rate.

### Job Dispatcher
- `jobs_running_total`: Executing job count.
- `jobs_failed_total`: Failed job count.
