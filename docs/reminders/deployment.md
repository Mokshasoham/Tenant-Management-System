# Reminder Subsystem Deployment & Configuration Guide

## Environment Variables

| Variable | Description | Default / Options |
|---|---|---|
| `EMAIL_PROVIDER` | Active Email dispatch driver | `simulated`, `resend`, `smtp` |
| `SMS_PROVIDER` | Active SMS dispatch driver | `simulated`, `twilio`, `aws_sns`, `msg91` |
| `RESEND_API_KEY` | Resend API Key for production emails | Required if `EMAIL_PROVIDER=resend` |
| `SMTP_HOST` | SMTP server host | Required if `EMAIL_PROVIDER=smtp` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | Optional |
| `SMTP_PASS` | SMTP password | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Required if `SMS_PROVIDER=twilio` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Required if `SMS_PROVIDER=twilio` |
| `TWILIO_FROM_NUMBER` | Twilio phone number | Required if `SMS_PROVIDER=twilio` |
| `REMINDER_WORKER_INTERVAL_MS` | Worker polling interval | `5000` (5s) |
| `REMINDER_WORKER_BATCH_SIZE` | Batch size per worker poll | `10` |

---

## Production Deployment Checklist

1. **Database Indexes**: Verify indexes on `reminders` collection (`idempotencyKey`, `status`, `scheduledFor`, `entityType + entityId`).
2. **Provider Verification**: Check provider health using `GET /api/v1/reminders/health`.
3. **Outbox Worker Process**: Ensure `reminderWorker.start()` is invoked during server bootstrap.
4. **Platform Scheduler**: Ensure `reminderScheduler` is registered in `SchedulerRegistry`.
