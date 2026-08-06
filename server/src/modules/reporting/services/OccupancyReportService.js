/**
 * server/src/modules/reporting/services/OccupancyReportService.js
 *
 * Dedicated Report Service for Property Occupancy and Utilization.
 */

import Property from '../../../models/Property.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class OccupancyReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('occupancy');

    const [total, occupied, available, maintenance] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: 'occupied' }),
      Property.countDocuments({ status: 'available' }),
      Property.countDocuments({ status: 'maintenance' })
    ]);

    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    const donutData = [
      { name: 'Occupied', value: occupied, fill: '#10B981' },
      { name: 'Available', value: available, fill: '#3B82F6' },
      { name: 'Maintenance', value: maintenance, fill: '#EF4444' }
    ];

    builder
      .setSummary({ totalProperties: total, occupied, available, maintenance, occupancyRate: rate })
      .addKPI('occupancy_rate', 'Occupancy Rate', rate, '%', rate >= 85 ? 'positive' : 'negative')
      .addKPI('occupied_units', 'Occupied Units', occupied, '', 'positive')
      .addKPI('available_units', 'Available Units', available, '', 'neutral')
      .addKPI('maintenance_units', 'Units in Maintenance', maintenance, '', 'warning')
      .addChart('pie', 'Property Occupancy Breakdown', donutData, { key: 'name', value: 'value' })
      .setMeta({ filters });

    return builder.build();
  }
}

const occupancyReportServiceSingleton = new OccupancyReportService();
export default occupancyReportServiceSingleton;
