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
  async generate(filters = {}, userId = null, role = null) {
    const builder = new ReportResponseBuilder('manager_performance');

    let managerQuery = { role: 'manager' };
    if (role === 'manager' && userId) {
      managerQuery._id = userId;
    }

    const managers = await User.find(managerQuery).lean();
    const managerCount = managers.length;

    const managerStats = await Promise.all(
      managers.map(async (m) => {
        const [assignedProperties, openTickets] = await Promise.all([
          Property.countDocuments({ $or: [{ manager: m._id }, { owner: m._id }] }),
          Maintenance.countDocuments({ assignedTo: m._id, status: { $in: ['open', 'in_progress'] } })
        ]);
        return {
          id: m._id,
          name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
          email: m.email,
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
      .setTable(
        ['Manager Name', 'Email', 'Assigned Properties', 'Open Maintenance Tickets'],
        managerStats.map(s => [s.name, s.email, s.assignedProperties, s.openTickets])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const managerPerformanceReportServiceSingleton = new ManagerPerformanceReportService();
export default managerPerformanceReportServiceSingleton;
