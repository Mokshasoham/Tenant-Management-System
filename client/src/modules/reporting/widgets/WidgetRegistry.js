/**
 * client/src/modules/reporting/widgets/WidgetRegistry.js
 *
 * Pluggable Widget Registry supporting:
 * - permission filtering (e.g. 'admin', 'manager')
 * - refreshInterval (e.g. 30000, 60000ms)
 * - layout & priority settings
 * - dependencies
 * - dynamic component registration
 */

class WidgetRegistry {
  constructor() {
    this.widgets = new Map();
  }

  /**
   * Register a new dashboard widget.
   * @param {Object} config - { id, name, category, permission, refreshInterval, layout, priority, dependencies, component }
   */
  register(config) {
    if (!config.id || !config.component) {
      throw new Error('Widget registration requires id and component');
    }

    this.widgets.set(config.id, {
      permission: 'all',
      refreshInterval: 60000,
      layout: { span: 1 },
      priority: 10,
      dependencies: [],
      ...config
    });
  }

  /**
   * Get widget by ID
   */
  get(id) {
    return this.widgets.get(id);
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
   * Unregister widget
   */
  unregister(id) {
    return this.widgets.delete(id);
  }
}

export const widgetRegistry = new WidgetRegistry();
export default widgetRegistry;
