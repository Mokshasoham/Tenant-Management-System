# Reminder Subsystem Architecture Guide

## Overview

The Reminder Subsystem is an enterprise-grade outbox-pattern notification engine within the Tenant Management System. It orchestrates automated email and SMS reminders across business lifecycles (lease renewals, payment due dates, maintenance updates, and campaign milestones) without blocking main application flows.

---

## Architectural Topology

```
                       Domain Events / Cron Scans
                                   │
                                   ▼
                       Reminder Rule Engine
                                   │
                                   ▼
                            Reminder Queue
                          (status = queued)
                                   │
                                   ▼
                        Outbox Reminder Worker
                          (status = processing)
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        Email Engine Service                SMS Engine Service
        (IEmailProvider)                    (ISmsProvider)
        ├─ ResendProvider                   ├─ TwilioProvider
        ├─ SmtpProvider                     ├─ AwsSnsProvider
        └─ SimulatedEmailProvider           ├─ Msg91Provider
                                            └─ SimulatedSmsProvider
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼
                            ReminderHistory
                          (Immutable Audit Log)
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        Metrics Telemetry                   REST APIs V1
      (ReminderMetricsService)            (/api/v1/reminders)
```

---

## Core Pillars & Design Principles

1. **Outbox Pattern Queue Architecture**:
   - Everything flows through the queue. No direct dispatches.
   - Status model: `queued` → `processing` → `sent` / `failed` → `dead_letter` / `cancelled`.
2. **Multi-Layer Idempotency**:
   - `idempotencyKey` uniqueness constraint at the database index level.
   - Queue check for existing `SENT` state reminders prior to dispatching.
3. **Atomic Processing Locks**:
   - Workers claim batches using atomic `findOneAndUpdate` queries on `{ status: 'queued', scheduledFor: { $lte: now } }`.
   - Prevents race conditions and duplicate dispatches in multi-worker cluster deployments.
4. **Exponential Backoff Retries**:
   - Attempt 1: 5-minute delay (`now + 5m`).
   - Attempt 2: 15-minute delay (`now + 15m`).
   - Attempt 3+: 60-minute delay (`now + 60m`).
   - Permanent errors or max attempts transition items to `dead_letter`.
5. **Quiet Hours Deferral**:
   - Enforces recipient quiet hours (e.g., 22:00 to 08:00). Reminders falling within quiet hours are deferred to the next allowed delivery window.
6. **Automated Entity Completion Cancellation**:
   - Listens to `EventBus` completion events (`payment.received`, `lease.renewal.completed`, `campaign.completed`, `maintenance.resolved`).
   - Cancels pending reminders automatically (`cancelRemindersForEntity`).
