import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  LogIn,
  LogOut,
  Loader2,
  Navigation
} from 'lucide-react';
import { technicianPortalService } from '../../services/api';

/**
 * CheckInOutPanel Component
 * Displays current ticket check-in / check-out status, verification badge,
 * on-site duration timer, and action buttons for checking in and out with GPS.
 */
export default function CheckInOutPanel({ ticket, ticketId, onStatusChange }) {
  const activeTicketId = ticketId || ticket?._id;

  // Local state initialized from ticket prop or updated after API calls
  const [checkInState, setCheckInState] = useState({
    isCheckedIn: ticket?.checkIn?.isCheckedIn || ticket?.status === 'in_progress' || false,
    isCheckedOut: ticket?.checkIn?.isCheckedOut || ticket?.status === 'completed' || false,
    checkInTime: ticket?.checkIn?.checkInTime || ticket?.checkedInAt || null,
    checkOutTime: ticket?.checkOut?.checkOutTime || ticket?.checkedOutAt || null,
    verificationStatus: ticket?.checkIn?.verificationStatus || ticket?.verificationStatus || null,
    distance: ticket?.checkIn?.distance || ticket?.geofenceDistance || null,
  });

  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync state if ticket prop updates
  useEffect(() => {
    if (ticket) {
      const inTime = ticket.checkIn?.checkInTime || ticket.checkedInAt || checkInState.checkInTime;
      const outTime = ticket.checkOut?.checkOutTime || ticket.checkedOutAt || checkInState.checkOutTime;
      const isCheckedIn = Boolean(inTime && !outTime);
      const isCheckedOut = Boolean(outTime);

      setCheckInState({
        isCheckedIn: ticket.checkIn?.isCheckedIn ?? (isCheckedIn || ticket.status === 'in_progress'),
        isCheckedOut: ticket.checkIn?.isCheckedOut ?? (isCheckedOut || ticket.status === 'completed'),
        checkInTime: inTime,
        checkOutTime: outTime,
        verificationStatus: ticket.checkIn?.verificationStatus || ticket.verificationStatus || (inTime ? 'VERIFIED' : null),
        distance: ticket.checkIn?.distance || ticket.geofenceDistance || null,
      });
    }
  }, [ticket]);

  // On-Site Duration Live Timer
  useEffect(() => {
    let timerInterval = null;

    if (checkInState.checkInTime && !checkInState.checkOutTime) {
      const calculateElapsed = () => {
        const start = new Date(checkInState.checkInTime).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        setElapsedSeconds(diff);
      };

      calculateElapsed();
      timerInterval = setInterval(calculateElapsed, 1000);
    } else if (checkInState.checkInTime && checkInState.checkOutTime) {
      const start = new Date(checkInState.checkInTime).getTime();
      const end = new Date(checkInState.checkOutTime).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((end - start) / 1000)));
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [checkInState.checkInTime, checkInState.checkOutTime]);

  const formatDuration = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    const pad = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Helper to obtain current position
  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null, error: 'GPS_UNAVAILABLE' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        (err) => resolve({ latitude: null, longitude: null, error: err.message || 'GPS_UNAVAILABLE' }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Handle Check In
  const handleCheckIn = async () => {
    setLoadingAction(true);
    setErrorMsg(null);

    try {
      const location = await getCoordinates();
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        gpsError: Boolean(location.error),
      };

      const res = await technicianPortalService.checkInJob(activeTicketId, payload);
      const data = res?.data || res || {};

      const nowIso = new Date().toISOString();
      const newStatus = data.verificationStatus || (location.error ? 'GPS_UNAVAILABLE' : 'VERIFIED');

      const newState = {
        isCheckedIn: true,
        isCheckedOut: false,
        checkInTime: data.checkInTime || data.checkIn?.checkInTime || nowIso,
        checkOutTime: null,
        verificationStatus: newStatus,
        distance: data.distance || data.geofenceDistance || location.distance || null,
      };

      setCheckInState(newState);

      if (onStatusChange) {
        onStatusChange({
          ...ticket,
          status: 'in_progress',
          checkIn: newState,
          verificationStatus: newStatus,
        });
      }
    } catch (err) {
      console.error('Check-in error:', err);
      setErrorMsg(err.message || 'Check-in failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Check Out
  const handleCheckOut = async () => {
    setLoadingAction(true);
    setErrorMsg(null);

    try {
      const location = await getCoordinates();
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        notes: checkoutNotes,
      };

      const res = await technicianPortalService.checkOutJob(activeTicketId, payload);
      const data = res?.data || res || {};

      const nowIso = new Date().toISOString();

      const newState = {
        ...checkInState,
        isCheckedIn: false,
        isCheckedOut: true,
        checkOutTime: data.checkOutTime || data.checkOut?.checkOutTime || nowIso,
      };

      setCheckInState(newState);
      setShowNotesInput(false);

      if (onStatusChange) {
        onStatusChange({
          ...ticket,
          status: 'completed',
          checkOut: newState,
        });
      }
    } catch (err) {
      console.error('Check-out error:', err);
      setErrorMsg(err.message || 'Check-out failed. Please try again.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Badge renderer
  const renderVerificationBadge = () => {
    const status = checkInState.verificationStatus;
    if (!status && !checkInState.checkInTime) return null;

    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-fade-scale">
            <CheckCircle2 className="w-3.5 h-3.5" />
            VERIFIED ON-SITE
          </span>
        );

      case 'OUTSIDE_RADIUS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-fade-scale">
            <AlertTriangle className="w-3.5 h-3.5" />
            OUTSIDE RADIUS {checkInState.distance ? `(${Math.round(checkInState.distance)}m)` : ''}
          </span>
        );

      case 'GPS_UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-fade-scale">
            <XCircle className="w-3.5 h-3.5" />
            GPS UNAVAILABLE
          </span>
        );

      case 'MANUAL_OVERRIDE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-fade-scale">
            <ShieldAlert className="w-3.5 h-3.5" />
            MANUAL OVERRIDE
          </span>
        );

      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            VERIFIED
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-xl space-y-4 shadow-xl">
      {/* Header & Verification Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Job Location Check-In</h3>
            <p className="text-[11px] text-slate-400">GPS geofence verification & duration tracking</p>
          </div>
        </div>
        <div>{renderVerificationBadge()}</div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Status & Timer Body */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* On-Site Timer Box */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              On-Site Timer
            </span>
            {checkInState.checkInTime && !checkInState.checkOutTime && (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Active Work
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono tracking-wider text-cyan-300">
            {formatDuration(elapsedSeconds)}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>In: {checkInState.checkInTime ? new Date(checkInState.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            <span>Out: {checkInState.checkOutTime ? new Date(checkInState.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="flex flex-col justify-center gap-2">
          {!checkInState.checkInTime && !checkInState.isCheckedOut && (
            <button
              onClick={handleCheckIn}
              disabled={loadingAction}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loadingAction ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying GPS Location...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Check In (GPS Verify)
                </>
              )}
            </button>
          )}

          {checkInState.checkInTime && !checkInState.checkOutTime && (
            <>
              {!showNotesInput ? (
                <button
                  onClick={() => setShowNotesInput(true)}
                  disabled={loadingAction}
                  className="w-full h-12 rounded-xl bg-slate-800 hover:bg-emerald-600/90 text-white font-bold text-sm border border-emerald-500/40 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-emerald-400" />
                  Check Out & Finish Job
                </button>
              ) : (
                <div className="space-y-2 animate-slide-up">
                  <input
                    type="text"
                    placeholder="Work summary / completion notes (optional)"
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCheckOut}
                      disabled={loadingAction}
                      className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {loadingAction ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      Confirm Check Out
                    </button>
                    <button
                      onClick={() => setShowNotesInput(false)}
                      className="px-3 h-10 rounded-xl bg-slate-800 text-slate-400 text-xs hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {checkInState.checkOutTime && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Job Completed & Checked Out
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
