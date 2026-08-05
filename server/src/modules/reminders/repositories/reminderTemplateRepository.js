/**
 * server/src/modules/reminders/repositories/reminderTemplateRepository.js
 *
 * Repository layer for Versioned Reminder Templates.
 * Automatically manages template versioning, setting isLatest flags, and fetching specific versions.
 */

import ReminderTemplate from '../models/ReminderTemplate.js';

export class ReminderTemplateRepository {
  /**
   * Creates a new template or a new version of an existing template family.
   * Automatically sets previous versions' `isLatest` to false.
   *
   * @param {object} templateData
   * @returns {Promise<object>}
   */
  async createTemplate(templateData) {
    const { templateId } = templateData;

    // Find highest current version for this templateId
    const highest = await ReminderTemplate.findOne({ templateId })
      .sort({ version: -1 })
      .select('version')
      .lean();

    const newVersion = highest ? highest.version + 1 : 1;

    // Mark previous versions as not latest
    if (highest) {
      await ReminderTemplate.updateMany(
        { templateId },
        { $set: { isLatest: false } }
      );
    }

    const newTemplate = new ReminderTemplate({
      ...templateData,
      version: newVersion,
      isLatest: true
    });

    return await newTemplate.save();
  }

  /**
   * Finds the latest active version of a template family by templateId.
   *
   * @param {string} templateId
   * @returns {Promise<object|null>}
   */
  async findLatest(templateId) {
    return await ReminderTemplate.findOne({ templateId, isLatest: true }).lean();
  }

  /**
   * Finds a specific version of a template family.
   *
   * @param {string} templateId
   * @param {number} version
   * @returns {Promise<object|null>}
   */
  async findByVersion(templateId, version) {
    return await ReminderTemplate.findOne({ templateId, version }).lean();
  }

  /**
   * Lists all versions for a template family.
   *
   * @param {string} templateId
   * @returns {Promise<Array>}
   */
  async listVersions(templateId) {
    return await ReminderTemplate.find({ templateId })
      .sort({ version: -1 })
      .lean();
  }
}

const reminderTemplateRepositorySingleton = new ReminderTemplateRepository();
export default reminderTemplateRepositorySingleton;
