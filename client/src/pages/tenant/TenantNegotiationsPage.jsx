import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { offerService } from '../../services/api';
import {
  Handshake, Clock, CheckCircle2, XCircle, ArrowRight,
  TrendingDown, Shield, RefreshCw, MessageSquare, AlertTriangle,
  Building2, Calendar, Loader2, Sparkles, ChevronRight, X, ExternalLink
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import { calculateLeaseDuration, formatDateRange, formatDateSingle } from '../../utils/dateDurationHelper';

export default function TenantNegotiationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [responseAction, setResponseAction] = useState('accept'); // 'accept' | 'counter' | 'cancel' | 'history'
  const [counterRent, setCounterRent] = useState('');
  const [counterStartDate, setCounterStartDate] = useState('');
  const [counterEndDate, setCounterEndDate] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await offerService.getMyOffers();
      const list = res.data?.offers || res.data || [];
      setOffers(list);
    } catch (err) {
      console.error('Failed to fetch tenant offers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleOpenAction = (offer, defaultAction = 'accept') => {
    setSelectedOffer(offer);
    setResponseAction(defaultAction);
    setCounterRent(String(offer.currentOffer || ''));
    const startVal = offer.startDate || offer.moveInDate;
    const endVal = offer.endDate;
    setCounterStartDate(startVal ? new Date(startVal).toISOString().split('T')[0] : '');
    setCounterEndDate(endVal ? new Date(endVal).toISOString().split('T')[0] : '');
    setCounterMessage('');
    setActionError('');
  };

  const handleExecuteResponse = async (e) => {
    e.preventDefault();
    if (!selectedOffer) return;
    setSubmitting(true);
    setActionError('');
    try {
      const payload = {
        action: responseAction,
        message: counterMessage
      };
      if (responseAction === 'counter') {
        const rentNum = Number(counterRent);
        if (!rentNum || rentNum <= 0) {
          setActionError('Please enter a valid counter rent amount.');
          setSubmitting(false);
          return;
        }
        const listedRent = selectedOffer.property?.rentAmount || 0;
        if (listedRent > 0 && rentNum > listedRent) {
          setActionError(`Counter offer cannot exceed the listed rent of ₹${listedRent.toLocaleString('en-IN')}.`);
          setSubmitting(false);
          return;
        }
        if (!counterStartDate || !counterEndDate) {
          setActionError('Please select both start date and end date for your counter offer.');
          setSubmitting(false);
          return;
        }
        if (new Date(counterEndDate) <= new Date(counterStartDate)) {
          setActionError('Lease end date must be after the start date.');
          setSubmitting(false);
          return;
        }
        const dur = calculateLeaseDuration(counterStartDate, counterEndDate);
        payload.counterOffer = rentNum;
        payload.startDate = counterStartDate;
        payload.endDate = counterEndDate;
        payload.leasePeriod = dur?.text || '12 months';
      }

      await offerService.respondToOffer(selectedOffer._id, responseAction, payload);
      setSelectedOffer(null);
      fetchOffers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit response.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatHistoryDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">
            <Handshake className="w-4 h-4" />
            <span>Private Negotiations</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">My Rent Offers & Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your 1-on-1 private rent proposals, manager counter-offers, and locked lease rates.
          </p>
        </div>

        <button
          onClick={fetchOffers}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-muted/80 hover:bg-muted border border-border text-xs font-bold text-foreground flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Offers Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs font-bold">Loading your offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="py-16 p-8 rounded-3xl bg-muted/20 border border-border border-dashed text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
            <Handshake className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-foreground">No active rent negotiations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When you find an eligible property, you can propose a private 1-on-1 rent offer directly to the landlord.
            </p>
          </div>
          <button
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 rounded-2xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all shadow"
          >
            Browse Properties
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const prop = offer.property || {};
            const listedRent = prop.rentAmount || 0;
            const offerRent = offer.currentOffer || offer.offeredRent || 0;
            const diff = listedRent - offerRent;
            const discountPct = listedRent ? Math.round((diff / listedRent) * 100) : 0;
            const isBookingRejected = Boolean(offer.booking && (offer.booking.status === 'rejected' || offer.bookingStatus === 'rejected')) || offer.expirationReason === 'booking_rejected_by_manager';
            const isExpired = offer.status === 'expired' || isBookingRejected || (Boolean(offer.expiresAt) && new Date(offer.expiresAt) < new Date());
            const isAccepted = offer.status === 'accepted' && !isExpired && !isBookingRejected;
            const canRespond = !isExpired && !isAccepted && (offer.canTenantRespond || (['pending', 'countered'].includes(offer.status) && offer.currentTurn === 'tenant'));

            return (
              <motion.div
                key={offer._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-3xl bg-card border transition-all p-5 flex flex-col justify-between space-y-5",
                  isAccepted
                    ? "border-emerald-500/40 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                    : isExpired
                    ? "border-border/60 opacity-95"
                    : canRespond
                    ? "border-blue-500/40 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/20"
                    : "border-border"
                )}
              >
                <div className="space-y-4">
                  {/* Top: Deal # & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                      {offer.dealNumber || 'DEAL'}
                    </span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      isAccepted
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : canRespond
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse"
                        : isExpired
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : offer.status === 'rejected'
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}>
                      {isAccepted
                        ? '🎉 Deal Locked!'
                        : canRespond
                        ? 'Your Turn to Respond'
                        : isExpired
                        ? 'Deal Expired'
                        : offer.status === 'pending'
                        ? 'Awaiting Review'
                        : offer.status === 'countered'
                        ? 'Awaiting Manager'
                        : offer.status}
                    </span>
                  </div>

                  {/* Property Quick Info */}
                  <div
                    onClick={() => navigate(`/properties/${prop._id || prop.id}`)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                      <img
                        src={resolveMediaUrl(prop.images?.[0]?.url || prop.images?.[0] || DEFAULT_PLACEHOLDER_SVG)}
                        alt={prop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all"
                        onError={(e) => { e.target.src = DEFAULT_PLACEHOLDER_SVG; }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-foreground truncate group-hover:text-emerald-500 transition-colors">
                        {prop.name || 'Property'}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate">{prop.city}, {prop.address}</p>
                    </div>
                  </div>

                  {/* Pricing Comparison */}
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    isAccepted
                      ? "bg-emerald-500/10 border-emerald-500/25"
                      : isExpired
                      ? "bg-muted/30 border-border/60"
                      : "bg-muted/40 border-border/80"
                  )}>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Listed Rent</span>
                      <span className="text-xs font-semibold text-muted-foreground line-through font-mono">
                        ₹{listedRent.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-[10px] uppercase font-bold block",
                        isAccepted ? "text-emerald-400" : isExpired ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {isAccepted ? 'Locked Rent' : isExpired ? 'Expired Offer' : 'Current Offer'}
                      </span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn(
                          "text-xl font-black font-mono",
                          isAccepted ? "text-emerald-400" : isExpired ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          ₹{(isAccepted ? (offer.agreedRent || offerRent) : offerRent).toLocaleString('en-IN')}
                        </span>
                        {discountPct > 0 && !isExpired && (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            -{discountPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {offer.maintenanceIncluded && (
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <span className="font-bold">Maintenance &amp; Repairs:</span>
                      <span className="font-mono font-bold">
                        +₹{(offer.maintenanceAmount || 500).toLocaleString('en-IN')}/mo (Total: ₹{((isAccepted ? (offer.agreedRent || offerRent) : offerRent) + (offer.maintenanceAmount || 500)).toLocaleString('en-IN')}/mo)
                      </span>
                    </div>
                  )}

                  {/* Terms & Validity */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Lease Period</span>
                        <span className="font-mono text-[10px] text-muted-foreground">Round {offer.roundCount || 1} of {offer.maxRounds || 5}</span>
                      </div>
                      <p className="font-bold text-foreground text-xs">
                        {formatDateRange(isAccepted ? (offer.agreedStartDate || offer.startDate) : offer.startDate, isAccepted ? (offer.agreedEndDate || offer.endDate) : offer.endDate)}
                      </p>
                      {calculateLeaseDuration(isAccepted ? (offer.agreedStartDate || offer.startDate) : offer.startDate, isAccepted ? (offer.agreedEndDate || offer.endDate) : offer.endDate)?.text && (
                        <span className="text-[10px] font-mono text-emerald-400 block font-semibold">
                          Duration: {calculateLeaseDuration(isAccepted ? (offer.agreedStartDate || offer.startDate) : offer.startDate, isAccepted ? (offer.agreedEndDate || offer.endDate) : offer.endDate).text}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {isExpired
                          ? offer.expirationReason === 'booking_rejected_by_manager'
                            ? 'Deal expired (booking declined)'
                            : 'Deal expired'
                          : `Valid until ${new Date(offer.expiresAt).toLocaleDateString()}`}
                      </span>
                      <span className={cn(
                        "font-semibold",
                        canRespond ? "text-blue-400" : "text-muted-foreground/80"
                      )}>
                        {canRespond ? 'Action needed from you' : ''}
                      </span>
                    </div>

                    {offer.message && (
                      <p className="text-[11px] text-muted-foreground bg-muted/60 p-2.5 rounded-xl italic line-clamp-2 border border-border/50">
                        "{offer.message}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  {isAccepted ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                        <div className="flex items-center gap-1.5 font-bold mb-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Private Deal Locked
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Rate of ₹{(offer.agreedRent || offerRent).toLocaleString('en-IN')}/mo locked for {formatDateRange(offer.agreedStartDate || offer.startDate, offer.agreedEndDate || offer.endDate)}.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/properties/${prop._id || prop.id}`)}
                        className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Proceed to Book at ₹{(offer.agreedRent || offerRent).toLocaleString('en-IN')} Rate
                      </button>
                    </div>
                  ) : isExpired ? (
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deal Expired</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {offer.expirationReason === 'booking_rejected_by_manager'
                            ? (() => {
                                const expHist = offer.offerHistory?.slice().reverse().find(h => h.action === 'expired');
                                const reasonMatch = expHist?.message?.replace(/^Deal expired:\s*/i, '');
                                return reasonMatch || 'Booking request was declined by the manager.';
                              })()
                            : offer.expirationReason === 'deal_validity_expired'
                            ? 'Deal validity window expired without booking.'
                            : 'This negotiated deal has expired and cannot be booked.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/properties/${prop._id || prop.id}`, { state: { openNegotiation: true } })}
                          className="flex-1 py-2.5 rounded-2xl bg-foreground text-background hover:opacity-90 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Negotiate Again
                        </button>
                        <button
                          onClick={() => handleOpenAction(offer, 'history')}
                          className="py-2.5 px-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground transition-all text-xs font-bold flex items-center justify-center cursor-pointer"
                          title="View Deal History"
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ) : canRespond ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenAction(offer, 'accept')}
                          className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accept ₹{(offer.currentOffer || 0).toLocaleString('en-IN')}
                        </button>
                        {offer.canTenantCounter !== false && (offer.roundCount || 1) < (offer.maxRounds || 5) && (
                          <button
                            onClick={() => handleOpenAction(offer, 'counter')}
                            className="px-3.5 py-2.5 rounded-2xl bg-foreground text-background hover:opacity-90 font-black text-xs active:scale-95 transition-all shadow"
                          >
                            Counter
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenAction(offer, 'cancel')}
                          className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs active:scale-95 transition-all border border-rose-500/20"
                          title="Decline / Cancel Deal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleOpenAction(offer, 'history')}
                        className="w-full py-2 rounded-xl text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        <span>View Deal Timeline & Notes</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenAction(offer, 'history')}
                      className="w-full py-2.5 rounded-2xl bg-muted hover:bg-muted/80 text-foreground transition-all text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <span>View Deal History</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Response / Counter / Timeline Modal */}
      <AnimatePresence>
        {selectedOffer && (() => {
          const isSelectedBookingRejected = Boolean(selectedOffer.booking && (selectedOffer.booking.status === 'rejected' || selectedOffer.bookingStatus === 'rejected')) || selectedOffer.expirationReason === 'booking_rejected_by_manager';
          const isSelectedOfferExpired = selectedOffer.status === 'expired' || isSelectedBookingRejected || (Boolean(selectedOffer.expiresAt) && new Date(selectedOffer.expiresAt) < new Date());
          const isSelectedOfferAccepted = selectedOffer.status === 'accepted' && !isSelectedOfferExpired && !isSelectedBookingRejected;
          const canRespondToSelectedOffer = !isSelectedOfferExpired && !isSelectedOfferAccepted && responseAction !== 'history' && (selectedOffer.canTenantRespond || (['pending', 'countered'].includes(selectedOffer.status) && selectedOffer.currentTurn === 'tenant'));

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card w-full max-w-lg rounded-3xl border border-border p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setSelectedOffer(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    Deal #{selectedOffer.dealNumber}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedOffer.property?.name} • Round {selectedOffer.roundCount || 1} of {selectedOffer.maxRounds || 5}
                    {selectedOffer.roundsRemaining !== undefined && (
                      <span className="ml-1 text-emerald-400 font-semibold">
                        ({selectedOffer.roundsRemaining} {selectedOffer.roundsRemaining === 1 ? 'round' : 'rounds'} left)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Rounds History */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deal Rounds</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-2xl bg-muted/40 border border-border/70 divide-y divide-border/40">
                  {(selectedOffer.offerHistory || []).map((round, idx) => {
                    const senderRole = round.offeredBy || round.senderRole;
                    const isTenant = senderRole === 'tenant';
                    const rentAmount = round.amount ?? round.proposedAmount;
                    const noteText = round.note || round.message;
                    const dateStr = formatHistoryDate(round.offeredAt || round.timestamp);

                    return (
                      <div key={idx} className="pt-2 first:pt-0 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold capitalize text-foreground flex items-center gap-1.5">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isTenant ? "bg-emerald-400" : "bg-blue-400"
                            )} />
                            {isTenant ? 'You (Tenant)' : 'Property Manager'}
                            <span className="text-[10px] text-muted-foreground font-normal">
                              (Round {round.roundNumber || idx + 1})
                            </span>
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            ₹{rentAmount ? rentAmount.toLocaleString('en-IN') : '—'}/mo
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="line-clamp-1 italic">{noteText || 'No note attached'}</span>
                          <span className="font-mono text-[10px] shrink-0 ml-2">{dateStr}</span>
                        </div>
                        {round.startDate && round.endDate && (
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              📅 {formatDateRange(round.startDate, round.endDate)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold text-foreground">
                              {round.durationText || calculateLeaseDuration(round.startDate, round.endDate).durationText}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Form if responding */}
              {canRespondToSelectedOffer && (
                <form onSubmit={handleExecuteResponse} className="space-y-4 pt-2 border-t border-border">
                  <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-muted/60 border border-border">
                    <button
                      type="button"
                      onClick={() => setResponseAction('accept')}
                      className={cn(
                        "py-2 rounded-xl text-xs font-black transition-all",
                        responseAction === 'accept' ? "bg-emerald-500 text-white shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Accept (₹{selectedOffer.currentOffer?.toLocaleString('en-IN')})
                    </button>
                    {selectedOffer.canTenantCounter !== false && (selectedOffer.roundCount || 1) < (selectedOffer.maxRounds || 5) && (
                      <button
                        type="button"
                        onClick={() => setResponseAction('counter')}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black transition-all",
                          responseAction === 'counter' ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Counter Again
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setResponseAction('cancel')}
                      className={cn(
                        "py-2 rounded-xl text-xs font-black transition-all",
                        responseAction === 'cancel' ? "bg-rose-500 text-white shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Decline Deal
                    </button>
                  </div>

                  {responseAction === 'counter' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Your Proposed Rent (₹ / Month) *
                        </label>
                        <input
                          type="number"
                          required
                          value={counterRent}
                          onChange={(e) => setCounterRent(e.target.value)}
                          placeholder="e.g. 23500"
                          className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground font-black text-sm focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                            <span>Start Date *</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={counterStartDate}
                            onChange={(e) => setCounterStartDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                            <span>End Date *</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={counterEndDate}
                            onChange={(e) => setCounterEndDate(e.target.value)}
                            min={counterStartDate || new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {counterStartDate && counterEndDate && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                          <span className="text-muted-foreground text-[11px] font-medium">Calculated Duration:</span>
                          <span className="font-bold text-emerald-400">
                            {calculateLeaseDuration(counterStartDate, counterEndDate).durationText}
                          </span>
                        </div>
                      )}

                      <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border flex items-center justify-between">
                        <span>Upcoming Round:</span>
                        <span className="font-bold text-foreground">
                          Round {(selectedOffer.roundCount || 1) + 1} of {selectedOffer.maxRounds || 5}
                        </span>
                      </div>
                    </div>
                  )}

                  {responseAction === 'accept' && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-1">
                      <p className="font-bold">Accept Counter Offer</p>
                      <p className="text-[11px] text-muted-foreground">
                        This will lock in the deal at ₹{selectedOffer.currentOffer?.toLocaleString('en-IN')}/month and enable immediate booking.
                      </p>
                    </div>
                  )}

                  {responseAction === 'cancel' && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs space-y-1">
                      <p className="font-bold">Decline Negotiation</p>
                      <p className="text-[11px] text-muted-foreground">
                        This will withdraw and cancel this private rent negotiation.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Message / Reason (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={counterMessage}
                      onChange={(e) => setCounterMessage(e.target.value)}
                      placeholder="Add any notes for the manager..."
                      className="w-full px-4 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {actionError && (
                    <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(null)}
                      className="w-1/3 py-3 rounded-2xl font-bold bg-muted hover:bg-muted/80 text-foreground transition-all text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={cn(
                        "w-2/3 py-3 rounded-2xl font-black active:scale-95 text-white transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50",
                        responseAction === 'accept'
                          ? "bg-emerald-500 hover:bg-emerald-600"
                          : responseAction === 'cancel'
                          ? "bg-rose-500 hover:bg-rose-600"
                          : "bg-foreground text-background hover:opacity-90"
                      )}
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {responseAction === 'accept'
                        ? 'Confirm & Lock Rate'
                        : responseAction === 'cancel'
                        ? 'Decline Deal'
                        : 'Send Counter'}
                    </button>
                  </div>
                </form>
              )}

              {/* Status footer if not currently tenant's turn */}
              {!canRespondToSelectedOffer && (
                <div className="pt-2 border-t border-border">
                  {isSelectedOfferExpired ? (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 space-y-2 text-xs text-center">
                      <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                        <XCircle className="w-4 h-4" />
                        <span>Deal Expired</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        {selectedOffer.expirationReason === 'booking_rejected_by_manager'
                          ? (() => {
                              const expHist = selectedOffer.offerHistory?.slice().reverse().find(h => h.action === 'expired');
                              const reasonMatch = expHist?.message?.replace(/^Deal expired:\s*/i, '');
                              return reasonMatch || 'Booking request was declined by the manager.';
                            })()
                          : selectedOffer.expirationReason === 'deal_validity_expired'
                          ? 'Deal validity window expired without booking.'
                          : 'This private deal has expired and cannot be booked.'}
                      </p>
                      <button
                        onClick={() => {
                          const propId = selectedOffer.property?._id || selectedOffer.property?.id;
                          setSelectedOffer(null);
                          navigate(`/properties/${propId}`, { state: { openNegotiation: true } });
                        }}
                        className="mt-2 w-full py-2.5 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Negotiate Again
                      </button>
                    </div>
                  ) : isSelectedOfferAccepted ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 space-y-2 text-xs text-center">
                      <p className="font-bold text-sm">🎉 Deal Locked at ₹{(selectedOffer.agreedRent || selectedOffer.currentOffer)?.toLocaleString('en-IN')}/month</p>
                      <p className="text-muted-foreground text-[11px]">
                        You can now complete the booking with your negotiated private rate.
                      </p>
                      <button
                        onClick={() => {
                          const propId = selectedOffer.property?._id || selectedOffer.property?.id;
                          setSelectedOffer(null);
                          navigate(`/properties/${propId}`);
                        }}
                        className="mt-2 w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
                      >
                        Proceed to Booking
                      </button>
                    </div>
                  ) : ['pending', 'countered'].includes(selectedOffer.status) ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs space-y-1 text-center">
                      <p className="font-bold">Awaiting Property Manager Response</p>
                      <p className="text-[11px] text-muted-foreground">
                        Your proposal is with the landlord/manager. You will be notified as soon as they counter or accept.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-center text-xs text-muted-foreground">
                      This negotiation is {selectedOffer.status}.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        );
      })()}
      </AnimatePresence>
    </div>
  );
}
