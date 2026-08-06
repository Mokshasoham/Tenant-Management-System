/**
 * server/src/repositories/dashboardTemplateRepository.js
 *
 * Repository pattern implementation for DashboardTemplate catalog persistence.
 */

import DashboardTemplate from '../models/DashboardTemplate.js';

export class DashboardTemplateRepository {
  /**
   * Search catalog templates filtered by scope, category, and user role.
   */
  async searchCatalog({ scope, category, role, search, status = 'ACTIVE' }) {
    const filter = { status };

    if (category) {
      filter.category = category;
    }

    if (scope) {
      filter.scope = scope;
    } else {
      // By default show GLOBAL, ORGANIZATION, or matching role templates
      filter.$or = [
        { scope: 'GLOBAL' },
        { scope: 'ORGANIZATION' },
        { ownerRole: role }
      ];
    }

    if (search) {
      filter.$text = { $search: search };
    }

    return DashboardTemplate.find(filter)
      .sort({ featured: -1, usageCount: -1, createdAt: -1 })
      .lean();
  }

  async findById(id) {
    return DashboardTemplate.findById(id).lean();
  }

  async createTemplate(data) {
    return DashboardTemplate.create(data);
  }

  async incrementUsage(id) {
    return DashboardTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true }
    );
  }

  async softDelete(id) {
    return DashboardTemplate.findByIdAndUpdate(
      id,
      { $set: { status: 'ARCHIVED' } },
      { new: true }
    );
  }
}

const dashboardTemplateRepositorySingleton = new DashboardTemplateRepository();
export default dashboardTemplateRepositorySingleton;
