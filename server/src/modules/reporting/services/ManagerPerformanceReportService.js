/**
 * server/src/modules/reporting/services/ManagerPerformanceReportService.js
 *
 * Dedicated Report Service for Property Manager Workload & Resolution SLAs.
 */

import User from '../../../models/User.js';
import Property from '../../../models/Property.js';
import Maintenance from '../../../models/Maintenance.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class ManagerPerformanceReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('manager_performance');

    const managers = await User.find({ role: 'manager' }).lean();
    const managerCount = managers.length;

    const managerStats = await Promise.all(
      managers.map(async (m) => {
        const [assignedProperties, openTickets] = await Promise.all([
          Property.countDocuments({ manager: m._id }),
          Maintenance.countDocuments({ assignedTo: m._id, status: { $in: ['open', 'in_progress'] } })
        ]);
        return {
          id: m._id,
          name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
          assignedProperties,
          openTickets
        };
      })
    );

    builder
      .setSummary({ managerCount, managers: managerStats })
      .addKPI('total_managers', 'Total Property Managers', managerCount, '', 'neutral')
      .addChart('bar', 'Manager Property Workload', managerStats.map(s => ({
        manager: s.name,
        properties: s.assignedProperties,
        tickets: s.openTickets
      })), { x: 'manager', y: 'properties' })
      .setMeta({ filters });

    return builder.build();
  }
}

const managerPerformanceReportServiceSingleton = new ManagerPerformanceReportService();
export default managerPerformanceReportServiceSingleton;
