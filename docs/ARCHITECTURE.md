# System Architecture — Enterprise Tenant Management & Verification Platform

This document describes the architectural design, layer boundaries, data flow, trust engine, and RBAC security model of the MERN Tenant Management System and Demo Verification & Trust Platform (Phase 3.5).

---

## 1. Architectural Principles

1. **Reuse First**: Always inspect existing models, services, repositories, and UI primitives before building new logic.
2. **Extend Second**: Add fields, parameters, or methods to existing modules when appropriate without breaking legacy behavior.
3. **Create New Only When Necessary**: Introduce new entities, controllers, or components only when domain boundaries require them.
4. **Add, Never Replace**: Maintain strict backward compatibility. Never delete legacy schema fields or API parameters.
5. **Zero Regression Policy**: Every code change must be validated against unit tests (`npm test`) and production client builds (`npm run build`).

---

## 2. Layered Architecture Overview

### Backend Architecture Stack

```
[ HTTP Requests ]
       │
       ▼
┌───────────────────────────────┐
│   Express Routes Layer        │  /api/verifications, /api/v1/verifications
│   (auth & authorize middleware)│
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   HTTP Controllers Layer      │  verificationController.js
│   (Input Validation & Response)│
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   Business Service Layer      │  verificationService.js & trustScoreService.js
│   (Business Logic & Events)   │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   Repository Layer            │  verificationRepository.js
│   (Soft-delete Mongo Queries) │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   MongoDB Collections         │  verifications, trustscorehistories, users, properties
└───────────────────────────────┘
```

#### Layer Rules:
- **Controllers** call Services ONLY. Controllers NEVER access repositories or database models directly.
- **Services** encapsulate all business logic, sequence generation (`VRF-YYYY-XXXXXX`), versioning, SLA calculation, risk evaluation, and domain event publishing. Services NEVER import Express `req` or `res` objects.
- **Repositories** handle pure MongoDB queries and enforce `{ isDeleted: false }` soft-delete filter guards across all operations.

---

### Frontend Architecture Stack

```
┌─────────────────────────────────────────────────────────────┐
│   FeatureFlagService (featureFlags.js)                      │  Demo vs Production Control
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│   VerificationProvider (VerificationContext.jsx)           │  Cached State Container
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│   Custom Hooks Layer (useVerification, useTrustScore, etc.) │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│   Shared Components Barrel   ││   Component Registry         │
│   (components/verification)  ││   (AI & Dynamic Layouts)     │
└──────────────┬───────────────┘└──────────────┬───────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│   Portal Views & Developer Gallery (pages/internal/)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Trust Score Engine

The **Trust Score Engine** (`trustScoreService.js`) calculates a 0-100 score based on 7 weighted components:

1. **Identity Verification** (+30 pts): Approved government ID and selfie check.
2. **Contact Verification** (+15 pts): Verified email and phone number.
3. **Business / Employment** (+20 pts): Approved business registration, GST, or trade license.
4. **Property / Assets** (+15 pts): Verified property ownership deeds or lease agreements.
5. **Platform History** (+10 pts): Successful payments, clean lease completion, high review ratings.
6. **Clean Fraud Status** (+10 pts): Zero active fraud flags or duplicate credentials.
7. **Penalties**: Deductions for overdue SLA items or compliance rejections.

Score updates record an append-only document in `TrustScoreHistory` and sync `User.currentTrustScore` and `User.verificationBadge` (`UNVERIFIED`, `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`).

---

## 4. RBAC Permission Matrix

| Role | Self Verification | Property Verification | Level 2 Review | Level 3 Approval | View Admin Queue | View Audit Trail |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Technician** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
