/**
 * server/src/modules/reporting/services/AuditReportService.js
 *
 * Dedicated Report Service for Audit Execution Logs and Security Traceability.
 */

import ReportAudit from '../models/ReportAudit.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class AuditReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('audit_log');
    const limit = parseInt(filters.limit || '50', 10);

    const [totalAudits, recentAudits, formatBreakdown] = await Promise.all([
      ReportAudit.countDocuments(),
      ReportAudit.find().sort({ createdAt: -1 }).limit(limit).lean(),
      ReportAudit.aggregate([
        { $group: { _id: '$exportFormat', count: { $sum: 1 } } }
      ])
    ]);

    builder
      .setSummary({ totalAudits, limit })
      .addKPI('total_audit_records', 'Total Report Audits', totalAudits, '', 'neutral')
      .setTable(
        ['Report Type', 'Format', 'Duration (ms)', 'Status', 'Timestamp'],
        recentAudits.map(a => [
          a.reportType,
          a.exportFormat,
          a.executionTimeMs,
          a.status,
          new Date(a.createdAt).toISOString()
        ])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const auditReportServiceSingleton = new AuditReportService();
export default auditReportServiceSingleton;
