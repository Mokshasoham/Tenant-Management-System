/**
 * server/src/modules/reporting/exporters/BaseExporter.js
 *
 * Base Exporter Interface.
 * Enforces standardized export contract across all format exporters.
 */

export class BaseExporter {
  constructor(format) {
    if (new.target === BaseExporter) {
      throw new TypeError('Cannot construct BaseExporter instances directly.');
    }
    this.format = format;
  }

  /**
   * Generates formatted report output from standard ReportResponseBuilder DTO.
   * Must be overridden by subclasses.
   *
   * @param {Object} reportDTO - Standardized DTO { summary, kpis, charts, tables, trends, meta }
   * @param {Object} options - Optional parameters (title, stream, progressCallback)
   * @returns {Promise<Buffer|Stream>} Exported binary buffer or writable stream target
   */
  async export(reportDTO, options = {}) {
    throw new Error(`Abstract method export() must be implemented by ${this.constructor.name}`);
  }
}

export default BaseExporter;
