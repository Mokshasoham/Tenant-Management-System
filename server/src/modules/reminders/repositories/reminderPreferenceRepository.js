/**
 * server/src/modules/reminders/repositories/reminderPreferenceRepository.js
 *
 * Repository layer for User Reminder Preferences and Quiet Hours.
 */

import ReminderPreference from '../models/ReminderPreference.js';
import { DEFAULT_QUIET_HOURS } from '../constants/reminderConstants.js';

export class ReminderPreferenceRepository {
  /**
   * Retrieves preferences for a user, or creates default preferences if none exist.
   *
   * @param {string|ObjectId} userId
   * @returns {Promise<object>}
   */
  async getByUser(userId) {
    let prefs = await ReminderPreference.findOne({ user: userId });
    if (!prefs) {
      prefs = await ReminderPreference.create({
        user: userId,
        emailEnabled: true,
        smsEnabled: true,
        quietHours: { ...DEFAULT_QUIET_HOURS }
      });
    }
    return prefs;
  }

  /**
   * Upserts preference values for a user.
   *
   * @param {string|ObjectId} userId
   * @param {object} updateData
   * @returns {Promise<object>}
   */
  async upsert(userId, updateData) {
    return await ReminderPreference.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );
  }
}

const reminderPreferenceRepositorySingleton = new ReminderPreferenceRepository();
export default reminderPreferenceRepositorySingleton;
