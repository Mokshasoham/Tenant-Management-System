import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../services/api';
import {
    MapPin, IndianRupee, Bed, Bath, Square,
    ArrowLeft, Shield, CheckCircle2, Star,
    Calendar, User, Home, Building2, Zap,
    Wifi, Car, Droplets, Wind, Info, MessageSquare,
    ChevronRight, ArrowRight, Wallet, Hammer
} from 'lucide-react';
import { cn } from '../utils/cn';

const AMENITY_ICONS = {
    'Parking': Car,
    'Wifi': Wifi,
    'Pool': Droplets,
    'Gym': Shield,
    'Laundry': Wind,
    'AC': Zap,
    'Furnished': Home,
    'Maintenance': Hammer
};

export default function PropertyDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [similarProperties, setSimilarProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await propertyService.getPropertyById(id);
                setProperty(res.data);

                // Fetch similar properties
                const similarRes = await propertyService.getAllProperties({
                    type: res.data.type,
                    city: res.data.city,
                    limit: 3
                });
                setSimilarProperties(similarRes.data.filter(p => p._id !== id));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id]);

    const handleChat = () => {
        // Navigate to messages with context
        navigate('/messages', {
            state: {
                recipientId: property.manager?._id,
                recipientName: property.manager?.firstName + ' ' + property.manager?.lastName,
                subject: `Inquiry about ${property.name}`
            }
        });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    if (!property) return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-white">Property not found</h2>
            <button onClick={() => navigate('/browse')} className="mt-4 text-blue-400 font-bold flex items-center gap-2 mx-auto">
                <ArrowLeft className="w-4 h-4" /> Back to listings
            </button>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Nav & Back */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/browse')}
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to browse
                </button>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
                        <Star className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
                        <Info className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Media & Specs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        <motion.div
                            layoutId="hero-image"
                            className="aspect-video rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden relative shadow-2xl shadow-blue-500/10"
                        >
                            {property.images?.[activeImage] ? (
                                <img src={property.images[activeImage]} className="w-full h-full object-cover" alt={property.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-white/20">
                                    <Building2 className="w-20 h-20" />
                                </div>
                            )}
                        </motion.div>

                        {property.images?.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {property.images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveImage(i)}
                                        className={cn(
                                            "w-24 h-24 rounded-2xl flex-shrink-0 border-2 transition-all p-1 overflow-hidden",
                                            activeImage === i ? "border-blue-500" : "border-white/10"
                                        )}
                                    >
                                        <img src={img} className="w-full h-full object-cover rounded-xl" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Property Intel */}
                    <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-8">
                        <div className="flex flex-wrap items-start justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                        {property.type}
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                        <CheckCircle2 className="w-3 h-3" /> available
                                    </span>
                                    {property.rentAmount < 20000 && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                            <Zap className="w-3 h-3" /> Best Value
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-4xl font-black text-white">{property.name}</h1>
                                <p className="text-white/40 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-rose-400" /> {property.city}, {property.address}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-4xl font-black text-white">₹{property.rentAmount?.toLocaleString('en-IN')}</p>
                                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Per Month + ₹{property.depositAmount?.toLocaleString('en-IN')} Deposit</p>
                            </div>
                        </div>

                        {/* Quick Specs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Bedrooms', value: property.bedrooms, icon: Bed, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                { label: 'Bathrooms', value: property.bathrooms, icon: Bath, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                { label: 'Square Ft', value: property.squareFeet, icon: Square, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                { label: 'Security', value: '24/7', icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10' }
                            ].map((spec, i) => (
                                <div key={i} className="p-4 rounded-3xl bg-white/3 border border-white/5 space-y-1">
                                    <spec.icon className={cn("w-5 h-5", spec.color)} />
                                    <p className="text-white font-black">{spec.value}</p>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{spec.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-white">Description</h3>
                            <p className="text-white/50 leading-relaxed text-sm">
                                {property.description || "This stunning property offers modern living in a prime location. Well-maintained with all essential amenities, it's perfect for those seeking comfort and style."}
                            </p>
                        </div>

                        {/* Amenities */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-white">Amenities</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(property.amenities?.length ? property.amenities : ['Parking', 'Wifi', 'Gym', 'Laundry']).map(am => {
                                    const Icon = AMENITY_ICONS[am] || CheckCircle2;
                                    return (
                                        <div key={am} className="flex items-center gap-3 p-3 rounded-2xl bg-white/3 border border-white/5">
                                            <div className="p-2 rounded-xl bg-white/5 shadow-inner">
                                                <Icon className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <span className="text-xs font-bold text-white/70">{am}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Manager & Booking */}
                <div className="space-y-8">
                    {/* Booking Card */}
                    <div className="sticky top-8 p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/20 border border-white/20 space-y-6">
                        <div>
                            <h3 className="text-2xl font-black text-white">Book this place</h3>
                            <p className="text-white/60 text-xs">Fast approval & secure payments</p>
                        </div>

                        <div className="space-y-3">
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Monthly Cost</p>
                                <div className="flex items-baseline justify-between">
                                    <p className="text-2xl font-black text-white">₹{property.rentAmount?.toLocaleString('en-IN')}</p>
                                    <p className="text-xs text-white/60">+ utilities</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Deposit</p>
                                <p className="text-xl font-black text-white">₹{property.depositAmount?.toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/pay-now', {
                                state: {
                                    amount: property.depositAmount + property.rentAmount,
                                    type: 'booking',
                                    propertyId: property._id,
                                    propertyName: property.name
                                }
                            })}
                            className="w-full py-4 rounded-2xl bg-white text-blue-600 font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-xl shadow-black/10"
                        >
                            <Wallet className="w-5 h-5 outline-none" /> Proceed to Book
                        </button>

                        <p className="text-center text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
                            100% Secure Transaction
                        </p>
                    </div>

                    {/* Manager Profile */}
                    <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                                {property.manager?.firstName?.[0] || 'A'}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">{property.manager?.firstName} {property.manager?.lastName}</h3>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black w-fit mt-1">
                                    <Shield className="w-3 h-3" /> VERIFIED MANAGER
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleChat}
                            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-4 h-4 text-blue-400" /> Chat with Manager
                        </button>
                    </div>

                    {/* Social Proof */}
                    <div className="p-6 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                        {['JD', 'SK', 'AL'][i - 1]}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs font-bold text-white/60">
                                <span className="text-blue-400">12 others</span> viewed this today
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-3 h-3" /> High Demand Property
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
                <div className="space-y-6 pt-12 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-white">Similar Properties</h2>
                        <button onClick={() => navigate('/browse')} className="text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center gap-2">
                            View all <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {similarProperties.map((p, i) => (
                            <motion.div
                                key={p._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={() => {
                                    navigate(`/properties/${p._id}`);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="group cursor-pointer rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-blue-500/50 transition-all"
                            >
                                <div className="aspect-video relative overflow-hidden">
                                    {p.images?.[0] ? (
                                        <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    ) : <div className="w-full h-full bg-blue-500/10" />}
                                    <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase">
                                        ₹{p.rentAmount?.toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">{p.name}</h4>
                                    <p className="text-[10px] text-white/30 truncate mt-1">{p.city}, {p.address}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
