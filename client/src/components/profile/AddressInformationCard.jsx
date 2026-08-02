import React, { memo } from 'react';
import { MapPin, Building, Navigation, Mail } from 'lucide-react';
import SettingsCard from './primitives/SettingsCard';
import EditableField from './primitives/EditableField';

export const AddressInformationCard = memo(({
  form,
  errors = {},
  updateAddressField,
  disabled = false
}) => {
  return (
    <SettingsCard
      title="Address Information"
      subtitle="Current residential and permanent mailing address details"
      icon={MapPin}
      iconColor="text-indigo-500"
    >
      <div className="space-y-4">
        <EditableField
          label="Current Residential Address"
          value={form.address?.currentAddress}
          onChange={v => updateAddressField('currentAddress', v)}
          error={errors.currentAddress}
          disabled={disabled}
          icon={MapPin}
          placeholder="123 Main Street, Apt 4B"
        />

        <EditableField
          label="Permanent Address"
          value={form.address?.permanentAddress}
          onChange={v => updateAddressField('permanentAddress', v)}
          error={errors.permanentAddress}
          disabled={disabled}
          icon={Building}
          placeholder="456 Hometown Road"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableField
            label="City"
            value={form.address?.city}
            onChange={v => updateAddressField('city', v)}
            error={errors.city}
            disabled={disabled}
            placeholder="New York"
          />
          <EditableField
            label="State / Province"
            value={form.address?.state}
            onChange={v => updateAddressField('state', v)}
            error={errors.state}
            disabled={disabled}
            placeholder="NY"
          />
          <EditableField
            label="Postal Code"
            value={form.address?.postalCode}
            onChange={v => updateAddressField('postalCode', v)}
            error={errors.postalCode}
            disabled={disabled}
            icon={Navigation}
            placeholder="10001"
          />
          <EditableField
            label="Country"
            value={form.address?.country}
            onChange={v => updateAddressField('country', v)}
            error={errors.country}
            disabled={disabled}
            placeholder="United States"
          />
        </div>
      </div>
    </SettingsCard>
  );
});

AddressInformationCard.displayName = 'AddressInformationCard';
export default AddressInformationCard;
