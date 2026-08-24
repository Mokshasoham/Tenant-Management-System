import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, SlidersHorizontal, MapPin, Building2, ShieldCheck,
    Grid, List, Sparkles, RefreshCw, Scale, ArrowRight, X, Heart
} from 'lucide-react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import PageTransition from '../../components/PageTransition';
import { propertyService } from '../../services/api';
import useAuthStore from '../../context/authStore';
import { GridCard, CompactCard, SkeletonCard } from '../../components/property/TenantBrowseProperties';
import handleViewPropertyNavigation from '../../utils/propertyNavigationHelper';
import { cn } from '../../utils/cn';

export default function PublicPropertiesPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);

    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [type, setType] = useState(searchParams.get('type') || '');
    const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
    const [furnishing, setFurnishing] = useState(searchParams.get('furnishing') || '');
    const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
    const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');

    const [viewMode, setViewMode] = useState('grid');
    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);

    const fetchProperties = async () => {
        setLoading(true);
        setError(null);
        try {
            const query = {
                search: search || undefined,
                type: type || undefined,
                bedrooms: bedrooms ? Number(bedrooms) : undefined,
                minPrice: minPrice ? Number(minPrice) : undefined,
                maxPrice: maxPrice ? Number(maxPrice) : undefined,
                furnishing: furnishing || undefined,
                verifiedOnly: verifiedOnly ? 'true' : undefined,
                sortBy,
                sortOrder,
                limit: 24,
            };

            const res = await propertyService.getAllProperties(query);
            const list = res?.data?.data || res?.data || res || [];
            const validList = Array.isArray(list) ? list.filter(Boolean) : [];
            setProperties(validList);

            if (user) {
                const saved = new Set();
                validList.forEach(p => {
                    if (p.savedBy?.includes(user._id || user.id)) saved.add(String(p._id || p.id));
                });
                setSavedIds(saved);
            }
        } catch (err) {
            console.error('Failed to fetch public properties:', err);
            setError('Could not load properties at this time. Please try refreshing.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [search, type, bedrooms, minPrice, maxPrice, furnishing, verifiedOnly, sortBy, sortOrder]);

    const handleSave = (propId) => {
        if (!user) {
            navigate('/login');
            return;
        }
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

    const resetFilters = () => {
        setSearch('');
        setType('');
        setBedrooms('');
        setMinPrice('');
        setMaxPrice('');
        setFurnishing('');
        setVerifiedOnly(false);
        setSortBy('createdAt');
        setSortOrder('desc');
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-[#060B13] text-slate-900 dark:text-white antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-300">
                <PublicNavbar />

                {/* Hero Header */}
                <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
                    <div className="space-y-3 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                            <Building2 className="w-3.5 h-3.5" /> Property Discovery
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Find a place that fits your life.
                        </h1>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
                            Browse verified residential and commercial rental properties across prime locations with transparent terms and 100% digital leasing.
                        </p>
                    </div>

                    {/* Filter Engine Bar */}
                    <div className="mt-8 p-5 rounded-[2.25rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
                        {/* Search & Mode Bar */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                            {/* Text Search */}
                            <div className="lg:col-span-6 flex items-center gap-3 p-3 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <Search className="w-4 h-4 text-emerald-500 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search by property name, city, landmark, or address..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 w-full"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Sort Filter */}
                            <div className="lg:col-span-3 flex items-center gap-2 p-3 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Sort:</span>
                                <select
                                    value={`${sortBy}:${sortOrder}`}
                                    onChange={(e) => {
                                        const [sBy, sOrd] = e.target.value.split(':');
                                        setSortBy(sBy);
                                        setSortOrder(sOrd);
                                    }}
                                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white w-full cursor-pointer"
                                >
                                    <option value="createdAt:desc" className="dark:bg-slate-900">Newest Added</option>
                                    <option value="rentAmount:asc" className="dark:bg-slate-900">Price: Low to High</option>
                                    <option value="rentAmount:desc" className="dark:bg-slate-900">Price: High to Low</option>
                                    <option value="rating:desc" className="dark:bg-slate-900">Highest Rated</option>
                                </select>
                            </div>

                            {/* View Switcher & Verified Toggle */}
                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-3">
                                <button
                                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border",
                                        verifiedOnly
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                            : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-emerald-500/30"
                                    )}
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Verified Only</span>
                                </button>

                                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white dark:bg-white/15 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-400")}
                                        title="Grid View"
                                    >
                                        <Grid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-white/15 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-400")}
                                        title="List View"
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Filter Dropdowns */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                            {/* Type */}
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                <option value="" className="dark:bg-slate-900">All Types</option>
                                <option value="apartment" className="dark:bg-slate-900">Apartment</option>
                                <option value="house" className="dark:bg-slate-900">House</option>
                                <option value="villa" className="dark:bg-slate-900">Villa</option>
                                <option value="studio" className="dark:bg-slate-900">Studio</option>
                                <option value="commercial" className="dark:bg-slate-900">Commercial</option>
                            </select>

                            {/* BHK */}
                            <select
                                value={bedrooms}
                                onChange={(e) => setBedrooms(e.target.value)}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                <option value="" className="dark:bg-slate-900">Any Bedrooms</option>
                                <option value="1" className="dark:bg-slate-900">1 BHK</option>
                                <option value="2" className="dark:bg-slate-900">2 BHK</option>
                                <option value="3" className="dark:bg-slate-900">3 BHK</option>
                                <option value="4" className="dark:bg-slate-900">4+ BHK</option>
                            </select>

                            {/* Furnishing */}
                            <select
                                value={furnishing}
                                onChange={(e) => setFurnishing(e.target.value)}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                <option value="" className="dark:bg-slate-900">Any Furnishing</option>
                                <option value="fully-furnished" className="dark:bg-slate-900">Fully Furnished</option>
                                <option value="semi-furnished" className="dark:bg-slate-900">Semi Furnished</option>
                                <option value="unfurnished" className="dark:bg-slate-900">Unfurnished</option>
                            </select>

                            {/* Min Rent */}
                            <input
                                type="number"
                                placeholder="Min Rent ₹"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                            />

                            {/* Max Rent */}
                            <input
                                type="number"
                                placeholder="Max Rent ₹"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                            />

                            {/* Reset Button */}
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="p-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reset</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Results Section */}
                <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left pb-24">
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                            Showing <span className="text-slate-900 dark:text-white font-black">{properties.length}</span> Verified Properties
                        </p>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20 space-y-4">
                            <p className="text-sm font-black text-rose-500">{error}</p>
                            <button
                                onClick={fetchProperties}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : properties.length === 0 ? (
                        <div className="p-16 text-center rounded-[3rem] bg-white dark:bg-[#0A101C] border border-slate-200 dark:border-white/10 shadow-xl space-y-4 max-w-xl mx-auto">
                            <Building2 className="w-14 h-14 text-slate-400 mx-auto" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">No matching properties found</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                We couldn't find properties matching your current filter criteria. Try expanding your search or resetting filters.
                            </p>
                            <button
                                onClick={resetFilters}
                                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {properties.map((property, idx) => (
                                <GridCard
                                    key={property._id || property.id}
                                    p={property}
                                    index={idx}
                                    isSaved={savedIds.has(String(property._id || property.id))}
                                    inCompare={compareList.some(c => String(c._id || c.id) === String(property._id || property.id))}
                                    onSave={() => handleSave(property._id || property.id)}
                                    onCompare={() => toggleCompare(property)}
                                    onClick={() => handleViewPropertyNavigation({ navigate, property, role: user?.role })}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {properties.map(property => (
                                <CompactCard
                                    key={property._id || property.id}
                                    p={property}
                                    isSaved={savedIds.has(String(property._id || property.id))}
                                    inCompare={compareList.some(c => String(c._id || c.id) === String(property._id || property.id))}
                                    onSave={() => handleSave(property._id || property.id)}
                                    onCompare={() => toggleCompare(property)}
                                    onClick={() => handleViewPropertyNavigation({ navigate, property, role: user?.role })}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Floating Compare Tray if selected */}
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

                <PublicFooter />
            </div>
        </PageTransition>
    );
}
