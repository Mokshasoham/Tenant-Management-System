import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, ArrowRight, ShieldCheck, Compass, Search, MapPin,
    Sparkles, CheckCircle2, Zap, FileText, CreditCard, Wrench,
    MessageSquare, Bell, ChevronRight, Star, SlidersHorizontal,
    Layers, Lock, Scale, Heart, Check, Users, RefreshCw, AlertCircle,
    ArrowUpRight, Clock, Award
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import PageTransition from '../components/PageTransition';
import { propertyService } from '../services/api';
import useAuthStore from '../context/authStore';
import { GridCard, SkeletonCard } from '../components/property/TenantBrowseProperties';
import handleViewPropertyNavigation from '../utils/propertyNavigationHelper';
import { cn } from '../utils/cn';

const HERO_BG_IMAGE = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop";
const STORY_BG_IMAGE = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop";
const CTA_BG_IMAGE = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop";

export default function LandingPage() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    // Search state
    const [searchLocation, setSearchLocation] = useState('');
    const [searchType, setSearchType] = useState('');
    const [searchBudget, setSearchBudget] = useState('');
    const [searchBedrooms, setSearchBedrooms] = useState('');

    // Featured properties state
    const [featuredProperties, setFeaturedProperties] = useState([]);
    const [loadingProps, setLoadingProps] = useState(true);
    const [propsError, setPropsError] = useState(null);
    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);

    // Fetch real properties from database
    const fetchFeatured = async () => {
        setLoadingProps(true);
        setPropsError(null);
        try {
            const res = await propertyService.getAllProperties({ limit: 3, sortBy: 'createdAt' });
            const list = res?.data?.data || res?.data || res || [];
            const validList = Array.isArray(list) ? list.filter(Boolean) : [];
            setFeaturedProperties(validList.slice(0, 3));

            if (user) {
                const saved = new Set();
                validList.forEach(p => {
                    if (p.savedBy?.includes(user._id || user.id)) saved.add(String(p._id || p.id));
                });
                setSavedIds(saved);
            }
        } catch (err) {
            console.error('Error fetching featured properties:', err);
            setPropsError('Unable to load featured properties at this moment.');
        } finally {
            setLoadingProps(false);
        }
    };

    useEffect(() => {
        fetchFeatured();
    }, [user]);

    const handleSave = (propId) => {
        const idStr = String(propId);
        setSavedIds(prev => {
            const next = new Set(prev);
            next.has(idStr) ? next.delete(idStr) : next.add(idStr);
            return next;
        });
        propertyService.saveProperty(propId).catch(() => {});
    };

    const toggleCompare = (prop) => {
        const pId = String(prop._id || prop.id);
        setCompareList(prev => {
            if (prev.some(c => String(c._id || c.id) === pId)) {
                return prev.filter(c => String(c._id || c.id) !== pId);
            }
            if (prev.length >= 3) return prev;
            return [...prev, prop];
        });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchLocation) params.set('search', searchLocation);
        if (searchType) params.set('type', searchType);
        if (searchBedrooms) params.set('bedrooms', searchBedrooms);
        if (searchBudget === 'under-15k') params.set('maxPrice', '15000');
        if (searchBudget === '15k-30k') { params.set('minPrice', '15000'); params.set('maxPrice', '30000'); }
        if (searchBudget === '30k-plus') params.set('minPrice', '30000');

        const queryStr = params.toString();
        navigate(queryStr ? `/browse?${queryStr}` : '/browse');
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#060B13] text-foreground relative overflow-x-hidden selection:bg-emerald-500 selection:text-white font-sans">
                {/* Navbar */}
                <PublicNavbar />

                {/* ══════════════════════════════════════════════════════
                    1. HERO SECTION
                ══════════════════════════════════════════════════════ */}
                <section id="home" className="relative min-h-[92vh] flex items-center pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                    {/* Cinematic Architectural Background */}
                    <div className="absolute inset-0 z-0 select-none pointer-events-none">
                        <img
                            src={HERO_BG_IMAGE}
                            alt="Luxury Architecture"
                            className="w-full h-full object-cover scale-105 filter brightness-75"
                            loading="eager"
                        />
                        {/* Deep Luxury Dark & Emerald Ambient Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#060B13] via-[#060B13]/85 to-[#060B13]/60" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#060B13] via-transparent to-black/60" />
                        <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
                        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
                    </div>

                    <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                        {/* Left: Editorial Hero Typography */}
                        <div className="lg:col-span-7 space-y-8 text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black text-[11px] uppercase tracking-[0.25em] mb-6 backdrop-blur-md shadow-lg shadow-emerald-500/10">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Next-Generation Rental Management</span>
                                </div>

                                <h1 className="text-5xl sm:text-7xl xl:text-8xl font-black text-white leading-[0.95] tracking-tight mb-6 drop-shadow-2xl">
                                    SMARTER <br />
                                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent italic">
                                        RENTING
                                    </span> <br />
                                    STARTS HERE.
                                </h1>

                                <p className="text-base sm:text-xl text-slate-300 max-w-xl font-medium leading-relaxed drop-shadow-md">
                                    Discover properties, manage leases, pay rent, and stay connected — all from one intelligent rental platform.
                                </p>
                            </motion.div>

                            {/* Action Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                className="flex flex-wrap items-center gap-4 pt-2"
                            >
                                <button
                                    type="button"
                                    onClick={() => navigate('/browse')}
                                    className="px-8 py-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>EXPLORE PROPERTIES</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/register')}
                                    className="px-8 py-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-xl shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                                >
                                    GET STARTED
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="px-6 py-4 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer"
                                >
                                    SIGN IN
                                </button>
                            </motion.div>

                            {/* Trust / Value Indicators */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                                className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 sm:gap-8 text-xs font-bold text-slate-400"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span>Verified Properties</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                                    <span>Digital Lease Management</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                    <span>Secure Rent Payments</span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right: Floating Glass UI Product Demonstrations (Generic Demo Only) */}
                        <div className="lg:col-span-5 relative flex justify-center items-center py-6">
                            <div className="w-full max-w-md space-y-4 relative">
                                {/* Ambient Background Glow */}
                                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 rounded-[3rem] blur-2xl -z-10" />

                                {/* Demo Card 1: Active Lease */}
                                <motion.div
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.7, delay: 0.2 }}
                                    className="p-5 rounded-[2rem] bg-[#0c172c]/85 backdrop-blur-2xl border border-emerald-500/30 shadow-[0_20px_40px_rgba(0,0,0,0.6)] space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            Active Lease
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                                            ● Active
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between pt-1">
                                        <div>
                                            <h4 className="text-base font-black text-white">Modern City Apartment</h4>
                                            <p className="text-xs text-slate-400 font-medium">Urban Luxury Residence</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-white">₹18,500</span>
                                            <span className="text-[10px] text-slate-400 font-bold block">/ month</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Demo Card 2: Next Rent Payment */}
                                <motion.div
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.7, delay: 0.35 }}
                                    className="p-5 rounded-[2rem] bg-[#0c172c]/90 backdrop-blur-2xl border border-teal-500/30 shadow-[0_20px_40px_rgba(0,0,0,0.6)] space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400 flex items-center gap-1.5">
                                            <CreditCard className="w-3.5 h-3.5" />
                                            Next Rent Payment
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase tracking-wider border border-teal-500/30">
                                            ✓ Auto-Pay Active
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Due 22 Sep 2026</p>
                                            <p className="text-2xl font-black text-white tracking-tight">₹18,685</p>
                                        </div>
                                        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/30">
                                            Scheduled
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Demo Card 3: Verified Listing */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.7, delay: 0.5 }}
                                    className="p-4 rounded-[1.75rem] bg-[#0c172c]/80 backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">Verified Listing</p>
                                            <p className="text-[10px] text-slate-400 font-medium">100% Inspected & Authenticated</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-emerald-400">✓ Verified</span>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    2. PROPERTY SEARCH EXPERIENCE
                ══════════════════════════════════════════════════════ */}
                <section id="search" className="relative py-12 px-4 sm:px-6 lg:px-8 z-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="p-6 sm:p-8 rounded-[2.5rem] bg-[#0c172c]/90 backdrop-blur-2xl border border-emerald-500/20 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.08)]">
                            <div className="mb-6 text-left">
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    Find a place that feels like home.
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                                    Explore verified properties that match the way you want to live.
                                </p>
                            </div>

                            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                {/* Location */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3 text-emerald-400" />
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={searchLocation}
                                        onChange={(e) => setSearchLocation(e.target.value)}
                                        placeholder="City, area, locality…"
                                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    />
                                </div>

                                {/* Property Type */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Building2 className="w-3 h-3 text-emerald-400" />
                                        Property Type
                                    </label>
                                    <select
                                        value={searchType}
                                        onChange={(e) => setSearchType(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-[#0c172c] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                                    >
                                        <option value="">All Types</option>
                                        <option value="apartment">Apartment</option>
                                        <option value="house">House / Villa</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="land">Land</option>
                                    </select>
                                </div>

                                {/* Budget */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <CreditCard className="w-3 h-3 text-emerald-400" />
                                        Budget
                                    </label>
                                    <select
                                        value={searchBudget}
                                        onChange={(e) => setSearchBudget(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-[#0c172c] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                                    >
                                        <option value="">Any Budget</option>
                                        <option value="under-15k">Under ₹15,000</option>
                                        <option value="15k-30k">₹15,000 – ₹30,000</option>
                                        <option value="30k-plus">₹30,000+</option>
                                    </select>
                                </div>

                                {/* Bedrooms */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Layers className="w-3 h-3 text-emerald-400" />
                                        Bedrooms
                                    </label>
                                    <select
                                        value={searchBedrooms}
                                        onChange={(e) => setSearchBedrooms(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl bg-[#0c172c] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                                    >
                                        <option value="">Any Bedrooms</option>
                                        <option value="1">1 BHK</option>
                                        <option value="2">2 BHK</option>
                                        <option value="3">3 BHK</option>
                                        <option value="4">4+ BHK</option>
                                    </select>
                                </div>

                                {/* Submit CTA */}
                                <div>
                                    <button
                                        type="submit"
                                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Search className="w-4 h-4" />
                                        <span>SEARCH PROPERTIES</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    3. FEATURED PROPERTIES (REAL API DATA)
                ══════════════════════════════════════════════════════ */}
                <section id="featured" className="relative py-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {/* Section Header */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3">
                                    <Compass className="w-3.5 h-3.5" />
                                    <span>Curated Portfolio</span>
                                </div>
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                                    Spaces worth coming home to.
                                </h2>
                                <p className="text-sm sm:text-base text-slate-400 font-medium mt-2 max-w-xl">
                                    Explore real properties managed and verified on the TMS platform.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/browse')}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black text-xs uppercase tracking-wider transition-all self-start md:self-auto cursor-pointer"
                            >
                                <span>View All Listings</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Real Properties Grid */}
                        {loadingProps ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : propsError ? (
                            <div className="p-12 rounded-[2.5rem] bg-[#0c172c]/80 border border-white/10 text-center space-y-4 max-w-lg mx-auto">
                                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                                <h3 className="text-lg font-black text-white">Featured Properties</h3>
                                <p className="text-xs text-slate-400">{propsError}</p>
                                <button
                                    onClick={fetchFeatured}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase tracking-wider inline-flex items-center gap-2"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Try Again
                                </button>
                            </div>
                        ) : featuredProperties.length === 0 ? (
                            <div className="p-12 rounded-[2.5rem] bg-[#0c172c]/80 border border-white/10 text-center space-y-4 max-w-md mx-auto">
                                <Building2 className="w-12 h-12 text-slate-500 mx-auto" />
                                <h3 className="text-lg font-black text-white">No Properties Listed Yet</h3>
                                <p className="text-xs text-slate-400">Check back soon or browse properties in other localities.</p>
                                <button
                                    onClick={() => navigate('/browse')}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase tracking-wider"
                                >
                                    Browse Properties
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {featuredProperties.map((p, i) => (
                                    <GridCard
                                        key={p._id || p.id}
                                        p={p}
                                        index={i}
                                        isSaved={savedIds.has(String(p._id || p.id))}
                                        inCompare={compareList.some(c => String(c._id || c.id) === String(p._id || p.id))}
                                        onSave={() => handleSave(p._id || p.id)}
                                        onCompare={() => toggleCompare(p)}
                                        onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    4. PLATFORM STORY SECTION
                ══════════════════════════════════════════════════════ */}
                <section id="story" className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#0a1120]/60">
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
                        {/* Left Column: Editorial Narrative */}
                        <div className="lg:col-span-6 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>The Modern Approach</span>
                            </div>

                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                                Renting shouldn't <br />
                                <span className="text-emerald-400">feel complicated.</span>
                            </h2>

                            <p className="text-base text-slate-300 font-medium leading-relaxed">
                                From discovering a property to signing a lease, paying rent, reporting maintenance, and communicating with your manager — TMS brings everything together in one unified platform.
                            </p>

                            <div className="space-y-4 pt-2">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white">Unified Experience</h4>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">No fragmented spreadsheets, paper checks, or lost messages.</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                                    <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shrink-0 mt-0.5">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white">Complete Transparency</h4>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">Clear lease terms, automated fee breakdowns, and logged repair updates.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Architectural Photography with Layered Glass Card */}
                        <div className="lg:col-span-6 relative">
                            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/15 shadow-2xl">
                                <img
                                    src={STORY_BG_IMAGE}
                                    alt="Interior Design"
                                    className="w-full h-[460px] object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#060B13]/90 via-transparent to-black/30" />

                                {/* Overlay Glass Card */}
                                <div className="absolute bottom-6 left-6 right-6 p-6 rounded-3xl bg-[#060B13]/85 backdrop-blur-xl border border-white/15 shadow-2xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white">Smart Rental Management</h4>
                                                <p className="text-[11px] text-slate-400 font-medium">Built for Tenants & Property Managers</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                                            All-in-One
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    5. CORE FEATURES (4 PILLARS)
                ══════════════════════════════════════════════════════ */}
                <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto space-y-16">
                        <div className="text-center max-w-2xl mx-auto space-y-3">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                <Layers className="w-3.5 h-3.5" />
                                <span>Platform Pillars</span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                                Everything you need. <br />
                                <span className="text-emerald-400">Nothing you don't.</span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Pillar 1 */}
                            <div className="p-8 rounded-[2.25rem] bg-[#0c172c]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 transition-all group shadow-xl hover:-translate-y-1 text-left space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg shadow-emerald-500/10">
                                    <Compass className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">1. Property Discovery</h3>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    Explore properties with powerful search, filters, interactive maps, saved favorites, and side-by-side comparison.
                                </p>
                            </div>

                            {/* Pillar 2 */}
                            <div className="p-8 rounded-[2.25rem] bg-[#0c172c]/80 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 transition-all group shadow-xl hover:-translate-y-1 text-left space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-lg shadow-teal-500/10">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">2. Digital Leases</h3>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    Keep your lease agreements, terms, renewal tracking, and legal documents organized and accessible from anywhere.
                                </p>
                            </div>

                            {/* Pillar 3 */}
                            <div className="p-8 rounded-[2.25rem] bg-[#0c172c]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 transition-all group shadow-xl hover:-translate-y-1 text-left space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg shadow-emerald-500/10">
                                    <CreditCard className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">3. Smart Payments</h3>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    Pay rent securely via UPI and cards, track payment history, receive instant digital receipts, and set up auto-pay.
                                </p>
                            </div>

                            {/* Pillar 4 */}
                            <div className="p-8 rounded-[2.25rem] bg-[#0c172c]/80 backdrop-blur-xl border border-white/10 hover:border-cyan-500/40 transition-all group shadow-xl hover:-translate-y-1 text-left space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-lg shadow-cyan-500/10">
                                    <MessageSquare className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">4. Connected Management</h3>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                    Stay connected with managers through direct messaging, maintenance request tracking, and milestone notifications.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    6. TENANT & MANAGER EXPERIENCE
                ══════════════════════════════════════════════════════ */}
                <section id="tenants" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#0a1120]/40">
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
                        {/* For Tenants Card */}
                        <div className="p-8 sm:p-10 rounded-[2.75rem] bg-[#0c172c]/90 backdrop-blur-2xl border border-emerald-500/25 shadow-2xl text-left space-y-6 flex flex-col justify-between">
                            <div className="space-y-4">
                                <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
                                    FOR TENANTS
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    Everything you need to rent with confidence.
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    {[
                                        'Discover properties',
                                        'Save & compare favorites',
                                        'View & sign digital leases',
                                        'Pay rent online with UPI/cards',
                                        'Raise maintenance requests',
                                        'Direct manager chat',
                                        'Instant receipt records'
                                    ].map((feat, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={() => navigate('/browse')}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>EXPLORE AS A TENANT</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* For Managers Card */}
                        <div id="managers" className="p-8 sm:p-10 rounded-[2.75rem] bg-[#0c172c]/90 backdrop-blur-2xl border border-teal-500/25 shadow-2xl text-left space-y-6 flex flex-col justify-between">
                            <div className="space-y-4">
                                <span className="px-3.5 py-1 rounded-full bg-teal-500/15 text-teal-400 text-xs font-black uppercase tracking-wider border border-teal-500/30">
                                    FOR PROPERTY MANAGERS
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    Everything you need to manage with clarity.
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    {[
                                        'Manage properties & units',
                                        'Track tenant occupancies',
                                        'Automated lease management',
                                        'Track rent collections',
                                        'Technician job dispatch',
                                        'Tenant broadcast messaging',
                                        'Financial reports & logs'
                                    ].map((feat, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                            <Check className="w-4 h-4 text-teal-400 shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>MANAGE YOUR PORTFOLIO</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    7. HOW TMS WORKS (4-STEP TIMELINE)
                ══════════════════════════════════════════════════════ */}
                <section id="how-it-works" className="relative py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto space-y-16">
                        <div className="text-center max-w-2xl mx-auto space-y-3">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Seamless Process</span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                                How TMS Works
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400 font-medium">A frictionless journey from first viewing to everyday living.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                            {[
                                { step: '01', title: 'DISCOVER', desc: 'Find the right property with verified photos, specs, and details.' },
                                { step: '02', title: 'CONNECT', desc: 'Connect directly with the property manager and schedule tours.' },
                                { step: '03', title: 'LEASE', desc: 'Complete your rental agreement digitally with clear terms.' },
                                { step: '04', title: 'LIVE', desc: 'Pay rent, manage maintenance, and stay connected with ease.' },
                            ].map((s, idx) => (
                                <div key={idx} className="p-8 rounded-[2.25rem] bg-[#0c172c]/70 border border-white/10 relative space-y-4 hover:border-emerald-500/30 transition-all">
                                    <span className="text-4xl font-black text-emerald-400/40 tracking-tighter block">{s.step}</span>
                                    <h3 className="text-lg font-black text-white tracking-tight">{s.title}</h3>
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    8. PAYMENTS & MAINTENANCE SHOWCASE
                ══════════════════════════════════════════════════════ */}
                <section id="showcase" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#0a1120]/50">
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
                        {/* Payment Showcase Mockup */}
                        <div className="p-8 sm:p-10 rounded-[2.75rem] bg-[#0c172c]/90 backdrop-blur-2xl border border-emerald-500/25 shadow-2xl text-left space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                                    Rent Payment Showcase
                                </span>
                                <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase border border-emerald-500/30">
                                    Secure Online
                                </span>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex justify-between text-xs font-bold text-slate-300">
                                    <span>Monthly Rent</span>
                                    <span className="text-white">₹18,500</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-300">
                                    <span>Platform Fee</span>
                                    <span className="text-white">₹185</span>
                                </div>
                                <div className="h-px bg-white/10 my-2" />
                                <div className="flex justify-between text-sm font-black text-white">
                                    <span>Total Due</span>
                                    <span className="text-emerald-400 text-lg">₹18,685</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white">UPI</span>
                                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white">Debit Card</span>
                                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-white">Net Banking</span>
                            </div>
                        </div>

                        {/* Maintenance Showcase Mockup */}
                        <div className="p-8 sm:p-10 rounded-[2.75rem] bg-[#0c172c]/90 backdrop-blur-2xl border border-teal-500/25 shadow-2xl text-left space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                                    Maintenance Workflow
                                </span>
                                <span className="px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30">
                                    In Progress
                                </span>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                <h4 className="text-base font-black text-white">Leaking Kitchen Tap</h4>
                                <p className="text-xs text-slate-400 font-medium">Assigned: Maintenance Technician</p>
                                <div className="pt-2 space-y-2 text-xs font-bold text-slate-300">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Request Logged</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-teal-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Technician Dispatched</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        <span>Visit Scheduled</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    9. TRUST & SECURITY
                ══════════════════════════════════════════════════════ */}
                <section id="trust" className="relative py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto space-y-12">
                        <div className="text-center max-w-2xl mx-auto space-y-3">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Security & Verification</span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                                Built for trust.
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                            <div className="p-6 rounded-3xl bg-[#0c172c]/80 border border-white/10 space-y-2">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                <h3 className="text-base font-black text-white">JWT Authentication</h3>
                                <p className="text-xs text-slate-400 font-medium">Industry-standard authentication and session security.</p>
                            </div>

                            <div className="p-6 rounded-3xl bg-[#0c172c]/80 border border-white/10 space-y-2">
                                <Users className="w-6 h-6 text-teal-400" />
                                <h3 className="text-base font-black text-white">Role-Based Access</h3>
                                <p className="text-xs text-slate-400 font-medium">Distinct permission boundaries for tenants, managers, and technicians.</p>
                            </div>

                            <div className="p-6 rounded-3xl bg-[#0c172c]/80 border border-white/10 space-y-2">
                                <CreditCard className="w-6 h-6 text-emerald-400" />
                                <h3 className="text-base font-black text-white">Secure Razorpay Payments</h3>
                                <p className="text-xs text-slate-400 font-medium">Reliable and encrypted gateway transactions for online rent collection.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    10. FINAL CTA SECTION
                ══════════════════════════════════════════════════════ */}
                <section id="cta" className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <div className="absolute inset-0 z-0 select-none pointer-events-none">
                        <img
                            src={CTA_BG_IMAGE}
                            alt="Luxury Living"
                            className="w-full h-full object-cover filter brightness-50"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#060B13] via-[#060B13]/80 to-black/70" />
                    </div>

                    <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
                        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                            YOUR NEXT HOME <br />
                            <span className="text-emerald-400">STARTS HERE.</span>
                        </h2>
                        <p className="text-base sm:text-xl text-slate-300 font-medium max-w-xl mx-auto">
                            Discover properties, manage your home, and stay connected — all from one place.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                            <button
                                onClick={() => navigate('/browse')}
                                className="px-9 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:-translate-y-1 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <span>EXPLORE PROPERTIES</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-9 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-xl shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                            >
                                GET STARTED
                            </button>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    11. FOOTER
                ══════════════════════════════════════════════════════ */}
                <footer className="relative bg-[#04070D] border-t border-white/10 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-left">
                    <div className="max-w-7xl mx-auto space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                            {/* Brand Column */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-xl font-black tracking-tight text-white">TMS</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 block">
                                            Smart Rental Management
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
                                    Making renting simpler for tenants and property managers across the entire rental lifecycle.
                                </p>
                            </div>

                            {/* Column: Platform */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">Platform</h4>
                                <ul className="space-y-2 text-xs font-bold text-slate-400">
                                    <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                                    <li><Link to="/browse" className="hover:text-white transition-colors">Browse Properties</Link></li>
                                    <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                    <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                                </ul>
                            </div>

                            {/* Column: Tenants */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">Tenants</h4>
                                <ul className="space-y-2 text-xs font-bold text-slate-400">
                                    <li><Link to="/browse" className="hover:text-white transition-colors">Find a Home</Link></li>
                                    <li><Link to="/saved" className="hover:text-white transition-colors">Saved Properties</Link></li>
                                    <li><Link to="/compare" className="hover:text-white transition-colors">Compare Properties</Link></li>
                                    <li><Link to="/pay-now" className="hover:text-white transition-colors">Pay Rent</Link></li>
                                </ul>
                            </div>

                            {/* Column: Account */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">Access</h4>
                                <ul className="space-y-2 text-xs font-bold text-slate-400">
                                    <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                                    <li><Link to="/register" className="hover:text-white transition-colors">Get Started</Link></li>
                                    <li><Link to="/settings" className="hover:text-white transition-colors">Settings</Link></li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
                            <p>© 2026 TMS. All rights reserved.</p>
                            <p>Tenant Management System</p>
                        </div>
                    </div>
                </footer>

                {/* Floating Compare Tray if user selected properties */}
                <AnimatePresence>
                    {compareList.length > 0 && (
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3.5 rounded-[1.75rem] bg-emerald-600 shadow-2xl shadow-emerald-600/40 border border-white/20"
                        >
                            <Scale className="w-5 h-5 text-white flex-shrink-0" />
                            <span className="text-white font-black text-sm whitespace-nowrap">
                                {compareList.length} propert{compareList.length > 1 ? 'ies' : 'y'} selected
                            </span>
                            <button
                                onClick={() => navigate('/compare', { state: { compareList } })}
                                className="px-5 py-2 rounded-xl bg-white text-emerald-700 font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-md cursor-pointer"
                            >
                                Compare Now →
                            </button>
                            <button
                                onClick={() => setCompareList([])}
                                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                            >
                                ✕
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
