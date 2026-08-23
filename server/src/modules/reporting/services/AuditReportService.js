/**
 * server/src/modules/reporting/services/AuditReportService.js
 *
 * Dedicated Report Service for Audit Execution Logs and Security Traceability.
 */

import ReportAudit from '../models/ReportAudit.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class AuditReportService {
  async generate(filters = {}, userId = null, role = null) {
    const builder = new ReportResponseBuilder('audit_log');
    const limit = parseInt(filters.limit || '50', 10);
    let queryFilter = {};

    if (role === 'manager' && userId) {
      queryFilter.requestedBy = userId;
    }

    const [totalAudits, recentAudits, formatBreakdown] = await Promise.all([
      ReportAudit.countDocuments(queryFilter),
      ReportAudit.find(queryFilter).sort({ createdAt: -1 }).limit(limit).lean(),
      ReportAudit.aggregate([
        ...(Object.keys(queryFilter).length > 0 ? [{ $match: queryFilter }] : []),
        { $group: { _id: '$exportFormat', count: { $sum: 1 } } }
      ])
    ]);

    const chartData = formatBreakdown.map(item => ({
      format: (item._id || 'json').toUpperCase(),
      count: item.count
    }));

    builder
      .setSummary({ totalAudits, limit })
      .addKPI('total_audit_records', 'Total Report Audits', totalAudits, '', 'neutral')
      .addChart('bar', 'Audits by Export Format', chartData, { x: 'format', y: 'count' })
      .setTable(
        ['Report Type', 'Format', 'Duration (ms)', 'Status', 'Timestamp'],
        recentAudits.map(a => [
          a.reportType || 'N/A',
          (a.exportFormat || 'json').toUpperCase(),
          a.executionTimeMs || 0,
          (a.status || 'unknown').toUpperCase(),
          a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString()
        ])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const auditReportServiceSingleton = new AuditReportService();
export default auditReportServiceSingleton;
