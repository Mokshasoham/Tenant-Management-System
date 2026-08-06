/**
 * client/src/modules/reporting/widgets/WidgetRegistry.js
 *
 * Pluggable Plugin Widget Registry supporting:
 * - permission filtering (e.g. 'admin', 'manager', 'tenant')
 * - refreshInterval (e.g. 30000, 60000ms)
 * - semantic grid layout spans { w: 1..4, h: 1..2 }
 * - widget locking (locked: true for core unremovable widgets)
 * - AI capability discovery (supportsAI: true)
 * - dynamic component registration & category queries
 */

class WidgetRegistry {
  constructor() {
    this.widgets = new Map();
  }

  /**
   * Register a new dashboard widget.
   */
  registerWidget(config) {
    if (!config.id || !config.component) {
      throw new Error('Widget registration requires id and component');
    }

    this.widgets.set(config.id, {
      permission: 'all',
      refreshInterval: 60000,
      layout: { w: 2, h: 1 },
      priority: 10,
      locked: false,
      supportsAI: true,
      category: 'general',
      dependencies: [],
      ...config
    });
  }

  // Alias for backward compatibility
  register(config) {
    this.registerWidget(config);
  }

  /**
   * Get widget by ID
   */
  getWidget(id) {
    return this.widgets.get(id);
  }

  get(id) {
    return this.getWidget(id);
  }

  /**
   * List widgets filtered by user role / category
   */
  getWidgetsForRole(role = 'admin', category = null) {
    return Array.from(this.widgets.values())
      .filter((w) => {
        const matchesRole = w.permission === 'all' || w.permission === role || (Array.isArray(w.permission) && w.permission.includes(role));
        const matchesCategory = !category || w.category === category;
        return matchesRole && matchesCategory;
      })
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * Query widgets by category
   */
  getWidgetsByCategory(category) {
    return Array.from(this.widgets.values()).filter((w) => w.category === category);
  }

  /**
   * Unregister widget by ID
   */
  unregisterWidget(id) {
    return this.widgets.delete(id);
  }

  unregister(id) {
    return this.unregisterWidget(id);
  }
}

export const widgetRegistry = new WidgetRegistry();
export default widgetRegistry;
