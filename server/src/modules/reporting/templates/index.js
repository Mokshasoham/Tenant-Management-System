/**
 * server/src/modules/reporting/templates/index.js
 *
 * Modular Report Layout Definitions for Standardized Display & AI Rendering.
 */

export const REPORT_TEMPLATES = {
  executive: {
    id: 'executive',
    name: 'Executive Summary',
    kpiSections: ['revenue', 'occupancy', 'renewals'],
    defaultCharts: ['revenue_trend', 'occupancy_donut']
  },
  manager: {
    id: 'manager',
    name: 'Property Manager Portfolio',
    kpiSections: ['workload', 'maintenance', 'renewals'],
    defaultCharts: ['workload_distribution', 'maintenance_cost']
  },
  finance: {
    id: 'finance',
    name: 'Financial Ledger & Collections',
    kpiSections: ['total_collected', 'outstanding', 'collection_rate'],
    defaultCharts: ['monthly_revenue', 'payment_collection_rate']
  },
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance & Work Orders',
    kpiSections: ['open_tickets', 'avg_resolution_hrs', 'total_cost'],
    defaultCharts: ['cost_by_category', 'resolution_trend']
  },
  renewal: {
    id: 'renewal',
    name: 'Lease Renewal Performance',
    kpiSections: ['acceptance_rate', 'expiring_count', 'churn_risk'],
    defaultCharts: ['conversion_funnel', 'revenue_projections']
  },
  operations: {
    id: 'operations',
    name: 'Admin Infrastructure & Queue Operations',
    kpiSections: ['worker_success_rate', 'dead_letter_count', 'queue_latency'],
    defaultCharts: ['queue_depth_trend', 'worker_duration']
  }
};

export default REPORT_TEMPLATES;
