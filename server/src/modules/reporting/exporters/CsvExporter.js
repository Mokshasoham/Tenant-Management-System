/**
 * server/src/modules/reporting/exporters/CsvExporter.js
 *
 * CSV Streaming Report Exporter.
 * Converts ReportResponseBuilder DTO tabular records into CSV buffers/streams.
 */

import BaseExporter from './BaseExporter.js';

export class CsvExporter extends BaseExporter {
  constructor() {
    super('csv');
  }

  /**
   * Escapes CSV cell values.
   */
  _escapeCell(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  /**
   * Exports report DTO into CSV Buffer.
   */
  async export(reportDTO, options = {}) {
    const lines = [];

    // Title & Summary Metadata
    const title = options.title || reportDTO.meta?.title || 'Report Export';
    lines.push(`"# Title: ${title}"`);
    if (reportDTO.summary) lines.push(`"# Summary: ${reportDTO.summary.replace(/\n/g, ' ')}"`);
    lines.push(`"# GeneratedAt: ${new Date().toISOString()}"`);
    lines.push('');

    // KPIs Section
    if (reportDTO.kpis && reportDTO.kpis.length > 0) {
      lines.push('"KPI Name","Value","Change (%)"');
      reportDTO.kpis.forEach((kpi) => {
        lines.push(`${this._escapeCell(kpi.label)},${this._escapeCell(kpi.value)},${this._escapeCell(kpi.change !== undefined ? kpi.change : '')}`);
      });
      lines.push('');
    }

    // Tabular Data
    if (reportDTO.tables && reportDTO.tables.length > 0) {
      reportDTO.tables.forEach((table) => {
        if (table.title) lines.push(`"# Table: ${table.title}"`);

        if (table.rows && table.rows.length > 0) {
          const headers = table.headers || Object.keys(table.rows[0]);
          lines.push(headers.map((h) => this._escapeCell(h)).join(','));

          table.rows.forEach((row) => {
            const rowValues = headers.map((h) => this._escapeCell(row[h]));
            lines.push(rowValues.join(','));
          });
        }
        lines.push('');
      });
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }
}

const csvExporterSingleton = new CsvExporter();
export default csvExporterSingleton;
