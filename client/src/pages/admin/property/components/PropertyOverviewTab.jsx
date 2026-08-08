import React, { useState } from 'react';
import {
  Building2, MapPin, Bed, Bath, Square, User, Phone, Mail,
  ShieldCheck, Layers, Video, Image as ImageIcon, Compass,
  Car, Calendar, Award, CheckCircle2, ChevronRight, Play
} from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';
import { cn } from '../../../../utils/cn';

export default function PropertyOverviewTab({ property, theme }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState('photos'); // 'photos' | 'video'
  const [activeVideoUrl, setActiveVideoUrl] = useState(property?.videoTours?.[0]?.url || '');

  const images = property?.images || [];
  const videoTours = property?.videoTours || [];

  return (
    <div className="space-y-6">
      {/* ══ MEDIA SHOWCASE & VIDEO TOURS ══ */}
      <VerificationSectionCard title="360° Property Media Showcase & Video Tours" icon={Video}>
        <div className="space-y-4">
          {/* Media Sub-tabs Pill Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMediaTab('photos')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                activeMediaTab === 'photos'
                  ? "bg-indigo-600 text-white shadow-lg"
                  : theme === 'light' ? "bg-slate-200 text-slate-700" : "bg-slate-900 text-slate-300"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Photo Gallery ({images.length})
            </button>
            <button
              onClick={() => setActiveMediaTab('video')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                activeMediaTab === 'video'
                  ? "bg-indigo-600 text-white shadow-lg"
                  : theme === 'light' ? "bg-slate-200 text-slate-700" : "bg-slate-900 text-slate-300"
              )}
            >
              <Video className="w-3.5 h-3.5 text-rose-400" /> Video Tours & 360° ({videoTours.length})
            </button>
          </div>

          {/* Photo Gallery Viewer */}
          {activeMediaTab === 'photos' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 h-96 rounded-3xl overflow-hidden bg-slate-950 border border-white/10 relative shadow-2xl">
                {images[activeImageIndex] ? (
                  <img
                    src={images[activeImageIndex]}
                    alt="Property Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Building2 className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-black border border-white/10">
                  Image {activeImageIndex + 1} of {images.length}
                </div>
              </div>

              {/* Thumbnails */}
              <div className="grid grid-cols-4 lg:grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {images.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={cn(
                      "h-20 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all relative",
                      activeImageIndex === i ? "border-indigo-500 scale-95 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Tours Player */}
          {activeMediaTab === 'video' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 h-96 rounded-3xl overflow-hidden bg-slate-950 border border-white/10 relative shadow-2xl flex items-center justify-center">
                <div className="text-center space-y-3 p-6">
                  <div className="w-16 h-16 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Interactive 360° Video Walkthrough</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Full HD property video inspection tour recorded during initial property onboarding.
                  </p>
                </div>
              </div>

              {/* Video Tour List */}
              <div className="space-y-3">
                {videoTours.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => setActiveVideoUrl(vid.url)}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer space-y-1 backdrop-blur-xl transition-all",
                      theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/10"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {vid.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold">{vid.duration}</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-100">{vid.title}</h5>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </VerificationSectionCard>

      {/* ══ DETAILED STRUCTURAL SPECIFICATIONS ══ */}
      <VerificationSectionCard title="Structural Specifications & Building Specs" icon={Layers}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Floor Level', value: `${property.floorNumber || 4}th of ${property.totalFloors || 12} Floors`, icon: Building2, color: 'text-indigo-400' },
            { label: 'Facing Direction', value: property.facingDirection || 'East Facing', icon: Compass, color: 'text-emerald-400' },
            { label: 'Parking Spaces', value: `${property.parkingSpaces || 2} Covered`, icon: Car, color: 'text-amber-400' },
            { label: 'Furnishing Grade', value: property.furnishingGrade || 'Grade A Luxury', icon: Award, color: 'text-purple-400' },
            { label: 'Year Constructed', value: property.constructionYear || 2023, icon: Calendar, color: 'text-blue-400' },
            { label: 'Total Area', value: `${property.areaSqFt || 2250} sqft`, icon: Square, color: 'text-rose-400' },
            { label: 'Bedrooms / Baths', value: `${property.bedrooms || 3} Bed · ${property.bathrooms || 3} Bath`, icon: Bed, color: 'text-indigo-400' },
            { label: 'Society Name', value: property.societyName || 'Skyline Co-Op', icon: CheckCircle2, color: 'text-emerald-400' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-2xl border space-y-1.5 backdrop-blur-xl shadow-lg transition-all",
                  theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/10"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", item.color)} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <p className={cn("text-xs font-black truncate", theme === 'light' ? "text-slate-900" : "text-white")}>
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>
      </VerificationSectionCard>

      {/* ══ STAKEHOLDER PROFILES ══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Owner Card */}
        <VerificationSectionCard title="Property Owner" icon={User}>
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-100 text-sm">{property.owner?.name}</p>
            <p className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {property.owner?.phone}</p>
            <p className="text-muted-foreground flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-indigo-400" /> {property.owner?.email}</p>
          </div>
        </VerificationSectionCard>

        {/* Manager Card */}
        <VerificationSectionCard title="Property Manager" icon={ShieldCheck}>
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-100 text-sm">{property.manager?.name}</p>
            <p className="text-muted-foreground">Contact: {property.manager?.contactPerson}</p>
            <p className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {property.manager?.phone}</p>
            <p className="text-muted-foreground flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-emerald-400" /> {property.manager?.email}</p>
          </div>
        </VerificationSectionCard>

        {/* Current Tenant Card */}
        <VerificationSectionCard title="Active Resident / Tenant" icon={User}>
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-100 text-sm">{property.currentTenant?.name}</p>
            <p className="text-muted-foreground">Lease: {property.currentTenant?.leaseStart} to {property.currentTenant?.leaseEnd}</p>
            <p className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-amber-400" /> {property.currentTenant?.phone}</p>
          </div>
        </VerificationSectionCard>
      </div>
    </div>
  );
}
