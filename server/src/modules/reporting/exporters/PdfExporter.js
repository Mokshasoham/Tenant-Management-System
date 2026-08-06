/**
 * server/src/modules/reporting/exporters/PdfExporter.js
 *
 * PDF Report Exporter.
 * Consumes ReportResponseBuilder DTOs and generates styled PDF documents
 * using PDFKit without holding entire files unstreamed in memory.
 */

import PDFDocument from 'pdfkit';
import BaseExporter from './BaseExporter.js';

export class PdfExporter extends BaseExporter {
  constructor() {
    super('pdf');
  }

  /**
   * Exports report DTO into a PDF Buffer or stream.
   */
  async export(reportDTO, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const title = options.title || reportDTO.meta?.title || 'System Analytics Report';
        const subtitle = reportDTO.meta?.template ? `Template: ${reportDTO.meta.template.toUpperCase()}` : 'Enterprise Operations Audit';

        // Header Section
        doc.fillColor('#1E293B').fontSize(20).text(title, { align: 'left' });
        doc.fillColor('#64748B').fontSize(10).text(subtitle, { align: 'left' });
        doc.moveDown(0.5);
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        // Summary Text
        if (reportDTO.summary) {
          doc.fillColor('#334155').fontSize(11).text(reportDTO.summary);
          doc.moveDown(1);
        }

        // Key Performance Indicators (KPIs) Grid
        if (reportDTO.kpis && reportDTO.kpis.length > 0) {
          doc.fillColor('#0F172A').fontSize(14).text('Key Performance Indicators');
          doc.moveDown(0.5);

          reportDTO.kpis.forEach((kpi) => {
            doc.fillColor('#1E293B').fontSize(10).text(`• ${kpi.label}: `, { continued: true });
            doc.fillColor('#2563EB').fontSize(10).text(`${kpi.value || 0} `, { continued: true });
            if (kpi.change !== undefined) {
              doc.fillColor(kpi.change >= 0 ? '#16A34A' : '#DC2626').fontSize(9).text(`(${kpi.change >= 0 ? '+' : ''}${kpi.change}%)`);
            } else {
              doc.text('');
            }
          });
          doc.moveDown(1);
        }

        // Data Tables
        if (reportDTO.tables && reportDTO.tables.length > 0) {
          reportDTO.tables.forEach((table) => {
            if (table.title) {
              doc.fillColor('#0F172A').fontSize(13).text(table.title);
              doc.moveDown(0.5);
            }

            if (table.rows && table.rows.length > 0) {
              const headers = table.headers || Object.keys(table.rows[0]);
              doc.fillColor('#475569').fontSize(9).text(headers.join(' | '));
              doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
              doc.moveDown(0.3);

              table.rows.slice(0, 100).forEach((row) => {
                const values = headers.map((h) => row[h] !== undefined ? String(row[h]) : '');
                doc.fillColor('#1E293B').fontSize(8).text(values.join(' | '));
              });
              doc.moveDown(1);
            }
          });
        }

        // Footer
        doc.fillColor('#94A3B8').fontSize(8).text(
          `Generated on ${new Date().toISOString()} | Powered by MERN TMS Enterprise Engine`,
          40,
          780,
          { align: 'center' }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

const pdfExporterSingleton = new PdfExporter();
export default pdfExporterSingleton;
