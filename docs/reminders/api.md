# Reminder Management V1 REST API Reference

Base Endpoint: `/api/v1/reminders`

All endpoints require JWT Bearer authentication (`protect` middleware).

---

## Authorization Policy (RBAC)

- **Admin**: Full access across all read, write, preview, test, retry, cancel, and health endpoints.
- **Manager**: Access limited to read & preview endpoints (`/queue`, `/history`, `/analytics`, `/health`, `/preview`). Forbidden from retry, cancel, test-email, and test-sms dispatches.
- **Tenant**: 403 Forbidden on all reminder management endpoints.

---

## Response Formats

### Standard Success Response
```json
{
  "success": true,
  "message": "Reminder queue items retrieved successfully.",
  "data": [],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Role 'manager' is not authorized to perform this operation."
  }
}
```

---

## Endpoint List

### 1. GET `/api/v1/reminders/queue`
- **Query Params**: `page` (default 1), `limit` (default 20), `status`, `channel`, `entityType`, `recipient`, `scheduledFrom`, `scheduledTo`.
- **RBAC**: Admin, Manager.

### 2. GET `/api/v1/reminders/history`
- **Query Params**: `page`, `limit`, `recipient`, `channel`, `status`.
- **RBAC**: Admin, Manager.

### 3. GET `/api/v1/reminders/analytics`
- **Returns**: Aggregated metrics (`queued`, `processing`, `sent`, `failed`, `cancelled`, `dead_letter`, `retryCount`, `averageLatency`, `deliverySuccessRate`).
- **RBAC**: Admin, Manager.

### 4. GET `/api/v1/reminders/health`
- **Returns**: System diagnostic health check (Database, Queue depth, Worker, Scheduler, EventBus, Email Provider, SMS Provider).
- **RBAC**: Admin, Manager.

### 5. POST `/api/v1/reminders/preview`
- **Body**: `{ "templateId": "RENEWAL_30D", "payload": { "tenantName": "Alice" } }`
- **RBAC**: Admin, Manager.

### 6. POST `/api/v1/reminders/test-email`
- **Body**: `{ "recipientEmail": "admin@example.com", "providerName": "simulated" }`
- **RBAC**: Admin.

### 7. POST `/api/v1/reminders/test-sms`
- **Body**: `{ "recipientPhone": "+1234567890", "providerName": "simulated" }`
- **RBAC**: Admin.

### 8. POST `/api/v1/reminders/retry/:id`
- **Description**: Resets a `failed` or `dead_letter` item back to `queued`.
- **RBAC**: Admin.

### 9. POST `/api/v1/reminders/cancel/:id`
- **Body**: `{ "reason": "Manual cancellation" }`
- **Description**: Cancels a `queued` or `processing` item.
- **RBAC**: Admin.
