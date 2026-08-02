import React, { memo } from 'react';
import { Mail, Phone, ShieldCheck, UserCheck } from 'lucide-react';
import SettingsCard from './primitives/SettingsCard';
import EditableField from './primitives/EditableField';
import ReadOnlyField from './primitives/ReadOnlyField';
import StatusBadge from './primitives/StatusBadge';
import FormSection from './primitives/FormSection';
import SettingsDivider from './primitives/SettingsDivider';

export const ContactInformationCard = memo(({
  user,
  form,
  errors = {},
  updateField,
  updateEmergencyField,
  disabled = false
}) => {
  return (
    <SettingsCard
      title="Contact & Emergency Information"
      subtitle="Manage your primary & secondary contacts and emergency details"
      icon={Phone}
      iconColor="text-teal-500"
    >
      <div className="space-y-4">
        <FormSection title="Primary Contact Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <ReadOnlyField
                label="Primary Email (System Account)"
                value={user?.email || ''}
                icon={Mail}
              />
              <div className="mt-1.5 flex items-center gap-2">
                <StatusBadge label={user?.isEmailVerified ? "Email Verified" : "Unverified Email"} variant={user?.isEmailVerified ? "success" : "neutral"} />
              </div>
            </div>

            <EditableField
              label="Primary Phone Number"
              type="tel"
              value={form.phone}
              onChange={v => updateField('phone', v)}
              error={errors.phone}
              disabled={disabled}
              icon={Phone}
              placeholder="+1 (555) 000-0000"
              rightEl={
                user?.isPhoneVerified ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" title="Phone Verified" />
                ) : null
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <EditableField
              label="Secondary Email"
              type="email"
              value={form.secondaryEmail}
              onChange={v => updateField('secondaryEmail', v)}
              error={errors.secondaryEmail}
              disabled={disabled}
              icon={Mail}
              placeholder="secondary@example.com"
            />
            <EditableField
              label="Alternate Phone Number"
              type="tel"
              value={form.alternatePhone}
              onChange={v => updateField('alternatePhone', v)}
              error={errors.alternatePhone}
              disabled={disabled}
              icon={Phone}
              placeholder="+1 (555) 111-2222"
            />
          </div>
        </FormSection>

        <SettingsDivider />

        <FormSection title="Emergency Contact Details" description="Designated contact person for emergencies">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <EditableField
              label="Contact Name"
              value={form.emergencyContact?.name}
              onChange={v => updateEmergencyField('name', v)}
              error={errors.emergencyName}
              disabled={disabled}
              icon={UserCheck}
              placeholder="Jane Doe"
            />
            <EditableField
              label="Contact Phone"
              type="tel"
              value={form.emergencyContact?.phone}
              onChange={v => updateEmergencyField('phone', v)}
              error={errors.emergencyPhone}
              disabled={disabled}
              icon={Phone}
              placeholder="+1 (555) 999-8888"
            />
            <EditableField
              label="Relationship"
              value={form.emergencyContact?.relationship}
              onChange={v => updateEmergencyField('relationship', v)}
              error={errors.emergencyRelationship}
              disabled={disabled}
              placeholder="Spouse / Parent / Sibling"
            />
          </div>
        </FormSection>
      </div>
    </SettingsCard>
  );
});

ContactInformationCard.displayName = 'ContactInformationCard';
export default ContactInformationCard;
