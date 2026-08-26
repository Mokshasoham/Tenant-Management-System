import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../services/api';
import {
  Plus, Search, Edit2, Trash2, X, Home, Building2, MapPin,
  IndianRupee, Bed, Bath, Square, CheckCircle2, AlertTriangle,
  Wrench, Users, Tag, ArrowRight, MoreVertical, Eye, Sparkles,
  SlidersHorizontal, RefreshCw, ChevronDown, Video, Compass,
  Layers, TrendingUp, ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getDisplayStatus, resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../utils/propertyHelper';
import { useTheme } from '../context/ThemeContext';
import PropertyModal from '../components/PropertyModal';
import PropertyTypeSelectorModal from '../components/property/PropertyTypeSelectorModal';
import ManagerPropertyLimitModal from '../components/subscription/ManagerPropertyLimitModal';
import { subscriptionService } from '../services/api';


const TYPE_COLORS = {
  apartment: '#10b981', // Emerald
  house: '#059669',     // Deep Emerald
  commercial: '#f59e0b',// Amber
  land: '#8b5cf6',      // Violet
  villa: '#14b8a6',     // Teal
  studio: '#6366f1',    // Indigo
};

const AMBIENT_PALETTES = [
  { r: 16, g: 185, b: 129 },   // Fresh Emerald / Forest Green
  { r: 20, g: 184, b: 166 },   // Crisp Mint / Teal
  { r: 99, g: 102, b: 241 },   // Sapphire Indigo
  { r: 245, g: 158, b: 11 },   // Warm Sunset Gold / Amber
  { r: 139, g: 92, b: 246 },   // Amethyst Violet
  { r: 59, g: 130, b: 246 },   // Ocean Azure / Sky Blue
  { r: 249, g: 115, b: 22 },   // Terracotta / Warm Orange
  { r: 236, g: 72, b: 153 },   // Coral Rose / Pink
];

function getMediaAmbientRgb(cardIndex, imgIndex) {
  const paletteIndex = ((cardIndex || 0) * 3 + (imgIndex || 0)) % AMBIENT_PALETTES.length;
  return AMBIENT_PALETTES[paletteIndex];
}

const VIEW_PROPERTY_LETTERS = ['V', 'i', 'e', 'w', '\u00A0', 'P', 'r', 'o', 'p', 'e', 'r', 't', 'y'];

// ── Property Card Component ──
function ManagerPropertyCard({ p, index, onEdit, onDelete, onView, theme }) {
  const color = TYPE_COLORS[p.type] || '#10b981';
  const displayStatus = getDisplayStatus(p);

  // Extract real images & videos
  const allMedia = p.media || [];
  const rawImages = p.images?.length
    ? p.images
    : allMedia.filter(m => m.mediaType === 'image' || !m.mediaType).map(m => m.url);
  const imageUrls = rawImages.map(resolveMediaUrl).filter(Boolean);

  const rawVideos = p.videos?.length
    ? p.videos
    : allMedia.filter(m => m.mediaType === 'video').map(m => m.url);
  const videoUrls = rawVideos.map(resolveMediaUrl).filter(Boolean);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const intervalRef = useRef(null);

  const ambientRgb = getMediaAmbientRgb(index, currentImgIndex);

  // Slideshow interval active when hovered
  useEffect(() => {
    if (isHovered && imageUrls.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImgIndex(prev => (prev + 1) % imageUrls.length);
      }, 2800);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentImgIndex(0);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHovered, imageUrls.length]);

  // Click outside to close three-dot menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35 }}
      onClick={() => onView(p)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMenuOpen(false);
      }}
      style={{
        boxShadow: isHovered
          ? theme === 'light'
            ? `0 12px 28px -6px rgba(0, 0, 0, 0.07), 0 20px 48px -10px rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, 0.14)`
            : `0 14px 32px -6px rgba(0, 0, 0, 0.50), 0 20px 52px -10px rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, 0.18)`
          : theme === 'light'
            ? '0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)'
            : '0 4px 20px -2px rgba(0, 0, 0, 0.30), 0 2px 6px -1px rgba(0, 0, 0, 0.15)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0px)',
        borderColor: isHovered
          ? theme === 'light' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.35)'
          : theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
        transition: 'transform 280ms cubic-bezier(.2,.8,.2,1), box-shadow 500ms ease, border-color 300ms ease'
      }}
      className={cn(
        "relative rounded-[2.25rem] cursor-pointer bg-card border select-none group flex flex-col justify-between overflow-hidden"
      )}
    >
      {/* ── Dynamic Ambient Media Shadow Layer radiating OUTSIDE behind the card ── */}
      <div
        className="absolute -inset-2.5 sm:-inset-3.5 rounded-[2.75rem] pointer-events-none -z-10"
        style={{
          background: isHovered
            ? `radial-gradient(ellipse at 50% 30%, rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${theme === 'light' ? 0.20 : 0.28}) 0%, rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${theme === 'light' ? 0.06 : 0.10}) 50%, transparent 80%)`
            : 'transparent',
          filter: 'blur(28px)',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1.04) translateY(-2px)' : 'scale(0.95) translateY(0)',
          transition: 'opacity 700ms ease, background 900ms ease, transform 300ms ease'
        }}
      />

      {/* ── Top Media Area ── */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950 transition-colors rounded-t-[2.25rem]">
        {imageUrls.length > 0 ? (
          <div className="w-full h-full relative overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.img
                key={`prop-img-${currentImgIndex}-${imageUrls[currentImgIndex]}`}
                src={imageUrls[currentImgIndex]}
                alt={p.name}
                loading="lazy"
                initial={{ opacity: 0.85, scale: 1.00 }}
                animate={{ opacity: 1, scale: isHovered ? 1.03 : 1.00 }}
                exit={{ opacity: 0.85, scale: 1.00 }}
                transition={{
                  opacity: { duration: 0.6, ease: 'easeInOut' },
                  scale: { duration: 0.7, ease: 'easeOut' }
                }}
                className="w-full h-full object-cover select-none pointer-events-none"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_PLACEHOLDER_SVG;
                }}
              />
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-2 p-6">
            <Building2 className="w-10 h-10 opacity-30 text-slate-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Media Not Available</span>
          </div>
        )}

        {/* Ambient Dark Gradient Overlays for readable text and badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30 pointer-events-none" />

        {/* Media Progress Dot Indicators */}
        {imageUrls.length > 1 && (
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10 pointer-events-none">
            {imageUrls.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-full transition-all duration-500",
                  i === currentImgIndex
                    ? "w-3.5 h-1.5 bg-white shadow-sm"
                    : "w-1.5 h-1.5 bg-white/40"
                )}
              />
            ))}
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-3.5 left-3.5 flex flex-col items-start gap-1.5 z-20 pointer-events-none">
          <div className="flex gap-1.5 flex-wrap">
            <span
              className="px-2.5 py-0.5 text-white text-[9px] font-black rounded-full shadow-lg backdrop-blur-md uppercase tracking-wider border border-white/20"
              style={{ background: color }}
            >
              {p.type}
            </span>
            {displayStatus && (
              <span className={cn(
                "px-2.5 py-0.5 text-[9px] font-black rounded-full shadow-lg backdrop-blur-md border uppercase tracking-wider",
                displayStatus === 'Available' ? "bg-emerald-500/90 border-emerald-400/30 text-white" :
                displayStatus.startsWith('Available from') ? "bg-indigo-500/90 border-indigo-400/30 text-white" :
                displayStatus === 'Under Maintenance' ? "bg-amber-500/90 border-amber-400/30 text-white" :
                "bg-amber-600/90 border-amber-500/30 text-white"
              )}>
                {displayStatus}
              </span>
            )}
            {videoUrls.length > 0 && (
              <span className="px-2 py-0.5 bg-black/60 text-emerald-400 text-[8px] font-black rounded-full shadow-lg backdrop-blur-md border border-white/15">
                ▶ {videoUrls.length === 1 ? 'Video' : `${videoUrls.length} Videos`}
              </span>
            )}
            {p.virtualTourUrl && (
              <span className="px-2 py-0.5 bg-cyan-500/90 text-white text-[8px] font-black rounded-full shadow-lg backdrop-blur-md border border-white/20">
                360° Tour
              </span>
            )}
          </div>
        </div>

        {/* Top-right Three-Dot Menu (•••) */}
        <div ref={menuRef} className="absolute top-3.5 right-3.5 z-30">
          <button
            type="button"
            aria-label="Property options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(prev => !prev);
            }}
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-44 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl p-1.5 space-y-1 z-50 overflow-hidden text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onView(p);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-muted transition-colors text-left"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  <span>View Details</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit(p);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-muted transition-colors text-left"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Edit Property</span>
                </button>
                <div className="h-px bg-border/60 my-1" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(p._id, e);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-500/10 text-rose-500 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Property</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          <div>
            <h3
              className="text-xl font-bold text-foreground truncate group-hover:text-emerald-500 transition-colors duration-200"
              title={p.name}
            >
              {p.name}
            </h3>
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span className="truncate">{p.address}{p.city ? `, ${p.city}` : ''}</span>
            </p>
          </div>

          {/* Stat Chips Row */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/50 text-[11px] font-bold text-muted-foreground">
              <Bed className="w-3.5 h-3.5 text-emerald-500" />
              <span>{p.bedrooms || 0} Beds</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/50 text-[11px] font-bold text-muted-foreground">
              <Bath className="w-3.5 h-3.5 text-teal-500" />
              <span>{p.bathrooms || 0} Baths</span>
            </div>
            {p.squareFeet ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/50 text-[11px] font-bold text-muted-foreground">
                <Square className="w-3.5 h-3.5 text-amber-500" />
                <span>{p.squareFeet} sqft</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Bottom Section: Rent, Manager, & Expanding View CTA ── */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
          {/* Rent & Manager */}
          <div className="min-w-0 pr-1">
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none mb-0.5">
              Monthly Rent
            </p>
            <p className="text-xl font-black text-foreground tracking-tight truncate">
              ₹{(p.rentAmount || 0).toLocaleString('en-IN')}
              <span className="text-[10px] font-bold text-muted-foreground/50 ml-0.5">/mo</span>
            </p>
          </div>

          {/* Right-anchored Expanding View Property CTA */}
          <div className="flex justify-end flex-shrink-0">
            <button
              type="button"
              aria-label={`View property ${p.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onView(p);
              }}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              onFocus={() => setBtnHovered(true)}
              onBlur={() => setBtnHovered(false)}
              className="relative h-9 rounded-full flex items-center justify-end overflow-hidden cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none"
              style={{
                width: btnHovered ? '138px' : '36px',
                backgroundColor: btnHovered
                  ? theme === 'light' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.18)'
                  : theme === 'light' ? 'rgba(0, 0, 0, 0.045)' : 'rgba(255, 255, 255, 0.06)',
                borderColor: btnHovered
                  ? theme === 'light' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.40)'
                  : theme === 'light' ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.10)',
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: btnHovered
                  ? theme === 'light' ? '0 4px 14px rgba(16, 185, 129, 0.15)' : '0 6px 18px rgba(16, 185, 129, 0.25)'
                  : 'none',
                transform: btnHovered ? 'translateY(-1px)' : 'translateY(0px)',
                transition: 'width 380ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease, transform 300ms ease'
              }}
            >
              {/* Walking-Queue Revealed Letters */}
              <div
                className="overflow-hidden flex items-center whitespace-nowrap pointer-events-none"
                style={{
                  width: btnHovered ? '94px' : '0px',
                  paddingLeft: btnHovered ? '12px' : '0px',
                  opacity: btnHovered ? 1 : 0,
                  transition: 'width 380ms cubic-bezier(0.22, 1, 0.36, 1), padding-left 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease'
                }}
              >
                <span
                  className="text-[11px] font-black tracking-tight flex items-center select-none"
                  style={{
                    color: theme === 'light' ? '#065f46' : '#34d399'
                  }}
                >
                  {VIEW_PROPERTY_LETTERS.map((char, i) => (
                    <span
                      key={i}
                      className="inline-block select-none"
                      style={{
                        transform: btnHovered ? 'translateX(0px)' : 'translateX(-8px)',
                        opacity: btnHovered ? 1 : 0,
                        transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
                        transitionDelay: btnHovered ? `${i * 14}ms` : `${(VIEW_PROPERTY_LETTERS.length - 1 - i) * 6}ms`
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </div>

              {/* Circular Arrow Anchor */}
              <div className="w-[34px] h-[34px] flex items-center justify-center flex-shrink-0">
                <ArrowRight
                  className="w-3.5 h-3.5 transition-transform duration-300 pointer-events-none"
                  style={{
                    transform: btnHovered ? 'translateX(1px)' : 'translateX(0px)',
                    color: theme === 'light' ? '#065f46' : '#34d399'
                  }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Properties Page ──
export default function PropertiesPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [subData, setSubData] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedType, setSelectedType] = useState('apartment');
  const [showTypeSelectorModal, setShowTypeSelectorModal] = useState(false);
  const LIMIT = 12;

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await subscriptionService.getMySubscription();
      setSubData(res?.data?.data || res?.data);
    } catch (err) {
      console.warn('Subscription fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleAddPropertyClick = () => {
    if (subData?.usage?.isAtLimit || subData?.usage?.isExceeded) {
      setShowLimitModal(true);
      return;
    }
    setSelected(null);
    setShowTypeSelectorModal(true);
  };

  const handleSelectType = (typeKey) => {
    setSelectedType(typeKey);
    setShowTypeSelectorModal(false);
    setSelected(null);
    setModal('add');
  };


  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await propertyService.getAllProperties({
        page,
        limit: LIMIT,
        search,
        type: typeFilter,
        status: statusFilter,
        sort: sortBy
      });
      const data = res.data?.data || res.data || [];
      setProperties(data);
      setTotal(res.data?.pagination?.total || res.pagination?.total || (Array.isArray(data) ? data.length : 0));
    } catch (e) {
      console.error('[PropertiesPage] Failed to fetch properties:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, sortBy]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;
    try {
      await propertyService.deleteProperty(id);
      fetchProperties();
    } catch (err) {
      console.error('[PropertiesPage] Delete error:', err);
    }
  };

  const handleEdit = (property) => {
    setSelected(property);
    setModal('edit');
  };

  const handleView = (property) => {
    navigate(`/manager/properties/${property._id}`);
  };

  // Portfolio Statistics Calculations
  const totalCount = total || properties.length;
  const availableCount = properties.filter(p => {
    const ds = getDisplayStatus(p);
    return ds === 'Available' || (!ds && p.status === 'available');
  }).length;

  const upcomingOrOccupiedCount = properties.filter(p => {
    const ds = getDisplayStatus(p);
    return ds?.startsWith('Available from') || ['occupied', 'rented'].includes(p.status) || ds === 'Sold Out';
  }).length;

  const totalPortfolioValue = properties.reduce((sum, p) => sum + (Number(p.rentAmount) || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600 mt-1" />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">
                Property Portfolio
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                {totalCount} Units
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              Properties
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Manage your real-estate portfolio, listings and tenant availability
            </p>
          </div>
        </div>

        {/* Add Property CTA */}
        <button
          onClick={handleAddPropertyClick}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm transition-all shadow-xl shadow-emerald-500/20 active:scale-95 cursor-pointer self-start sm:self-auto group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span>Add Property</span>
        </button>
      </motion.div>

      {/* ── Portfolio Summary Metrics Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'Total Properties',
            value: String(totalCount).padStart(2, '0'),
            desc: 'Portfolio units',
            icon: Building2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Available Now',
            value: String(availableCount).padStart(2, '0'),
            desc: 'Ready for lease',
            icon: CheckCircle2,
            color: 'text-teal-500',
            bg: 'bg-teal-500/10 border-teal-500/20',
          },
          {
            label: 'Upcoming / Leased',
            value: String(upcomingOrOccupiedCount).padStart(2, '0'),
            desc: 'Active tenancies',
            icon: Users,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10 border-indigo-500/20',
          },
          {
            label: 'Monthly Portfolio Value',
            value: `₹${totalPortfolioValue.toLocaleString('en-IN')}`,
            desc: 'Total rent roll',
            icon: IndianRupee,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {item.label}
                </span>
                <div className={cn("p-2 rounded-xl border flex items-center justify-center", item.bg, item.color)}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {item.value}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground/70 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Unified Search & Filter Control Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-3 sm:p-4 rounded-3xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
      >
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, address, or city..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-semibold placeholder-muted-foreground/40 focus:outline-none focus:border-emerald-500/50 focus:bg-muted transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by property type"
            className="px-4 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer pr-8 bg-no-repeat bg-[right_0.75rem_center]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
            }}
          >
            <option value="" className="bg-card">All Types</option>
            <option value="apartment" className="bg-card">Apartment</option>
            <option value="house" className="bg-card">House</option>
            <option value="commercial" className="bg-card">Commercial</option>
            <option value="villa" className="bg-card">Villa</option>
            <option value="studio" className="bg-card">Studio</option>
            <option value="land" className="bg-card">Land</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by property status"
            className="px-4 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer pr-8 bg-no-repeat bg-[right_0.75rem_center]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
            }}
          >
            <option value="" className="bg-card">All Statuses</option>
            <option value="available" className="bg-card">Available</option>
            <option value="occupied" className="bg-card">Occupied</option>
            <option value="maintenance" className="bg-card">Maintenance</option>
            <option value="rented" className="bg-card">Rented</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort properties"
            className="px-4 py-2.5 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer pr-8 bg-no-repeat bg-[right_0.75rem_center]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
            }}
          >
            <option value="newest" className="bg-card">Newest First</option>
            <option value="oldest" className="bg-card">Oldest First</option>
            <option value="price_asc" className="bg-card">Rent: Low → High</option>
            <option value="price_desc" className="bg-card">Rent: High → Low</option>
            <option value="name_asc" className="bg-card">Name: A → Z</option>
          </select>
        </div>

        {/* Results Count Badge */}
        <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
          <span className="text-[11px] font-bold text-muted-foreground/60">
            Showing <span className="text-foreground font-black">{properties.length}</span> of <span className="text-foreground font-black">{totalCount}</span> properties
          </span>
          {(search || typeFilter || statusFilter || sortBy !== 'newest') && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setStatusFilter('');
                setSortBy('newest');
                setPage(1);
              }}
              className="text-[10px] font-black uppercase tracking-wider text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-[2.25rem] overflow-hidden bg-card border border-border animate-pulse space-y-4"
            >
              <div className="aspect-video bg-muted/60" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-muted rounded-xl" />
                <div className="h-3.5 w-1/2 bg-muted/60 rounded-lg" />
                <div className="flex gap-2 pt-1">
                  <div className="h-6 w-16 bg-muted/50 rounded-xl" />
                  <div className="h-6 w-16 bg-muted/50 rounded-xl" />
                </div>
                <div className="h-8 w-full bg-muted/40 rounded-xl mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[2.5rem] border-2 border-dashed border-border bg-card/60 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm"
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">No properties found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              {search || typeFilter || statusFilter
                ? "Try adjusting your search terms or clearing your filters."
                : "Start building your portfolio by adding your first property."}
            </p>
          </div>
          <button
            onClick={() => {
              if (search || typeFilter || statusFilter) {
                setSearch('');
                setTypeFilter('');
                setStatusFilter('');
                setPage(1);
              } else {
                handleAddPropertyClick();
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
          >
            {search || typeFilter || statusFilter ? 'Clear Filters' : <><Plus className="w-4 h-4" /> Add Property</>}
          </button>
        </motion.div>
      ) : (
        /* Real Properties Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p, i) => (
            <ManagerPropertyCard
              key={p._id}
              p={p}
              index={i}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              theme={theme}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {total > LIMIT && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{Math.min((page - 1) * LIMIT + 1, total)}</span>–<span className="font-bold text-foreground">{Math.min(page * LIMIT, total)}</span> of <span className="font-bold text-foreground">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-25 border border-border transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="px-3 py-1 text-xs font-black text-foreground">
              Page {page} of {Math.ceil(total / LIMIT)}
            </span>
            <button
              disabled={page * LIMIT >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-25 border border-border transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Property Type Selection Modal ── */}
      <AnimatePresence>
        {showTypeSelectorModal && (
          <PropertyTypeSelectorModal
            isOpen={showTypeSelectorModal}
            onClose={() => setShowTypeSelectorModal(false)}
            onSelectType={handleSelectType}
          />
        )}
      </AnimatePresence>

      {/* ── Step 2: Add / Edit Property Modal ── */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <PropertyModal
            property={modal === 'edit' ? selected : null}
            initialType={modal === 'edit' ? selected?.type : selectedType}
            onChangeType={() => {
              setModal(null);
              setShowTypeSelectorModal(true);
            }}
            onClose={() => {
              setModal(null);
              setSelected(null);
            }}
            onSave={() => {
              setModal(null);
              setSelected(null);
              fetchProperties();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Manager Property Limit Modal ── */}
      <ManagerPropertyLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        currentCount={subData?.usage?.currentCount || totalCount}
        maxLimit={subData?.usage?.maxLimit || 3}
        planName={subData?.subscription?.planName || 'Manager Starter'}
      />
    </div>
  );
}

