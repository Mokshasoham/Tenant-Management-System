import React, { memo } from 'react';
import { User, Briefcase, Globe, Calendar, Smile } from 'lucide-react';
import SettingsCard from './primitives/SettingsCard';
import EditableField from './primitives/EditableField';

export const PersonalInformationCard = memo(({
  form,
  errors = {},
  updateField,
  disabled = false
}) => {
  return (
    <SettingsCard
      title="Personal Information"
      subtitle="Manage your personal details and identity information"
      icon={User}
      iconColor="text-blue-500"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableField
            label="First Name"
            required
            value={form.firstName}
            onChange={v => updateField('firstName', v)}
            error={errors.firstName}
            disabled={disabled}
            icon={User}
            placeholder="John"
          />
          <EditableField
            label="Last Name"
            required
            value={form.lastName}
            onChange={v => updateField('lastName', v)}
            error={errors.lastName}
            disabled={disabled}
            icon={User}
            placeholder="Doe"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableField
            label="Preferred Name"
            value={form.preferredName}
            onChange={v => updateField('preferredName', v)}
            disabled={disabled}
            icon={Smile}
            placeholder="e.g. Johnny"
          />
          <EditableField
            label="Gender"
            error={errors.gender}
            disabled={disabled}
          >
            <select
              value={form.gender || ''}
              onChange={e => updateField('gender', e.target.value)}
              disabled={disabled}
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-muted/30 border border-border text-foreground text-sm focus:border-primary/60 focus:outline-none transition-all disabled:opacity-40"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-Binary</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </EditableField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <EditableField
            label="Date of Birth"
            type="date"
            value={form.dob}
            onChange={v => updateField('dob', v)}
            error={errors.dob}
            disabled={disabled}
            icon={Calendar}
          />
          <EditableField
            label="Occupation"
            value={form.occupation}
            onChange={v => updateField('occupation', v)}
            error={errors.occupation}
            disabled={disabled}
            icon={Briefcase}
            placeholder="Software Engineer"
          />
          <EditableField
            label="Nationality"
            value={form.nationality}
            onChange={v => updateField('nationality', v)}
            error={errors.nationality}
            disabled={disabled}
            icon={Globe}
            placeholder="United States"
          />
        </div>
      </div>
    </SettingsCard>
  );
});

PersonalInformationCard.displayName = 'PersonalInformationCard';
export default PersonalInformationCard;
