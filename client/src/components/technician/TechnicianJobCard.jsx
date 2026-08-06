import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Clock,
  MapPin,
  Phone,
  Navigation,
  Camera,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  PlayCircle,
  User
} from 'lucide-react';

/**
 * TechnicianJobCard Component
 * Immersive mobile-first field job card for field technicians.
 * Features priority badge, SLA timer, tenant call, Google Maps navigation, distance/ETA, check-in status, and quick actions.
 */
export default function TechnicianJobCard({
  job,
  onCheckIn,
  onPhotos,
  onStartJob,
  onViewDetails,
}) {
  const [slaTimeLeft, setSlaTimeLeft] = useState('');
  const [isSlaOverdue, setIsSlaOverdue] = useState(false);

  // Calculate SLA countdown timer
  useEffect(() => {
    const calculateSLA = () => {
      let slaDeadline = null;
      if (job?.slaDueDate) {
        slaDeadline = new Date(job.slaDueDate).getTime();
      } else if (job?.createdAt) {
        const slaHours = job.priority === 'emergency' ? 2 : job.priority === 'high' ? 8 : 24;
        slaDeadline = new Date(job.createdAt).getTime() + slaHours * 60 * 60 * 1000;
      }

      if (!slaDeadline) {
        setSlaTimeLeft('SLA: Standard');
        return;
      }

      const diff = slaDeadline - Date.now();
      if (diff <= 0) {
        const overdueMins = Math.abs(Math.floor(diff / (1000 * 60)));
        const overdueHours = Math.floor(overdueMins / 60);
        setIsSlaOverdue(true);
        setSlaTimeLeft(
          overdueHours > 0
            ? `SLA Overdue by ${overdueHours}h ${overdueMins % 60}m`
            : `SLA Overdue by ${overdueMins}m`
        );
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(mins / 60);
        setIsSlaOverdue(false);
        setSlaTimeLeft(
          hours > 0 ? `SLA: ${hours}h ${mins % 60}m left` : `SLA: ${mins}m left`
        );
      }
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 30000);
    return () => clearInterval(interval);
  }, [job]);

  // Generate Google Maps Link
  const getGoogleMapsUrl = () => {
    if (job?.property?.latitude && job?.property?.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${job.property.latitude},${job.property.longitude}`;
    }
    const fullAddr = [
      job?.property?.name || job?.propertyName,
      job?.property?.address || job?.address,
      job?.city,
    ]
      .filter(Boolean)
      .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr || 'Properties')}`;
  };

  const tenantPhone = job?.tenant?.phone || job?.tenantPhone || job?.phone || '';
  const tenantName = job?.tenant?.name || job?.tenantName || job?.reportedBy || 'Tenant';
  const propertyName = job?.property?.name || job?.propertyName || 'Property Site';
  const unitNumber = job?.unit || job?.property?.unit || 'N/A';

  // Check-In Status Pill renderer
  const renderCheckInBadge = () => {
    const isCheckedIn = job?.checkIn?.isCheckedIn || job?.status === 'in_progress' || job?.checkedInAt;
    const isCheckedOut = job?.checkIn?.isCheckedOut || job?.status === 'completed' || job?.checkedOutAt;
    const status = job?.checkIn?.verificationStatus || job?.verificationStatus;

    if (isCheckedOut) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> Checked Out
        </span>
      );
    }
    if (isCheckedIn) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          <CheckCircle2 className="w-3 h-3 animate-pulse" /> {status === 'OUTSIDE_RADIUS' ? 'Checked In (Outside)' : 'Checked In'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        <MapPin className="w-3 h-3" /> Pending Check-In
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 p-5 backdrop-blur-xl transition-all duration-300 shadow-xl flex flex-col justify-between space-y-4">
      {/* Top Bar: Priority Pill & SLA Timer */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              job?.priority === 'emergency'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : job?.priority === 'high'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {job?.priority || 'medium'}
          </span>
          {renderCheckInBadge()}
        </div>

        {/* SLA Timer */}
        <div
          className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
            isSlaOverdue
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-slate-800/80 text-cyan-300 border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{slaTimeLeft}</span>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-white line-clamp-1 flex items-center justify-between">
          <span>{job?.title || 'Maintenance Request'}</span>
          <span className="text-xs font-mono text-slate-400 font-normal">#{job?._id?.slice(-6)}</span>
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2">{job?.description}</p>

        {/* Property & Tenant Meta */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className="text-white font-semibold truncate block">{propertyName}</span>
              <span className="text-slate-400 text-[11px]">Unit {unitNumber}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-white font-semibold truncate block">{tenantName}</span>
                <span className="text-slate-400 text-[11px]">Resident</span>
              </div>
            </div>
            {tenantPhone && (
              <a
                href={`tel:${tenantPhone}`}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95"
              >
                <Phone className="w-3 h-3" /> Call
              </a>
            )}
          </div>
        </div>

        {/* Distance & ETA Badges */}
        <div className="flex items-center gap-2 pt-1">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-300 text-[11px] font-medium flex items-center gap-1">
            <Navigation className="w-3 h-3 text-cyan-400" />
            {job?.distance ? `${job.distance} km away` : '1.4 km away'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-300 text-[11px] font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            {job?.eta ? `${job.eta} min ETA` : '~10 min ETA'}
          </span>
          <a
            href={getGoogleMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
          >
            <Navigation className="w-3 h-3" /> Navigate
          </a>
        </div>
      </div>

      {/* Quick Action Buttons Grid */}
      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Check In Action */}
        <button
          onClick={() => onCheckIn && onCheckIn(job)}
          className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          Check In
        </button>

        {/* Photos Action */}
        <button
          onClick={() => onPhotos && onPhotos(job)}
          className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          Photos
        </button>

        {/* Start Job Action */}
        <button
          onClick={() => onStartJob && onStartJob(job._id)}
          disabled={job?.status === 'in_progress' || job?.status === 'completed'}
          className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            job?.status === 'in_progress'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/10 cursor-pointer'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5" />
          {job?.status === 'in_progress' ? 'In Progress' : 'Start Job'}
        </button>

        {/* View Details Action */}
        <Link
          to={`/technician/jobs/${job._id}`}
          className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          Details
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
