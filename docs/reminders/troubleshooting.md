# Reminder Subsystem Troubleshooting Guide

## Common Issues & Troubleshooting Steps

### 1. Reminders Deferred due to Quiet Hours
- **Symptom**: Reminder status shows `FAILED` or output log indicates `QUIET_HOURS_DEFERRED`.
- **Cause**: Recipient preference enforces quiet hours (e.g. 22:00-08:00) during dispatch time.
- **Resolution**: No manual action required. The worker automatically reschedules delivery for the recipient's next allowed window.

### 2. Provider API Authentication Error
- **Symptom**: Delivery fails with `RESEND_API_KEY_INVALID` or `TWILIO_AUTH_FAILED`.
- **Cause**: Missing or incorrect API key environment variables.
- **Resolution**:
  1. Verify credentials using `POST /api/v1/reminders/test-email` or `test-sms`.
  2. Check `GET /api/v1/reminders/health` response.

### 3. High Queue Backlog
- **Symptom**: `queued` status count growing faster than processing rate.
- **Resolution**:
  - Adjust `REMINDER_WORKER_INTERVAL_MS` down to 2000ms.
  - Increase `REMINDER_WORKER_BATCH_SIZE` to 25.
  - Scale out worker instances (atomic `findOneAndUpdate` locking protects multi-worker clusters).
