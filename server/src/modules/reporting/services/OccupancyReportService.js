/**
 * server/src/modules/reporting/services/OccupancyReportService.js
 *
 * Dedicated Report Service for Property Occupancy and Utilization.
 */

import Property from '../../../models/Property.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';
import { getManagerPropertyIds } from '../../../utils/managerHelper.js';

export class OccupancyReportService {
  async generate(filters = {}, userId = null, role = null) {
    const builder = new ReportResponseBuilder('occupancy');
    let queryFilter = {};

    if (role === 'manager' && userId) {
      const propIds = await getManagerPropertyIds(userId);
      if (propIds.length === 0) {
        builder
          .setSummary({ totalProperties: 0, occupied: 0, available: 0, maintenance: 0, occupancyRate: 0 })
          .addKPI('occupancy_rate', 'Occupancy Rate', 0, '%', 'neutral')
          .addKPI('occupied_units', 'Occupied Units', 0, '', 'positive')
          .addKPI('available_units', 'Available Units', 0, '', 'neutral')
          .addKPI('maintenance_units', 'Units in Maintenance', 0, '', 'warning')
          .addChart('pie', 'Property Occupancy Breakdown', [], { key: 'name', value: 'value' })
          .setTable(['Property Name', 'Status', 'Rent Amount (₹)'], [])
          .setMeta({ filters });
        return builder.build();
      }
      queryFilter._id = { $in: propIds };
    }

    const [total, occupied, available, maintenance, propertyList] = await Promise.all([
      Property.countDocuments(queryFilter),
      Property.countDocuments({ ...queryFilter, status: 'occupied' }),
      Property.countDocuments({ ...queryFilter, status: 'available' }),
      Property.countDocuments({ ...queryFilter, status: 'maintenance' }),
      Property.find(queryFilter, 'name address status rentAmount').limit(50).lean()
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
      .setTable(
        ['Property Name', 'Status', 'Rent Amount (₹)'],
        propertyList.map(p => [p.name || 'Unnamed Property', (p.status || 'unknown').toUpperCase(), `₹${(p.rentAmount || 0).toLocaleString('en-IN')}`])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const occupancyReportServiceSingleton = new OccupancyReportService();
export default occupancyReportServiceSingleton;
