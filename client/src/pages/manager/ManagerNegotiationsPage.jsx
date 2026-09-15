import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { offerService } from '../../services/api';
import {
  Handshake, Search, Clock, CheckCircle2, XCircle, ArrowRight,
  TrendingDown, Shield, RefreshCw, MessageSquare, AlertTriangle,
  Building2, User, Calendar, SlidersHorizontal, Loader2, Sparkles, ChevronRight, X
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';

const isOfferExpired = (offer) => Boolean(
  offer && (
    offer.status === 'expired' ||
    (offer.expiresAt && new Date(offer.expiresAt) < new Date() && offer.status !== 'accepted')
  )
);

export default function ManagerNegotiationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    actionRequired: 0,
    accepted: 0,
    expiringSoon: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [responseAction, setResponseAction] = useState('counter'); // 'counter' | 'accept' | 'reject'
  const [counterRent, setCounterRent] = useState('');
  const [counterLeasePeriod, setCounterLeasePeriod] = useState('12 months');
  const [counterMoveInDate, setCounterMoveInDate] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await offerService.getManagerOffers();
      const list = res.data?.offers || res.data || [];
      const m = res.data?.metrics || {};
      setOffers(list);
      setMetrics({
        total: m.total ?? list.length,
        actionRequired: m.actionRequired ?? list.filter(o => (o.canManagerRespond || (['pending', 'countered'].includes(o.status) && o.currentTurn === 'manager')) && !isOfferExpired(o)).length,
        accepted: m.accepted ?? list.filter(o => o.status === 'accepted').length,
        expiringSoon: m.expiringSoon ?? list.filter(o => o.status !== 'accepted' && o.status !== 'rejected' && o.status !== 'cancelled' && new Date(o.expiresAt) - new Date() < 24 * 3600 * 1000 && new Date(o.expiresAt) > new Date()).length
      });
    } catch (err) {
      console.error('Failed to fetch manager negotiations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleOpenAction = (offer, defaultAction = 'counter') => {
    const canCounter = offer.canManagerCounter !== false && (offer.roundCount || 1) < (offer.maxRounds || 5);
    const initialAction = (!canCounter && defaultAction === 'counter') ? 'accept' : defaultAction;
    setSelectedOffer(offer);
    setResponseAction(initialAction);
    setCounterRent(String(offer.currentOffer || ''));
    setCounterLeasePeriod(offer.leasePeriod || '12 months');
    setCounterMoveInDate(offer.moveInDate ? new Date(offer.moveInDate).toISOString().split('T')[0] : '');
    setResponseMessage('');
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
        message: responseMessage
      };
      if (responseAction === 'counter') {
        const rentNum = Number(counterRent);
        if (!rentNum || rentNum <= 0) {
          setActionError('Please enter a valid counter rent amount.');
          setSubmitting(false);
          return;
        }
        payload.counterOffer = rentNum;
        payload.leasePeriod = counterLeasePeriod;
        payload.moveInDate = counterMoveInDate || undefined;
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

  // Filtered offers
  const filteredOffers = offers.filter(o => {
    if (!o) return false;
    const propName = o.property?.name || '';
    const tenantObj = o.tenant || o.fromUser || {};
    const tenantName = `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`;
    const dealNum = o.dealNumber || '';
    const matchesSearch = propName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dealNum.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'action_required') {
      return (o.canManagerRespond || (['pending', 'countered'].includes(o.status) && o.currentTurn === 'manager')) && !isOfferExpired(o);
    }
    if (statusFilter === 'accepted') return o.status === 'accepted';
    if (statusFilter === 'countered') return o.status === 'countered' && !isOfferExpired(o);
    if (statusFilter === 'closed') return ['rejected', 'expired', 'cancelled'].includes(o.status) || isOfferExpired(o);
    return true;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">
            <Handshake className="w-4 h-4" />
            <span>Confidential DealFlow</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Private Rent Negotiations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and negotiate 1-on-1 private rent offers from qualified tenants without modifying your public listed rent.
          </p>
        </div>

        <button
          onClick={fetchOffers}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2.5 rounded-2xl bg-muted/80 hover:bg-muted border border-border text-xs font-bold text-foreground flex items-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh Deals
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-card border border-border space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Deals</p>
          <p className="text-2xl font-black text-foreground">{metrics.total}</p>
          <p className="text-xs text-muted-foreground/80">All active & archived offers</p>
        </div>

        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Action Required</p>
          <p className="text-2xl font-black text-amber-400">{metrics.actionRequired}</p>
          <p className="text-xs text-amber-500/80">Offers awaiting your review</p>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Locked Deals</p>
          <p className="text-2xl font-black text-emerald-400">{metrics.accepted}</p>
          <p className="text-xs text-emerald-500/80">Agreed & ready for booking</p>
        </div>

        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Expiring Soon</p>
          <p className="text-2xl font-black text-rose-400">{metrics.expiringSoon}</p>
          <p className="text-xs text-rose-500/80">&lt; 24h validity remaining</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Deals' },
            { id: 'action_required', label: 'Action Required', badge: metrics.actionRequired },
            { id: 'countered', label: 'Countered' },
            { id: 'accepted', label: 'Locked Deals', badge: metrics.accepted },
            { id: 'closed', label: 'Closed / Expired' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                statusFilter === tab.id
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                  statusFilter === tab.id ? "bg-background text-foreground" : "bg-muted-foreground/20 text-foreground"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search deals, properties, tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-medium focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs font-bold">Loading negotiations...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="py-16 p-8 rounded-3xl bg-muted/20 border border-border border-dashed text-center space-y-3">
          <Handshake className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-black text-foreground">No negotiations found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try changing your search or filters to see more deals.'
              : 'When prospective tenants propose private rent counter-offers, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOffers.map((offer) => {
            if (!offer) return null;
            const prop = offer.property || {};
            const tenant = offer.tenant || offer.fromUser || {};
            const listedRent = prop.rentAmount || 0;
            const offerRent = offer.currentOffer || offer.offeredRent || 0;
            const diff = listedRent - offerRent;
            const discountPct = listedRent ? Math.round((diff / listedRent) * 100) : 0;
            const isExpired = isOfferExpired(offer);
            const isAwaitingManager = (offer.canManagerRespond || (['pending', 'countered'].includes(offer.status) && offer.currentTurn === 'manager')) && !isExpired;

            return (
              <motion.div
                key={offer._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-3xl bg-card border transition-all p-5 flex flex-col justify-between space-y-5",
                  isAwaitingManager ? "border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20" : "border-border"
                )}
              >
                {/* Card Top: Deal Number + Status Badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                      {offer.dealNumber || 'DEAL'}
                    </span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      offer.status === 'accepted'
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : isAwaitingManager
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                        : offer.status === 'countered'
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : isExpired
                        ? "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        : offer.status === 'rejected'
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}>
                      {offer.status === 'accepted'
                        ? 'Locked Deal'
                        : isAwaitingManager
                        ? 'Review Needed'
                        : isExpired
                        ? 'Expired'
                        : offer.status === 'countered'
                        ? 'Awaiting Tenant'
                        : offer.status}
                    </span>
                  </div>

                  {/* Property Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                      <img
                        src={resolveMediaUrl(prop.images?.[0]?.url || prop.images?.[0] || DEFAULT_PLACEHOLDER_SVG)}
                        alt={prop.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = DEFAULT_PLACEHOLDER_SVG; }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-foreground truncate">{prop.name || 'Property'}</h3>
                      <p className="text-[11px] text-muted-foreground truncate">{prop.city}, {prop.address}</p>
                    </div>
                  </div>

                  {/* Pricing Comparison Banner */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Listed Public Rent</span>
                      <span className="text-xs font-semibold text-muted-foreground line-through font-mono">
                        ₹{listedRent.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                        {offer.status === 'accepted' ? 'Locked Rent' : 'Current Offer'}
                      </span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-lg font-black text-foreground font-mono">
                          ₹{(offer.status === 'accepted' ? (offer.agreedRent || offerRent) : offerRent).toLocaleString('en-IN')}
                        </span>
                        {discountPct > 0 && (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            -{discountPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tenant Details & Rounds */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-bold text-foreground truncate">{tenant.firstName} {tenant.lastName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Round {offer.roundCount || 1} / {offer.maxRounds || 5}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{offer.leasePeriod || '12 months'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>
                          {isExpired
                            ? 'Offer expired'
                            : `Expires ${new Date(offer.expiresAt).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>

                    {offer.message && (
                      <p className="text-[11px] text-muted-foreground bg-muted/60 p-2.5 rounded-xl italic line-clamp-2 border border-border/50">
                        "{offer.message}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                  {isAwaitingManager ? (
                    <>
                      <button
                        onClick={() => handleOpenAction(offer, (offer.canManagerCounter !== false && (offer.roundCount || 1) < (offer.maxRounds || 5)) ? 'counter' : 'accept')}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-foreground text-background hover:opacity-90 active:scale-95 transition-all text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        Respond
                      </button>
                      <button
                        onClick={() => handleOpenAction(offer, 'accept')}
                        className="py-2.5 px-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 active:scale-95 transition-all text-xs font-black uppercase tracking-wider"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleOpenAction(offer, 'reject')}
                        className="py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 active:scale-95 transition-all text-xs font-black"
                        title="Reject Offer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenAction(offer, 'history')}
                      className="w-full py-2.5 rounded-2xl bg-muted hover:bg-muted/80 text-foreground transition-all text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <span>View Negotiation Timeline</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Response / Negotiation Modal */}
      <AnimatePresence>
        {selectedOffer && (() => {
          const isExpired = isOfferExpired(selectedOffer);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card w-full max-w-xl rounded-3xl border border-border p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative"
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
                    Deal #{selectedOffer.dealNumber} — {selectedOffer.property?.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tenant: {selectedOffer.tenant?.firstName || selectedOffer.fromUser?.firstName} {selectedOffer.tenant?.lastName || selectedOffer.fromUser?.lastName} • Round {selectedOffer.roundCount || 1} of {selectedOffer.maxRounds || 5}
                    {selectedOffer.roundsRemaining !== undefined && (
                      <span className="ml-1 text-emerald-400 font-semibold">
                        ({selectedOffer.roundsRemaining} {selectedOffer.roundsRemaining === 1 ? 'round' : 'rounds'} left)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Rounds Timeline History */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Negotiation History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-2xl bg-muted/40 border border-border/70 divide-y divide-border/40">
                  {(selectedOffer.offerHistory || []).map((round, idx) => {
                    const senderRole = round.offeredBy || round.senderRole;
                    const isTenant = senderRole === 'tenant';
                    const rentAmount = round.amount ?? round.proposedAmount;
                    const noteText = round.note || round.message;
                    const tenantObj = selectedOffer.tenant || selectedOffer.fromUser;
                    const tenantName = tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : 'Tenant';
                    const dateStr = formatHistoryDate(round.offeredAt || round.timestamp);

                    return (
                      <div key={idx} className="pt-2 first:pt-0 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold capitalize text-foreground flex items-center gap-1.5">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isTenant ? "bg-emerald-400" : "bg-blue-400"
                            )} />
                            {isTenant ? `${tenantName} (Tenant)` : 'You (Manager)'}
                            <span className="text-[10px] text-muted-foreground font-normal">
                              (Round {round.roundNumber || idx + 1})
                            </span>
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            ₹{rentAmount ? rentAmount.toLocaleString('en-IN') : '—'}/mo
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="line-clamp-1 italic">{noteText || 'No message provided'}</span>
                          <span className="font-mono text-[10px] shrink-0 ml-2">{dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Tabs if manager's turn */}
              {(selectedOffer.canManagerRespond || (['pending', 'countered'].includes(selectedOffer.status) && selectedOffer.currentTurn === 'manager')) && !isExpired ? (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className={cn(
                    "grid gap-2 p-1 rounded-2xl bg-muted/60 border border-border",
                    (selectedOffer.canManagerCounter !== false && (selectedOffer.roundCount || 1) < (selectedOffer.maxRounds || 5)) ? "grid-cols-3" : "grid-cols-2"
                  )}>
                    {(selectedOffer.canManagerCounter !== false && (selectedOffer.roundCount || 1) < (selectedOffer.maxRounds || 5)) && (
                      <button
                        type="button"
                        onClick={() => setResponseAction('counter')}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black transition-all",
                          responseAction === 'counter' ? "bg-foreground text-background shadow" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Counter Offer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setResponseAction('accept')}
                      className={cn(
                        "py-2 rounded-xl text-xs font-black transition-all",
                        responseAction === 'accept' ? "bg-emerald-500 text-white shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Accept Deal
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponseAction('reject')}
                      className={cn(
                        "py-2 rounded-xl text-xs font-black transition-all",
                        responseAction === 'reject' ? "bg-rose-500 text-white shadow" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Reject Offer
                    </button>
                  </div>

                  <form onSubmit={handleExecuteResponse} className="space-y-4">
                    {responseAction === 'counter' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Your Counter Rent (₹ / Month) *
                          </label>
                          <input
                            type="number"
                            required
                            value={counterRent}
                            onChange={(e) => setCounterRent(e.target.value)}
                            placeholder="e.g. 24000"
                            className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground font-black text-sm focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Lease Period
                            </label>
                            <select
                              value={counterLeasePeriod}
                              onChange={(e) => setCounterLeasePeriod(e.target.value)}
                              className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              <option value="6 months">6 Months</option>
                              <option value="12 months">12 Months</option>
                              <option value="24 months">24 Months</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Move-In Date
                            </label>
                            <input
                              type="date"
                              value={counterMoveInDate}
                              onChange={(e) => setCounterMoveInDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border flex items-center justify-between">
                          <span>Upcoming Round:</span>
                          <span className="font-bold text-foreground">
                            Round {(selectedOffer.roundCount || 1) + 1} of {selectedOffer.maxRounds || 5}
                          </span>
                        </div>
                      </>
                    )}

                    {responseAction === 'accept' && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Ready to Lock Deal at ₹{selectedOffer.currentOffer?.toLocaleString('en-IN')}/month</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Accepting this offer grants the tenant a private, reserved window to book and pay deposit at this rate. The public listing price stays at ₹{selectedOffer.property?.rentAmount?.toLocaleString('en-IN')}.
                        </p>
                      </div>
                    )}

                    {responseAction === 'reject' && (
                      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 font-bold">
                          <XCircle className="w-4 h-4" />
                          <span>Reject & Close Deal</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          This will permanently close the current negotiation round for this tenant.
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Note / Explanation to Tenant (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Add terms, utility inclusions, or reasoning..."
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
                            : responseAction === 'reject'
                            ? "bg-rose-500 hover:bg-rose-600"
                            : "bg-foreground text-background hover:opacity-90"
                        )}
                      >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {responseAction === 'accept'
                          ? 'Confirm & Lock Deal'
                          : responseAction === 'reject'
                          ? 'Confirm Rejection'
                          : 'Send Counter Offer'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="pt-2 border-t border-border">
                  {selectedOffer.status === 'accepted' ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs text-center space-y-1">
                      <p className="font-bold text-sm">🎉 Deal Accepted & Locked at ₹{(selectedOffer.agreedRent || selectedOffer.currentOffer)?.toLocaleString('en-IN')}/mo</p>
                      <p className="text-[11px] text-muted-foreground">Waiting for tenant to finalize their booking at this private rate.</p>
                    </div>
                  ) : isExpired ? (
                    <div className="p-4 rounded-2xl bg-gray-500/10 border border-gray-500/20 text-gray-400 text-xs text-center space-y-1">
                      <p className="font-bold">Deal Expired</p>
                      <p className="text-[11px] text-muted-foreground">This negotiation offer has passed its expiration deadline and can no longer be modified.</p>
                    </div>
                  ) : ['pending', 'countered'].includes(selectedOffer.status) ? (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs text-center space-y-1">
                      <p className="font-bold">Awaiting Tenant Response</p>
                      <p className="text-[11px] text-muted-foreground">You have countered. We will notify you as soon as the tenant counters or accepts.</p>
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
