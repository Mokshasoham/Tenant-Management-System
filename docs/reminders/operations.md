# Reminder Subsystem Operations & Monitoring Runbook

## Health & Diagnostics Monitoring

System health can be inspected in real time using:
```http
GET /api/v1/reminders/health
```

### Metrics Telemetry Interpretation
```http
GET /api/v1/reminders/analytics
```
- **Queued Depth**: High number (>500) indicates worker backlog or provider throttling.
- **Dead-Letter Count**: Items requiring administrative intervention.
- **Delivery Success Rate (%)**: Standard operating baseline should remain >95%.

---

## Operating Procedures

### 1. Dead-Letter Queue Remediation
When reminders move to `dead_letter`:
1. Query items via `GET /api/v1/reminders/queue?status=dead_letter`.
2. Inspect `cancelReason` for root cause (e.g., missing email, invalid phone, template compile error).
3. Update recipient email/phone if necessary.
4. Retry reminder via `POST /api/v1/reminders/retry/:id`.

### 2. Manual Emergency Cancellation
To cancel a stuck or unwanted pending reminder:
```http
POST /api/v1/reminders/cancel/:id
Content-Type: application/json

{
  "reason": "Administrative cancellation by Ops"
}
```
