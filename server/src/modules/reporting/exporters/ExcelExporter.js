/**
 * server/src/modules/reporting/exporters/ExcelExporter.js
 *
 * Streaming Excel (XLSX) Report Exporter.
 * Uses exceljs to build workbook sheets from ReportResponseBuilder DTOs.
 */

import ExcelJS from 'exceljs';
import BaseExporter from './BaseExporter.js';

export class ExcelExporter extends BaseExporter {
  constructor() {
    super('excel');
  }

  /**
   * Exports report DTO into an Excel Buffer.
   */
  async export(reportDTO, options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MERN TMS Enterprise Engine';
    workbook.created = new Date();

    const title = options.title || reportDTO.meta?.title || 'Report Export';

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Overview');
    summarySheet.addRow(['Report Title', title]);
    summarySheet.addRow(['Generated Date', new Date().toISOString()]);
    if (reportDTO.summary) summarySheet.addRow(['Summary', reportDTO.summary]);
    summarySheet.addRow([]);

    if (reportDTO.kpis && reportDTO.kpis.length > 0) {
      summarySheet.addRow(['Key Performance Indicator', 'Value', 'Change (%)']);
      const headerRow = summarySheet.getRow(summarySheet.rowCount);
      headerRow.font = { bold: true };

      reportDTO.kpis.forEach((kpi) => {
        summarySheet.addRow([kpi.label, kpi.value, kpi.change !== undefined ? kpi.change : '']);
      });
    }

    // Data Sheets per Table
    if (reportDTO.tables && reportDTO.tables.length > 0) {
      reportDTO.tables.forEach((table, index) => {
        const sheetName = (table.title || `Table ${index + 1}`).substring(0, 31);
        const dataSheet = workbook.addWorksheet(sheetName);

        if (table.rows && table.rows.length > 0) {
          const headers = table.headers || Object.keys(table.rows[0]);
          dataSheet.addRow(headers);
          const headerRow = dataSheet.getRow(1);
          headerRow.font = { bold: true };

          table.rows.forEach((row) => {
            const rowValues = headers.map((h) => row[h]);
            dataSheet.addRow(rowValues);
          });
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

const excelExporterSingleton = new ExcelExporter();
export default excelExporterSingleton;
