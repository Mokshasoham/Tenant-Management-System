/**
 * server/src/modules/reporting/repositories/savedReportRepository.js
 *
 * Repository Layer for SavedReport Presets and Favorites Management.
 */

import SavedReport from '../models/SavedReport.js';

export class SavedReportRepository {
  async create(data) {
    return SavedReport.create(data);
  }

  async findByUser(userId) {
    return SavedReport.find({ createdBy: userId })
      .sort({ isFavorite: -1, updatedAt: -1 })
      .lean();
  }

  async findById(id) {
    return SavedReport.findById(id).lean();
  }

  async toggleFavorite(id, userId) {
    const report = await SavedReport.findOne({ _id: id, createdBy: userId });
    if (!report) return null;

    report.isFavorite = !report.isFavorite;
    await report.save();
    return report;
  }

  async delete(id, userId) {
    return SavedReport.deleteOne({ _id: id, createdBy: userId });
  }
}

const savedReportRepositorySingleton = new SavedReportRepository();
export default savedReportRepositorySingleton;
