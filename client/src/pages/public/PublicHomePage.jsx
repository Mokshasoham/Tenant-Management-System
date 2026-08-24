import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Building2, ArrowRight, ShieldCheck, Search, MapPin,
    Sparkles, CheckCircle2, Zap, FileText, CreditCard, Wrench,
    MessageSquare, ChevronRight, Star, Scale, Heart, Users,
    ArrowUpRight, Clock, Award
} from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import PageTransition from '../../components/PageTransition';
import { propertyService } from '../../services/api';
import useAuthStore from '../../context/authStore';
import { GridCard, SkeletonCard } from '../../components/property/TenantBrowseProperties';
import handleViewPropertyNavigation from '../../utils/propertyNavigationHelper';
import { cn } from '../../utils/cn';

const HERO_BG_IMAGE = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop";

export default function PublicHomePage() {
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
    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);

    useEffect(() => {
        const fetchFeatured = async () => {
            setLoadingProps(true);
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
            } finally {
                setLoadingProps(false);
            }
        };

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
        navigate(`/public/properties${queryStr ? `?${queryStr}` : ''}`);
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-[#060B13] text-slate-900 dark:text-white antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-300">
                <PublicNavbar />

                {/* ══════════════════════════════════════════════════════
                    1. HERO SECTION
                ══════════════════════════════════════════════════════ */}
                <section className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img
                            src={HERO_BG_IMAGE}
                            alt="Luxury Architecture"
                            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.75] dark:brightness-[0.35] contrast-[1.1] transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/50 to-transparent dark:from-[#060B13] dark:via-[#060B13]/70 dark:to-transparent" />
                        <div className="absolute inset-0 bg-radial-gradient from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
                        {/* Hero Text */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="lg:col-span-7 space-y-6"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/15 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider shadow-lg">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Next-Generation Rental Management</span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white drop-shadow-sm font-sans">
                                SMARTER <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400">
                                    RENTING
                                </span> <br />
                                STARTS HERE.
                            </h1>

                            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium max-w-xl leading-relaxed">
                                Discover verified properties, sign digital leases, pay rent in ₹ (INR), and resolve maintenance — all from one intelligent platform.
                            </p>

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <button
                                    onClick={() => navigate('/public/properties')}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>EXPLORE PROPERTIES</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="px-7 py-4 rounded-2xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-xl transition-all shadow-md cursor-pointer"
                                >
                                    GET STARTED
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-5 py-4 rounded-2xl text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    SIGN IN
                                </button>
                            </div>

                            <div className="flex items-center gap-6 pt-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Verified Properties</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                                    <span>Digital Lease Management</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                    <span>Secure Rent Payments</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Hero Live Preview Glass Cards */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="lg:col-span-5 space-y-4"
                        >
                            <div className="p-6 rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 shadow-2xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Active Lease</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        ✓ ACTIVE
                                    </span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <div>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">Modern City Apartment</p>
                                        <p className="text-xs text-slate-500 font-bold">Urban Luxury Residence</p>
                                    </div>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">₹18,500<span className="text-xs font-medium text-slate-400">/mo</span></p>
                                </div>
                            </div>

                            <div className="p-5 rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 shadow-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Next Rent Payment</span>
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">✓ AUTO-PAY ACTIVE</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold">DUE 22 SEP 2026</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">₹18,685</p>
                                    </div>
                                    <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md">
                                        Scheduled
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 rounded-[1.5rem] bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white">Verified Listing</p>
                                        <p className="text-[10px] text-slate-500">100% Inspected & Authenticated</p>
                                    </div>
                                </div>
                                <span className="text-emerald-500 text-[10px] font-black">✓ Verified</span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    2. SEARCH BAR WIDGET
                ══════════════════════════════════════════════════════ */}
                <section className="relative z-20 -mt-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="p-4 sm:p-5 rounded-[2.25rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/15 shadow-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center text-left"
                    >
                        {/* Location */}
                        <div className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Location</label>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="City, locality, or landmark"
                                    value={searchLocation}
                                    onChange={(e) => setSearchLocation(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 w-full"
                                />
                            </div>
                        </div>

                        {/* Property Type */}
                        <div className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Type</label>
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white w-full cursor-pointer"
                            >
                                <option value="" className="dark:bg-slate-900">All Types</option>
                                <option value="apartment" className="dark:bg-slate-900">Apartment</option>
                                <option value="house" className="dark:bg-slate-900">Independent House</option>
                                <option value="villa" className="dark:bg-slate-900">Luxury Villa</option>
                                <option value="studio" className="dark:bg-slate-900">Studio</option>
                                <option value="commercial" className="dark:bg-slate-900">Commercial</option>
                            </select>
                        </div>

                        {/* Bedrooms */}
                        <div className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Bedrooms</label>
                            <select
                                value={searchBedrooms}
                                onChange={(e) => setSearchBedrooms(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white w-full cursor-pointer"
                            >
                                <option value="" className="dark:bg-slate-900">Any BHK</option>
                                <option value="1" className="dark:bg-slate-900">1 BHK</option>
                                <option value="2" className="dark:bg-slate-900">2 BHK</option>
                                <option value="3" className="dark:bg-slate-900">3 BHK</option>
                                <option value="4" className="dark:bg-slate-900">4+ BHK</option>
                            </select>
                        </div>

                        {/* Budget */}
                        <div className="p-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Budget</label>
                            <select
                                value={searchBudget}
                                onChange={(e) => setSearchBudget(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white w-full cursor-pointer"
                            >
                                <option value="" className="dark:bg-slate-900">Any Budget</option>
                                <option value="under-15k" className="dark:bg-slate-900">Under ₹15,000</option>
                                <option value="15k-30k" className="dark:bg-slate-900">₹15,000 - ₹30,000</option>
                                <option value="30k-plus" className="dark:bg-slate-900">₹30,000+</option>
                            </select>
                        </div>

                        {/* Search Action */}
                        <button
                            type="submit"
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Search className="w-4 h-4" />
                            <span>Find Properties</span>
                        </button>
                    </form>
                </section>

                {/* ══════════════════════════════════════════════════════
                    3. WHY TMS VALUE PROPOSITION
                ══════════════════════════════════════════════════════ */}
                <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
                    <div className="space-y-4 max-w-2xl mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                            <Sparkles className="w-3.5 h-3.5" /> Why Choose TMS
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            The complete rental ecosystem, built for modern living.
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium">
                            Say goodbye to messy paperwork, hidden brokerage fees, and delayed maintenance. TMS unites every phase of the tenancy lifecycle under one transparent system.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: ShieldCheck,
                                title: "100% Verified Properties",
                                desc: "Every property undergoes physical and document verification with authenticated trust scoring before going live.",
                                color: "from-emerald-500 to-teal-600"
                            },
                            {
                                icon: FileText,
                                title: "Digital Lease Agreements",
                                desc: "Automated legal lease generation and legally-binding digital signing. Zero paperwork or courier delays.",
                                color: "from-blue-500 to-indigo-600"
                            },
                            {
                                icon: CreditCard,
                                title: "Integrated Rent in ₹ (INR)",
                                desc: "Pay rent seamlessly with Razorpay card, UPI, or net banking. Instant auto-generated PDF receipts for tax filing.",
                                color: "from-purple-500 to-violet-600"
                            },
                            {
                                icon: Wrench,
                                title: "Smart Maintenance Dispatch",
                                desc: "Report issues with photos and track technician assignment in real-time until resolution is verified.",
                                color: "from-amber-500 to-orange-600"
                            }
                        ].map((card, i) => {
                            const Icon = card.icon;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                    className="p-7 rounded-[2rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition-all shadow-lg space-y-4 group"
                                >
                                    <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg", card.color)}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                        {card.desc}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    4. FEATURED REAL PROPERTIES (FROM DATABASE)
                ══════════════════════════════════════════════════════ */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left border-t border-slate-200 dark:border-white/10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div className="space-y-2 max-w-xl">
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Featured Listings</span>
                            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                Handpicked verified homes ready for move-in.
                            </h2>
                        </div>
                        <Link
                            to="/public/properties"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer"
                        >
                            <span>View All Properties</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {loadingProps ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(n => <SkeletonCard key={n} />)}
                        </div>
                    ) : featuredProperties.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {featuredProperties.map((property, idx) => (
                                <GridCard
                                    key={property._id || property.id}
                                    p={property}
                                    index={idx}
                                    isSaved={savedIds.has(String(property._id || property.id))}
                                    inCompare={compareList.some(c => (c._id || c.id) === (property._id || property.id))}
                                    onSave={() => handleSave(property._id || property.id)}
                                    onCompare={() => toggleCompare(property)}
                                    onClick={() => handleViewPropertyNavigation({ navigate, property, role: user?.role })}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center rounded-[2.5rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                            <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">No properties listed right now</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                New verified properties are published regularly. Check back shortly or explore our features.
                            </p>
                        </div>
                    )}
                </section>

                {/* ══════════════════════════════════════════════════════
                    5. DUAL PLATFORM PREVIEWS (TENANTS & MANAGERS)
                ══════════════════════════════════════════════════════ */}
                <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* For Tenants Card */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-950/30 dark:via-[#0A101C] dark:to-[#0A101C] border border-emerald-500/20 shadow-xl space-y-6 flex flex-col justify-between"
                        >
                            <div className="space-y-4">
                                <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    For Tenants
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Find your dream home without the rental headache.
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                    Explore verified rentals, sign leases securely, make 1-tap rent payments, and raise maintenance tickets right from your mobile phone or laptop.
                                </p>
                                <ul className="space-y-2.5 pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Zero hidden broker fees</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Instant digital lease signing</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>Downloadable rent receipts for HRA tax exemption</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                to="/public/for-tenants"
                                className="inline-flex items-center justify-between w-full p-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-wider hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                            >
                                <span>Learn More For Tenants</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>

                        {/* For Managers Card */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            className="p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-950/30 dark:via-[#0A101C] dark:to-[#0A101C] border border-blue-500/20 shadow-xl space-y-6 flex flex-col justify-between"
                        >
                            <div className="space-y-4">
                                <span className="px-3 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                    For Property Managers
                                </span>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Run your entire rental portfolio from one command center.
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                    Screen applicants, automate rent reconciliation, dispatch technicians, track occupancy %, and manage property trust scores effortlessly.
                                </p>
                                <ul className="space-y-2.5 pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                        <span>Centralized occupancy & revenue analytics</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                        <span>Automated rent payment tracking & reminders</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                        <span>Technician assignment engine & SLA monitoring</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                to="/public/for-managers"
                                className="inline-flex items-center justify-between w-full p-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
                            >
                                <span>Learn More For Managers</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════
                    6. FINAL CTA
                ══════════════════════════════════════════════════════ */}
                <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
                    <div className="p-10 sm:p-14 rounded-[3rem] bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-2xl space-y-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-radial-gradient from-white/10 via-transparent to-transparent pointer-events-none" />
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                            Ready to transform the way you rent?
                        </h2>
                        <p className="text-emerald-100 text-sm sm:text-base max-w-xl mx-auto font-medium">
                            Join thousands of verified tenants and property managers streamlining leases, payments, and maintenance today.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                            <button
                                onClick={() => navigate('/public/properties')}
                                className="px-8 py-4 rounded-2xl bg-white text-emerald-800 font-black text-xs uppercase tracking-wider hover:bg-emerald-50 transition-all shadow-xl cursor-pointer"
                            >
                                Explore Properties →
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-8 py-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-white/20 text-white font-black text-xs uppercase tracking-wider backdrop-blur-xl transition-all cursor-pointer"
                            >
                                Create Free Account
                            </button>
                        </div>
                    </div>
                </section>

                <PublicFooter />
            </div>
        </PageTransition>
    );
}
