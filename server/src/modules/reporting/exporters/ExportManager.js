/**
 * server/src/modules/reporting/exporters/ExportManager.js
 *
 * Universal Export Engine Facade.
 * Orchestrates Exporters, Storage Provider uploads, Configurable Signed URL expiration (REPORT_EXPORT_TTL),
 * and ReportAudit execution tracking.
 */

import pdfExporter from './PdfExporter.js';
import csvExporter from './CsvExporter.js';
import excelExporter from './ExcelExporter.js';
import storageProvider from '../../../platform/storage/storageProvider.js';
import ReportAudit from '../models/ReportAudit.js';
import logger from '../../../platform/logging/logger.js';

export class ExportManager {
  constructor() {
    this.exporters = new Map();
    this.registerExporter('pdf', pdfExporter);
    this.registerExporter('csv', csvExporter);
    this.registerExporter('excel', excelExporter);
    this.registerExporter('xlsx', excelExporter);
  }

  /**
   * Registers a new pluggable exporter instance.
   * @param {string} format - Dot-notated format name (e.g. 'pdf', 'csv', 'excel', 'ppt')
   * @param {Object} exporterInstance - Class instance extending BaseExporter
   */
  registerExporter(format, exporterInstance) {
    this.exporters.set(format.toLowerCase(), exporterInstance);
    logger.debug(`[ExportManager] Registered exporter for format: ${format}`);
  }

  /**
   * Generates export binary, uploads to StorageProvider, generates signed URL with REPORT_EXPORT_TTL,
   * and records a ReportAudit entry.
   *
   * @param {string} format - 'pdf' | 'csv' | 'excel'
   * @param {Object} reportDTO - Standardized DTO from ReportService
   * @param {Object} context - { userId, reportType, filters, ipAddress }
   * @returns {Promise<Object>} { success, format, downloadUrl, expiresAt, fileSizeBytes, durationMs }
   */
  async export(format, reportDTO, context = {}) {
    const startTime = Date.now();
    const normalizedFormat = (format || 'pdf').toLowerCase();
    const exporter = this.exporters.get(normalizedFormat);

    if (!exporter) {
      throw new Error(`UNSUPPORTED_FORMAT: Exporter for format '${format}' is not registered.`);
    }

    try {
      // 1. Generate Binary Buffer
      const buffer = await exporter.export(reportDTO, { title: reportDTO.meta?.title });
      const fileSizeBytes = Buffer.isBuffer(buffer) ? buffer.length : Buffer.from(buffer).length;

      // 2. Upload to Storage Provider
      const filename = `${context.reportType || 'report'}_${Date.now()}.${normalizedFormat}`;
      const mimeType = normalizedFormat === 'pdf'
        ? 'application/pdf'
        : normalizedFormat === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const uploadResult = await storageProvider.upload(buffer, filename, mimeType, 'reports');

      // 3. Generate Signed URL with Configurable TTL (process.env.REPORT_EXPORT_TTL or default 86400s)
      const ttlSeconds = parseInt(process.env.REPORT_EXPORT_TTL || '86400', 10);
      let signedUrl = uploadResult.url || `/uploads/reports/${filename}`;
      if (typeof storageProvider.getSignedUrl === 'function') {
        signedUrl = await storageProvider.getSignedUrl(uploadResult.filename || filename, ttlSeconds);
      }
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      const durationMs = Date.now() - startTime;

      // 4. Record Report Audit Log asynchronously
      if (context.userId) {
        ReportAudit.create({
          requestedBy: context.userId,
          reportType: context.reportType || 'custom',
          exportFormat: normalizedFormat,
          filters: context.filters || {},
          executionTimeMs: durationMs,
          recordCount: reportDTO.table?.rows?.length || reportDTO.tables?.[0]?.rows?.length || 0,
          status: 'success'
        }).catch((err) => logger.warn('[ExportManager] Failed to record audit:', err.message));
      }

      logger.info(`[ExportManager] Successfully exported ${context.reportType || 'report'} to ${normalizedFormat} (${fileSizeBytes} bytes, ${durationMs}ms)`);

      return {
        success: true,
        format: normalizedFormat,
        downloadUrl: signedUrl,
        fileKey: uploadResult.filename || filename,
        expiresAt,
        fileSizeBytes,
        durationMs
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      if (context.userId) {
        ReportAudit.create({
          requestedBy: context.userId,
          reportType: context.reportType || 'custom',
          exportFormat: normalizedFormat,
          filters: context.filters || {},
          executionTimeMs: durationMs,
          status: 'failed',
          errorMessage: err.message
        }).catch(() => {});
      }
      throw err;
    }
  }
}

const exportManagerSingleton = new ExportManager();
export default exportManagerSingleton;
