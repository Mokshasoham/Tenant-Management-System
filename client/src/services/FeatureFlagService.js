import { FEATURE_FLAGS } from '../config/featureFlags';

/**
 * FeatureFlagService
 * Decouples UI components from hardcoded feature configurations.
 * Supports runtime toggles, local storage overrides, and future remote config providers.
 */
class FeatureFlagService {
  constructor() {
    this.flags = { ...FEATURE_FLAGS };
  }

  /**
   * Check if a feature flag is enabled.
   * @param {string} flagKey
   * @param {boolean} defaultValue
   * @returns {boolean}
   */
  isEnabled(flagKey, defaultValue = false) {
    if (Object.prototype.hasOwnProperty.call(this.flags, flagKey)) {
      return Boolean(this.flags[flagKey]);
    }
    return defaultValue;
  }

  /**
   * Override a flag value at runtime.
   * @param {string} flagKey
   * @param {boolean} value
   */
  setFlag(flagKey, value) {
    this.flags[flagKey] = Boolean(value);
  }

  /**
   * Returns copy of all active flags.
   * @returns {Object}
   */
  getAllFlags() {
    return { ...this.flags };
  }

  /**
   * Convenience check for Demo mode.
   * @returns {boolean}
   */
  isDemoMode() {
    return this.isEnabled('DEMO_MODE', true);
  }
}

export default new FeatureFlagService();
