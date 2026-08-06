/**
 * client/src/modules/reporting/widgets/PresetRegistry.js
 *
 * Pluggable Registry for Immutable Platform Dashboard Presets:
 * - Default (General Overview)
 * - Finance (Revenue, Payments, Invoices, Collection Rates)
 * - Occupancy & Leases (Properties, Active/Expiring Leases)
 * - Maintenance & Operations (Tickets, Resolution Times, Reminders)
 */

class PresetRegistry {
  constructor() {
    this.presets = new Map();
    this._initializeDefaultPresets();
  }

  _initializeDefaultPresets() {
    // 1. Default Operational Preset
    this.registerPreset({
      id: 'default',
      name: 'Default Overview',
      role: 'all',
      description: 'General operational dashboard with balanced metrics.',
      isPreset: true,
      widgets: [
        { widgetId: 'revenue_kpi', enabled: true, x: 0, y: 0, w: 2, h: 1 },
        { widgetId: 'occupancy_kpi', enabled: true, x: 2, y: 0, w: 2, h: 1 },
        { widgetId: 'maintenance_kpi', enabled: true, x: 0, y: 1, w: 2, h: 1 },
        { widgetId: 'reminders_kpi', enabled: true, x: 2, y: 1, w: 2, h: 1 }
      ]
    });

    // 2. Finance Executive Preset
    this.registerPreset({
      id: 'finance',
      name: 'Finance Executive',
      role: 'admin',
      description: 'Focused on revenue, payment collection rates, and financial metrics.',
      isPreset: true,
      widgets: [
        { widgetId: 'revenue_kpi', enabled: true, x: 0, y: 0, w: 4, h: 1 },
        { widgetId: 'payment_collection_kpi', enabled: true, x: 0, y: 1, w: 2, h: 1 },
        { widgetId: 'recent_transactions_table', enabled: true, x: 2, y: 1, w: 2, h: 1 }
      ]
    });

    // 3. Maintenance & Operations Preset
    this.registerPreset({
      id: 'maintenance_ops',
      name: 'Maintenance & Operations',
      role: 'manager',
      description: 'Focused on ticket resolution times, queue status, and dispatching.',
      isPreset: true,
      widgets: [
        { widgetId: 'maintenance_kpi', enabled: true, x: 0, y: 0, w: 2, h: 1 },
        { widgetId: 'reminders_kpi', enabled: true, x: 2, y: 0, w: 2, h: 1 }
      ]
    });
  }

  registerPreset(config) {
    if (!config.id || !config.name || !Array.isArray(config.widgets)) {
      throw new Error('Preset registration requires id, name, and widgets array');
    }

    this.presets.set(config.id, {
      role: 'all',
      isPreset: true,
      ...config
    });
  }

  getPreset(id) {
    return this.presets.get(id);
  }

  getPresetsForRole(role = 'admin') {
    return Array.from(this.presets.values()).filter(
      (p) => p.role === 'all' || p.role === role || (Array.isArray(p.role) && p.role.includes(role))
    );
  }
}

export const presetRegistry = new PresetRegistry();
export default presetRegistry;
