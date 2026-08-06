/**
 * client/src/components/dashboard/personalization/DashboardProfileSelector.jsx
 *
 * Header Profile Switcher Component:
 * - Switches active profile instantly
 * - Distinguishes Immutable Platform Presets from User Custom Layouts
 * - Handles Copy-on-Edit cloning when customizing presets
 */

import React from 'react';
import presetRegistry from '../../../modules/reporting/widgets/PresetRegistry';

export default function DashboardProfileSelector({
  activeProfileName = 'Default',
  userProfiles = [],
  userRole = 'admin',
  onSelectProfile,
  onClonePreset
}) {
  const presets = presetRegistry.getPresetsForRole(userRole);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="dashboard-profile-selector" className="text-xs text-slate-400 font-medium">
        Profile:
      </label>

      <div className="relative inline-block text-left">
        <select
          id="dashboard-profile-selector"
          value={activeProfileName}
          onChange={(e) => {
            const selectedVal = e.target.value;
            const targetPreset = presets.find((p) => p.name === selectedVal || p.id === selectedVal);

            if (targetPreset && onClonePreset) {
              onClonePreset(targetPreset);
            } else if (onSelectProfile) {
              onSelectProfile(selectedVal);
            }
          }}
          className="bg-slate-800 text-indigo-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer transition-all"
        >
          <optgroup label="Platform Presets (Immutable)">
            {presets.map((p) => (
              <option key={`preset-${p.id}`} value={p.name}>
                ⚡ {p.name} (Preset)
              </option>
            ))}
          </optgroup>

          {userProfiles.length > 0 && (
            <optgroup label="My Custom Profiles">
              {userProfiles.map((p) => (
                <option key={`custom-${p.profileName}`} value={p.profileName}>
                  👤 {p.profileName}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
    </div>
  );
}
