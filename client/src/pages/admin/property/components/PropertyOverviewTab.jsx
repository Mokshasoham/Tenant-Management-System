import React from 'react';
import { Home, MapPin, Building2, User, Star, Award, CheckCircle } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';

export default function PropertyOverviewTab({ property }) {
  if (!property) return null;

  return (
    <div className="space-y-6">
      {/* Gallery Grid */}
      <VerificationSectionCard title="Property Image Gallery" icon={Home}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(property.images || []).map((img, idx) => (
            <div key={idx} className="h-40 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          ))}
        </div>
      </VerificationSectionCard>

      {/* Basic Specs & Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VerificationSectionCard title="Property Specifications & Location" icon={Building2}>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Property Type</span>
              <span className="text-white font-bold uppercase">{property.type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Bedrooms / Bathrooms</span>
              <span className="text-slate-200 font-semibold">{property.bedrooms} Beds / {property.bathrooms} Baths</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Carpet Area</span>
              <span className="text-slate-200 font-semibold">{property.areaSqFt} sqft</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Created Date</span>
              <span className="text-slate-200 font-mono">{property.createdDate}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Geo Coordinates</span>
              <span className="text-indigo-400 font-mono">{property.lat}, {property.lng}</span>
            </div>
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title="Stakeholder Profiles" icon={User}>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400">Property Owner</p>
                <p className="font-bold text-slate-100">{property.owner?.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{property.owner?.phone}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Owner
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400">Property Manager</p>
                <p className="font-bold text-slate-100">{property.manager?.name}</p>
                <p className="text-[10px] text-indigo-400 font-semibold">{property.manager?.rating} ★ · {property.manager?.propertiesManaged} Properties</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Assigned
              </span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>
    </div>
  );
}
