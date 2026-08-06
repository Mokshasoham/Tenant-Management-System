# Reporting, Operations & Observability Subsystem (Phase 2.3.4)

## Architectural Overview

The **Reporting, Operations & Observability Subsystem** is an enterprise-grade extension to the Tenant Management System. Built adhering to **REUSE FIRST. EXTEND SECOND. CREATE NEW ONLY WHEN NECESSARY**, it seamlessly integrates domain report services, real-time HTTP & queue telemetry, operational command center controls, multi-format streaming report exporters, async background export queues, and pluggable frontend widget registries.

```
                               Phase 2.3.4 Enterprise Subsystem
                                               │
           ┌───────────────────────┬───────────┴───────────┬───────────────────────┐
           ▼                       ▼                       ▼                       ▼
      Report Engine         Operations Center       Telemetry Observability    Export Engine
    (Decoupled Services)   (Dead-Letter & Queue)    (HTTP & Process Metrics)  (PDF/CSV/Excel)
           │                       │                       │                       │
           ├─ 9 Domain Services    ├─ OperationsService    ├─ TelemetryMiddleware  ├─ BaseExporter
           ├─ ReportResponseBuilder├─ OperationHistory     ├─ TelemetryService     ├─ PdfExporter
           ├─ SavedReport Repo     ├─ Dead-Letter Remed.   ├─ 2xx/4xx/5xx Rates    ├─ CsvExporter
           ├─ ReportAudit Logger   ├─ Scheduler Registry   ├─ Memory & Latency     ├─ ExcelExporter
           └─ Report Templates     └─ Provider Health      └─ Queue E2E Latency    └─ ExportWorker Queue
           │                       │                       │                       │
           └───────────────────────┴───────────┬───────────┴───────────────────────┘
                                               ▼
                                extended Dashboards & Widget Registry
                                ├─ Admin Operations & Telemetry Tab
                                ├─ Manager Reporting Hub Tab
                                └─ WidgetRegistry (30s/60s Live Refresh)
```

---

## 1. Reporting Module Architecture

### Domain Services (`server/src/modules/reporting/services/`)
- **`ReportService.js` (Facade)**: Thin entry point delegating to specialized domain services.
- **`RevenueReportService.js`**: Monthly revenue trends, collected vs pending rent, occupancy revenue correlation.
- **`OccupancyReportService.js`**: Unit occupancy rates, vacancy durations, building breakdown.
- **`LeaseReportService.js`**: Active leases, upcoming expirations (30/60/90 days), renewal conversion rates.
- **`PaymentReportService.js`**: Payment method distribution, late fee penalties, tenant payment history.
- **`MaintenanceReportService.js`**: Ticket resolution times, emergency vs routine maintenance cost distribution.
- **`NotificationReportService.js`**: Delivery success rates, category distribution (payment/lease/maintenance).
- **`ReminderReportService.js`**: Channel dispatch metrics (email vs SMS), quiet hours deferrals, opt-out counts.
- **`ManagerPerformanceReportService.js`**: Response speed, tenant satisfaction, resolution throughput.
- **`AuditReportService.js`**: Platform security audits, administrative action frequency.

### AI-Ready Standardized DTO (`ReportResponseBuilder.js`)
All report services output a unified schema consumed directly by frontend visualizers and AI analytics:
```json
{
  "success": true,
  "reportType": "revenue",
  "summary": { "title": "...", "description": "..." },
  "kpis": [
    { "key": "total_rev", "label": "Total Revenue", "value": "$50,000", "unit": "USD", "status": "positive", "delta": 12 }
  ],
  "charts": [
    { "type": "bar", "title": "Monthly Revenue", "data": [...], "keys": { "x": "month", "y": "amount" } }
  ],
  "table": {
    "headers": ["Month", "Revenue", "Occupancy"],
    "rows": [ { "Month": "Jan", "Revenue": "$25,000", "Occupancy": "92%" } ]
  },
  "trends": [...],
  "meta": { "generatedAt": "2026-08-06T10:00:00.000Z", "reportType": "revenue" }
}
```

---

## 2. Operations Command Center & Telemetry

### Operations APIs (`/api/v1/operations`)
- `GET /api/v1/operations/status`: Real-time status across workers (`reminderWorker`, `outboxWorker`, `exportWorker`), schedulers (`SchedulerRegistry`), queue depths, and providers.
- `GET /api/v1/operations/dead-letter`: Paginated retrieval of permanently failed dead-letter queue items.
- `POST /api/v1/operations/dead-letter/retry`: Bulk or selective retry of dead-letter items.
- `POST /api/v1/operations/dead-letter/purge`: Bulk or selective purge of dead-letter items.
- `GET /api/v1/operations/version`: Build metadata (`1.0.0`, Git commit, Node version, Mongoose version, environment).

### Audit Trail (`OperationHistory.js`)
Logs administrative actions permanently:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "action": "BULK_RETRY_DEAD_LETTER",
  "target": "dead_letter_queue",
  "details": { "count": 3 },
  "durationMs": 42,
  "ipAddress": "127.0.0.1",
  "createdAt": "2026-08-06T10:14:00.000Z"
}
```

### Telemetry Observability (`/api/v1/telemetry/metrics`)
- `telemetryMiddleware.js`: Tracks HTTP request durations and status code distribution (`2xx`, `4xx`, `5xx`).
- `telemetryService.js`: Captures process RSS & Heap memory usage, EventBus wildcard publication rates, and End-to-End Queue Processing Latency.

---

## 3. Universal Report Export Engine & Background Jobs

### Exporters (`server/src/modules/reporting/exporters/`)
- **`ExportManager.js`**: Universal facade handling export formatting, binary storage uploads via `StorageProvider`, signed URL generation with `REPORT_EXPORT_TTL` (default 86400s), and logging execution to `ReportAudit`.
- **`PdfExporter.js`**: Streams PDFKit documents consuming DTOs without holding full unstreamed binaries in RAM.
- **`CsvExporter.js`**: Fast streaming CSV formatter.
- **`ExcelExporter.js`**: Streaming XLSX builder using `exceljs` library (`WorkbookWriter`).

### Async Background Export Queue & Worker
- **Endpoints**:
  - `POST /api/v1/reporting/export`: Instant synchronous export.
  - `POST /api/v1/reporting/export/jobs`: Asynchronous background export job enqueueing.
  - `GET /api/v1/reporting/export/jobs/:id`: Polling progress (0–100%) and signed download URL.
- **EventBus Lifecycle Events**: `export.started`, `export.progress`, `export.completed`, `export.failed`.

---

## 4. Frontend Dashboard Extensions & Widget Registry

### Widget Registry (`client/src/modules/reporting/widgets/WidgetRegistry.js`)
Pluggable widget manager supporting:
- Permission guards (`'admin'`, `'manager'`, `'all'`)
- Refresh intervals (`30000ms`, `60000ms`)
- Flexible grid layout priority & dependency mapping

### Admin Dashboard (`AdminDashboard.jsx`)
- **Operations & Observability Tab**: Real-time memory gauge, HTTP request volume & status code breakdown (2xx/5xx), API latency metrics, worker health indicators, scheduler state, platform build info, and interactive dead-letter queue management table with bulk retry & purge controls.

### Manager Dashboard (`ManagerDashboard.jsx`)
- **Reporting Hub Tab**: 9 domain selection tabs, interactive KPI cards, executive summary alerts, data tables, instant PDF/CSV/Excel downloads, async background export job polling with progress bars, and saved report preset management.

---

## 5. Verification & Testing

- **Backend Jest Suite (`npm test` in `server/`)**: 14 test suites passed (93 total tests passing) including unit, integration, failure recovery, and load tests.
- **Frontend Production Build (`npm run build` in `client/`)**: 2964 modules transformed with 0 errors.
