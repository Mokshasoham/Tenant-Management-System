/**
 * server/src/modules/reporting/builders/ReportResponseBuilder.js
 *
 * Builder class assembling standardized AI-Ready Report DTO responses.
 * Output shape: { summary, kpis, charts, tables, trends, meta }
 */

export class ReportResponseBuilder {
  constructor(reportType) {
    this.reportType = reportType;
    this.summaryData = {};
    this.kpisData = [];
    this.chartsData = [];
    this.tablesData = [];
    this.trendsData = [];
    this.metadata = {
      generatedAt: new Date().toISOString(),
      reportType
    };
  }

  setSummary(summary = {}) {
    this.summaryData = summary;
    return this;
  }

  addKPI(key, label, value, unit = '', status = 'neutral', delta = null) {
    this.kpisData.push({ key, label, value, unit, status, delta });
    return this;
  }

  addChart(type, title, data = [], keys = {}) {
    this.chartsData.push({ type, title, data, keys });
    return this;
  }

  setTable(headers = [], rows = [], pagination = {}) {
    this.tablesData = { headers, rows, pagination };
    return this;
  }

  setTrends(trends = []) {
    this.trendsData = trends;
    return this;
  }

  setMeta(meta = {}) {
    this.metadata = { ...this.metadata, ...meta };
    return this;
  }

  build() {
    return {
      success: true,
      reportType: this.reportType,
      summary: this.summaryData,
      kpis: this.kpisData,
      charts: this.chartsData,
      table: this.tablesData,
      trends: this.trendsData,
      meta: this.metadata
    };
  }
}

export default ReportResponseBuilder;
