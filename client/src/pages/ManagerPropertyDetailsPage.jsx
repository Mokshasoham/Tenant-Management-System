import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService, leaseService } from '../services/api';
import { Helmet } from 'react-helmet-async';
import useAuthStore from '../context/authStore';
import {
    MapPin, IndianRupee, Bed, Bath, Square,
    ArrowLeft, Shield, CheckCircle2, Star,
    Calendar, User, Home, Building2, Zap,
    Wifi, Car, Droplets, Wind, Info, MessageSquare,
    ChevronLeft, ChevronRight, ArrowRight, Wallet, Hammer, Video, XCircle, AlertTriangle,
    Loader2, X, ShieldCheck, Check, Maximize2, Minimize2,
    Edit2, Trash2, Users, Wrench, Phone, Mail, Scale,
    Lock, Navigation, Compass, ExternalLink, Clock, Store, Utensils,
    Layers, Copy, CheckCheck, Sparkles, Building, KeyRound
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getDisplayStatus, resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../utils/propertyHelper';
import PropertyModal from '../components/PropertyModal';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon Assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const AMENITY_ICONS = {
    'Parking': Car,
    'Wifi': Wifi,
    'Pool': Droplets,
    'Gym': Shield,
    'Laundry': Wind,
    'AC': Zap,
    'Furnished': Home,
    'Maintenance': Hammer,
    'Security': ShieldCheck,
    'Power Backup': Zap,
    'Balcony': Building2,
    'Elevator': Building
};

function PropertyDetailMap({ location, name, address, city }) {
    const mapRef = React.useRef(null);
    const mapInstanceRef = React.useRef(null);

    React.useEffect(() => {
        if (!location || !location.lat || !location.lng) return;
        const lat = Number(location.lat);
        const lng = Number(location.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        if (mapInstanceRef.current) {
            try {
                mapInstanceRef.current.remove();
            } catch (e) {
                // Ignore cleanup errors
            }
            mapInstanceRef.current = null;
        }

        if (!mapRef.current) return;

        if (mapRef.current._leaflet_id) {
            delete mapRef.current._leaflet_id;
        }

        try {
            const map = L.map(mapRef.current, {
                scrollWheelZoom: false
            }).setView([lat, lng], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            L.marker([lat, lng]).addTo(map)
                .bindPopup(`<b>${name || 'Property'}</b><br/>${address || ''}, ${city || ''}`);

            mapInstanceRef.current = map;
        } catch (err) {
            console.warn('Map initialization skipped:', err);
        }

        return () => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    // Ignore cleanup errors
                }
                mapInstanceRef.current = null;
            }
        };
    }, [location?.lat, location?.lng, name, address, city]);

    if (!location || !location.lat || !location.lng) {
        return (
            <div className="p-8 rounded-3xl bg-muted/40 border border-dashed border-border text-center text-xs text-muted-foreground font-bold">
                📍 Location Map Unavailable
            </div>
        );
    }

    return (
        <div className="h-64 rounded-3xl overflow-hidden border border-border shadow-inner relative z-0">
            <div ref={mapRef} className="w-full h-full" />
        </div>
    );
}

export default function ManagerPropertyDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [activeImage, setActiveImage] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [activeLease, setActiveLease] = useState(null);

    const fetchPropertyData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await propertyService.getPropertyById(id);
            const propData = res.data?.data || res.data || res;
            setProperty(propData);

            // Fetch active leases if available
            try {
                const leaseRes = await leaseService.getAllLeases({ property: id });
                const leases = leaseRes.data?.data || leaseRes.data || [];
                const active = Array.isArray(leases) ? leases.find(l => ['active', 'signed'].includes(l.status)) : null;
                setActiveLease(active);
            } catch (leaseErr) {
                console.warn('Could not fetch active lease for manager property details:', leaseErr);
            }
        } catch (err) {
            console.error('Failed to fetch manager property details:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load property');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPropertyData();
        }
    }, [id]);

    const handleDeleteProperty = async () => {
        if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;
        try {
            await propertyService.deleteProperty(id);
            navigate('/properties');
        } catch (err) {
            console.error('Delete error:', err);
            alert(err?.response?.data?.message || 'Failed to delete property');
        }
    };

    const handleCopyId = () => {
        if (!property?._id) return;
        navigator.clipboard.writeText(property._id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    // Helper for category display
    const getTypeDisplay = (typeVal) => {
        switch (typeVal) {
            case 'apartment':
                return { label: 'Apartment / Flat', icon: Building2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
            case 'house':
            case 'villa':
                return { label: 'House / Villa', icon: Home, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
            case 'commercial':
            case 'shop':
                return { label: 'Shop / Commercial', icon: Store, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
            case 'hostel':
                return { label: 'Hostel', icon: Building, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
            case 'pg':
                return { label: 'PG / Paying Guest', icon: KeyRound, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
            default:
                return { label: typeVal ? (typeVal.charAt(0).toUpperCase() + typeVal.slice(1)) : 'Residential', icon: Building2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    Loading Manager Property Workspace...
                </p>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center p-6">
                <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    <XCircle className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black text-foreground">Property Not Found</h2>
                <p className="text-sm text-muted-foreground max-w-md">{error || 'The requested property could not be loaded.'}</p>
                <button
                    onClick={() => navigate('/properties')}
                    className="px-6 py-3 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
                >
                    Return to Properties
                </button>
            </div>
        );
    }

    const images = Array.isArray(property.images) && property.images.length > 0
        ? property.images
        : [DEFAULT_PLACEHOLDER_SVG];

    const displayStatus = getDisplayStatus(property);
    const typeInfo = getTypeDisplay(property.type);
    const TypeIcon = typeInfo.icon;

    const googleMapsUrl = (property.location?.lat && property.location?.lng)
        ? `https://www.google.com/maps/search/?api=1&query=${property.location.lat},${property.location.lng}`
        : (property.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.address}, ${property.city || ''}`)}` : null);

    return (
        <div className="space-y-8 pb-16">
            <Helmet>
                <title>{property.name} | Property Operations | TMS Manager Portal</title>
            </Helmet>

            {/* Top Action & Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/properties')}
                        className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Properties</span>
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Manager Operations</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Property</span>
                    </button>
                    <button
                        onClick={() => navigate('/property/verification')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border hover:bg-muted text-foreground font-black text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                    >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Verification</span>
                    </button>
                    <button
                        onClick={handleDeleteProperty}
                        className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all text-xs font-bold active:scale-95 cursor-pointer"
                        title="Delete Property"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Content Grid: Left Details & Right Manager Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Media, Specs, Description, Location */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Media Gallery Hero */}
                    <div className="space-y-4">
                        <div className="relative rounded-[2.5rem] overflow-hidden border border-border shadow-2xl aspect-[16/9] bg-muted group">
                            <img
                                src={resolveMediaUrl(images[activeImage])}
                                alt={property.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Gallery Navigation Controls */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setActiveImage(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveImage(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </>
                            )}

                            {/* Top Badges */}
                            <div className="absolute top-4 left-4 flex items-center gap-2">
                                <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md flex items-center gap-1.5 backdrop-blur-md bg-black/60 text-white border-white/20")}>
                                    <TypeIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{typeInfo.label}</span>
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md backdrop-blur-md bg-black/60 text-white border-white/20">
                                    {displayStatus}
                                </span>
                            </div>

                            {/* Fullscreen & 3D Tour Launcher */}
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                {property.virtualTourUrl && (
                                    <button
                                        type="button"
                                        onClick={() => window.open(property.virtualTourUrl, '_blank', 'noopener,noreferrer')}
                                        className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs font-black uppercase tracking-wider border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                                    >
                                        <Video className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>3D Tour</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsFullscreen(true)}
                                    className="p-2 rounded-full bg-black/60 hover:bg-black text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                                    title="Fullscreen View"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Bottom Counter */}
                            <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                                {activeImage + 1} / {images.length}
                            </div>
                        </div>

                        {/* Thumbnail Strip */}
                        {images.length > 1 && (
                            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveImage(idx)}
                                        className={cn(
                                            "relative w-20 h-16 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer",
                                            activeImage === idx
                                                ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-105 shadow-md"
                                                : "border-border/80 opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Property Title & Pricing */}
                    <div className="p-7 sm:p-8 rounded-[2.5rem] bg-card border border-border shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                                        Verified Property Unit
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                                    {property.name}
                                </h1>
                                <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>{property.address ? `${property.address}, ` : ''}{property.city}, {property.state || ''} {property.zipCode || ''}</span>
                                </p>
                            </div>

                            <div className="sm:text-right space-y-1">
                                <p className="text-3xl font-black text-foreground">
                                    ₹{(property.rentAmount || 0).toLocaleString('en-IN')}
                                    <span className="text-xs font-normal text-muted-foreground"> / month</span>
                                </p>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                                    Deposit: ₹{(property.depositAmount || 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>

                        {/* ══ DYNAMIC SPECIFICATIONS GRID (TAILORED PER TYPE) ══ */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-500" />
                                Unit Specifications ({typeInfo.label})
                            </h3>

                            {/* Commercial / Shop Layout */}
                            {(property.type === 'commercial' || property.type === 'shop') && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Square className="w-4 h-4 text-amber-500" />
                                            <p className="text-foreground font-black text-sm">{property.commercialArea || property.squareFeet || '—'} Sq Ft</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Commercial Area</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Building2 className="w-4 h-4 text-blue-500" />
                                            <p className="text-foreground font-black text-sm">{property.floor !== undefined ? `Floor ${property.floor}` : 'Ground'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Floor Level</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Store className="w-4 h-4 text-emerald-500" />
                                            <p className="text-foreground font-black text-sm truncate">{property.frontage || 'Standard'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Frontage / Width</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Zap className="w-4 h-4 text-rose-500" />
                                            <p className="text-foreground font-black text-sm truncate">{property.electricity || '3-Phase'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Power / Electricity</p>
                                        </div>
                                    </div>

                                    {Array.isArray(property.suitableFor) && property.suitableFor.length > 0 && (
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Suitable Business Types</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {property.suitableFor.map((biz, idx) => (
                                                    <span key={idx} className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                                                        {biz}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Hostel Layout */}
                            {property.type === 'hostel' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Bed className="w-4 h-4 text-purple-500" />
                                            <p className="text-foreground font-black text-sm">{property.totalBeds ? `${property.totalBeds} Beds` : `${property.bedrooms || '—'} Beds`}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Total Bed Capacity</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Users className="w-4 h-4 text-indigo-500" />
                                            <p className="text-foreground font-black text-sm truncate">{property.roomType || 'Hostel Rooms'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Room Sharing Type</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            <p className="text-foreground font-black text-sm capitalize">{property.genderPreference || 'Any / Co-ed'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Gender Policy</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Utensils className="w-4 h-4 text-amber-500" />
                                            <p className="text-foreground font-black text-sm truncate">{property.foodAvailability || 'Available'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Food / Mess Plan</p>
                                        </div>
                                    </div>

                                    {Array.isArray(property.commonFacilities) && property.commonFacilities.length > 0 && (
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hostel Facilities</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {property.commonFacilities.map((fac, idx) => (
                                                    <span key={idx} className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold">
                                                        {fac}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PG / Paying Guest Layout */}
                            {property.type === 'pg' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Users className="w-4 h-4 text-rose-500" />
                                            <p className="text-foreground font-black text-sm">{property.sharingCapacity ? `${property.sharingCapacity} Persons/Room` : (property.roomType || 'PG')}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Sharing Basis</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Bath className="w-4 h-4 text-emerald-500" />
                                            <p className="text-foreground font-black text-sm truncate">{property.bathroomType || 'Attached Bathroom'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Bathroom Setup</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                                            <p className="text-foreground font-black text-sm capitalize">{property.genderPreference || 'Any / Open'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Gender Policy</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                            <Utensils className="w-4 h-4 text-amber-500" />
                                            <p className="text-foreground font-black text-sm truncate">{property.foodAvailability || 'Home Cooked Meals'}</p>
                                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Food & Dining</p>
                                        </div>
                                    </div>

                                    {Array.isArray(property.facilities) && property.facilities.length > 0 && (
                                        <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">In-Room & PG Facilities</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {property.facilities.map((fac, idx) => (
                                                    <span key={idx} className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                                        {fac}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Residential: Apartment / Flat / House / Villa Layout */}
                            {property.type !== 'commercial' && property.type !== 'shop' && property.type !== 'hostel' && property.type !== 'pg' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                        <Bed className="w-4 h-4 text-emerald-500" />
                                        <p className="text-foreground font-black text-sm">{property.bhk || (property.bedrooms ? `${property.bedrooms} Bed` : '—')}</p>
                                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">BHK / Bedrooms</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                        <Bath className="w-4 h-4 text-teal-500" />
                                        <p className="text-foreground font-black text-sm">{property.bathrooms ? `${property.bathrooms} Bath` : '—'}</p>
                                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Bathrooms</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                        <Square className="w-4 h-4 text-amber-500" />
                                        <p className="text-foreground font-black text-sm">{property.squareFeet || property.builtUpArea ? `${property.squareFeet || property.builtUpArea} sqft` : '—'}</p>
                                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Built-up Area</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-1">
                                        <Building2 className="w-4 h-4 text-indigo-500" />
                                        <p className="text-foreground font-black text-sm capitalize truncate">{property.furnishing || 'Unfurnished'}</p>
                                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Furnishing</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-3 pt-3 border-t border-border/60">
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                Property Description
                            </h3>
                            <p className="text-sm text-foreground/80 leading-relaxed font-medium whitespace-pre-line">
                                {property.description || 'No description provided for this property listing.'}
                            </p>
                        </div>

                        {/* Amenities Grid */}
                        <div className="space-y-3 pt-3 border-t border-border/60">
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                Property Amenities ({property.amenities?.length || 0})
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {(Array.isArray(property.amenities) && property.amenities.length > 0 ? property.amenities : ['Parking', 'Wifi', 'Security', 'Maintenance']).map((am, i) => {
                                    const IconComponent = AMENITY_ICONS[am] || CheckCircle2;
                                    return (
                                        <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl bg-muted/50 border border-border/60">
                                            <div className="p-1.5 rounded-xl bg-card text-emerald-500 shadow-inner">
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-foreground">{am}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Property Location & Interactive Map */}
                        <div className="space-y-4 pt-4 border-t border-border/60">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-rose-500" />
                                    Property Location & Coordinates
                                </h3>
                                {googleMapsUrl && (
                                    <a
                                        href={googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-black text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>Open in Google Maps</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            <PropertyDetailMap
                                location={property.location}
                                name={property.name}
                                address={property.address}
                                city={property.city}
                            />

                            {/* Manager Direct Directions Banner (UNLOCKED & UNGATED) */}
                            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <Navigation className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-foreground uppercase tracking-wide">Manager Direct Navigation</p>
                                        <p className="text-[11px] text-muted-foreground">Coordinates: {property.location?.lat || '—'}, {property.location?.lng || '—'}</p>
                                    </div>
                                </div>
                                {googleMapsUrl && (
                                    <a
                                        href={googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                                    >
                                        <span>Get Directions</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Manager Unit Operations, Tenancy & Financials */}
                <div className="space-y-6">
                    {/* Card 1: Unit Operations & Tenancy */}
                    <div className="p-7 rounded-[2.25rem] bg-card border border-border shadow-xl space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Property Management
                                </span>
                                <h3 className="text-xl font-black text-foreground">Unit Operations</h3>
                            </div>
                            <span className={cn(
                                "px-3 py-1 text-xs font-black rounded-full border uppercase tracking-wider shadow-sm",
                                displayStatus === 'Available' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" :
                                displayStatus?.startsWith('Available from') ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500" :
                                displayStatus === 'Under Maintenance' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                                "bg-amber-600/10 border-amber-500/30 text-amber-500"
                            )}>
                                {displayStatus}
                            </span>
                        </div>

                        {/* Financial Highlights */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-muted/60 border border-border/60">
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">Monthly Rent</p>
                                <p className="text-xl font-black text-foreground">₹{(property.rentAmount || 0).toLocaleString('en-IN')}<span className="text-xs font-normal text-muted-foreground/50">/mo</span></p>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted/60 border border-border/60">
                                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">Security Deposit</p>
                                <p className="text-xl font-black text-foreground">₹{(property.depositAmount || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        {/* Property Specs Meta Table */}
                        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 text-xs font-bold">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Property ID</span>
                                <button
                                    type="button"
                                    onClick={handleCopyId}
                                    className="font-mono text-foreground hover:text-emerald-500 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title="Click to copy ID"
                                >
                                    <span>{property._id?.substring(0, 10)}...</span>
                                    {copiedId ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Property Type</span>
                                <span className="text-foreground capitalize">{property.type || 'Apartment'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Managed By</span>
                                <span className="text-foreground">{property.manager?.firstName || property.owner?.firstName || user?.firstName || 'Assigned Manager'}</span>
                            </div>
                        </div>

                        {/* Tenancy & Occupancy Section */}
                        <div className="space-y-3 pt-2 border-t border-border/60">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Tenancy</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                    activeLease ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                )}>
                                    {activeLease ? 'Occupied / Active Lease' : 'Vacant / Ready'}
                                </span>
                            </div>

                            {activeLease ? (
                                <div className="p-4 rounded-2xl bg-muted/60 border border-border/60 space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-muted-foreground">Active Tenant</span>
                                        <span className="text-foreground">{activeLease.tenant?.firstName ? `${activeLease.tenant.firstName} ${activeLease.tenant.lastName || ''}` : 'Tenant'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-muted-foreground">Lease Term</span>
                                        <span className="text-foreground">{new Date(activeLease.startDate).toLocaleDateString()} - {new Date(activeLease.endDate).toLocaleDateString()}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/leases')}
                                        className="w-full mt-2 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        View Lease Agreement →
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl bg-muted/40 border border-dashed border-border/80 text-center space-y-2">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        No active lease on this unit. This property is available for discovery on the resident portal.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/leases')}
                                        className="px-4 py-1.5 rounded-xl bg-muted border border-border hover:bg-muted/80 text-xs font-bold text-foreground transition-all cursor-pointer"
                                    >
                                        View Prospective Leases
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Manager Primary Operations Actions */}
                        <div className="space-y-2.5 pt-2 border-t border-border/60">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manager Actions</span>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(true)}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit Property Details</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/leases')}
                                className="w-full py-3 rounded-2xl bg-muted border border-border hover:border-emerald-500/30 text-foreground font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Users className="w-4 h-4 text-emerald-500" />
                                <span>Manage Leases & Tenancies</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/maintenance')}
                                className="w-full py-3 rounded-2xl bg-muted border border-border hover:border-amber-500/30 text-foreground font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Wrench className="w-4 h-4 text-amber-500" />
                                <span>View Maintenance Work Orders</span>
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Financial & Yield Overview */}
                    <div className="p-6 rounded-[2.25rem] bg-card border border-border shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                                <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                                Financial Overview
                            </span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase">Annual Yield</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Monthly Rent Roll</span>
                                <span className="font-bold text-foreground">₹{(property.rentAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Security Deposit Escrow</span>
                                <span className="font-bold text-foreground">₹{(property.depositAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">Projected Annual Revenue</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{((property.rentAmount || 0) * 12).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Property Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <PropertyModal
                        property={property}
                        initialType={property.type}
                        onClose={() => setShowEditModal(false)}
                        onSave={() => {
                            setShowEditModal(false);
                            fetchPropertyData();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Fullscreen Lightbox Modal */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <button
                            type="button"
                            onClick={() => setIsFullscreen(false)}
                            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer z-50"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="relative max-w-5xl max-h-[85vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            <img
                                src={resolveMediaUrl(images[activeImage])}
                                alt={property.name}
                                className="max-w-full max-h-[80vh] rounded-3xl object-contain shadow-2xl"
                            />

                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setActiveImage(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                                        className="absolute left-4 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveImage(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                                        className="absolute right-4 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all cursor-pointer"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
