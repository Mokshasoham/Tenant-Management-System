import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService, bookingService } from '../services/api';
import { Helmet } from 'react-helmet-async';
import {
    MapPin, IndianRupee, Bed, Bath, Square,
    ArrowLeft, Shield, CheckCircle2, Star,
    Calendar, User, Home, Building2, Zap,
    Wifi, Car, Droplets, Wind, Info, MessageSquare,
    ChevronRight, ArrowRight, Wallet, Hammer, Video
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getDisplayStatus } from '../utils/propertyHelper';
import RazorpayPayment from '../components/RazorpayPayment';


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

    const [existingBooking, setExistingBooking] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [showRazorpay, setShowRazorpay] = useState(false);

    // Initialize date locks 1 month out by default
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const [endDate, setEndDate] = useState(nextMonth.toISOString().split('T')[0]);


    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await propertyService.getPropertyById(id);
                const prop = res.data;
                setProperty(prop);

                const activeLease = prop?.leases?.find(l => l && l.status === 'active');
                if (activeLease && new Date(activeLease.endDate) > new Date()) {
                    const nextAvail = new Date(new Date(activeLease.endDate).getTime() + 24 * 60 * 60 * 1000);
                    setStartDate(nextAvail.toISOString().split('T')[0]);
                    const end = new Date(nextAvail);
                    end.setMonth(end.getMonth() + 1);
                    setEndDate(end.toISOString().split('T')[0]);
                }

                // Fetch similar properties
                const similarRes = await propertyService.getSimilarProperties(id);
                setSimilarProperties(similarRes.data);

                // Check for existing booking
                try {
                    const myBookings = await bookingService.getMyBookings();
                    const current = myBookings.data.find(b => b.property?._id === id && b.status === 'pending');
                    setExistingBooking(current);
                } catch (err) {
                    console.log('User not logged in or failed to fetch bookings');
                }
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
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    if (!property) return (
        <div className="text-center py-20 bg-card border border-border rounded-[2.5rem] shadow-sm">
            <h2 className="text-2xl font-black text-foreground">Property not found</h2>
            <button onClick={() => navigate('/browse')} className="mt-4 text-blue-400 font-bold flex items-center gap-2 mx-auto">
                <ArrowLeft className="w-4 h-4" /> Back to listings
            </button>
        </div>
    );

    const activeLease = property?.leases?.find(l => l && l.status === 'active');
    const minAvailableDate = activeLease && new Date(activeLease.endDate) > new Date()
        ? new Date(new Date(activeLease.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    const displayStatus = getDisplayStatus(property);
    const isSoldOut = displayStatus === 'Sold Out';
    const isUnderMaintenance = displayStatus === 'Under Maintenance';
    const isNotBookable = isSoldOut || isUnderMaintenance;

    return (
        <div className="space-y-8 pb-20">
            <Helmet>
                <title>{property.seo?.title || property.name} - Tenant Management</title>
                <meta name="description" content={property.seo?.description || property.description?.substring(0, 160)} />
                <meta name="keywords" content={property.seo?.keywords || property.tags?.join(', ')} />
                {/* OpenGraph */}
                <meta property="og:title" content={property.openGraph?.title || property.name} />
                <meta property="og:description" content={property.openGraph?.description || property.description?.substring(0, 160)} />
                <meta property="og:image" content={property.openGraph?.image || property.images?.[0]} />
                <meta property="og:type" content="website" />
            </Helmet>

            {/* Nav & Back */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/browse')}
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-all font-bold shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to listings
                </button>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-all shadow-sm">
                        <Star className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-all shadow-sm">
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
                            className="aspect-video rounded-[2.5rem] bg-muted border border-border overflow-hidden relative shadow-2xl shadow-primary/5 transition-colors"
                        >
                            {property.images?.[activeImage] ? (
                                <img src={property.images[activeImage]} className="w-full h-full object-cover" alt={property.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent text-muted-foreground/20">
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
                                            activeImage === i ? "border-primary" : "border-border shadow-sm"
                                        )}
                                    >
                                        <img src={img} className="w-full h-full object-cover rounded-xl" alt="" />
                                    </button>
                                ))}
                                {property.virtualTourUrl && (
                                    <a
                                        href={property.virtualTourUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-24 h-24 rounded-2xl flex-shrink-0 border-2 border-border border-dashed flex flex-col items-center justify-center p-2 text-primary hover:bg-primary/5 transition-colors gap-1 shadow-sm"
                                    >
                                        <Video className="w-6 h-6" />
                                        <span className="text-[9px] font-black uppercase text-center leading-tight">3D Tour</span>
                                    </a>
                                )}
                            </div>
                        )}
                        {/* Fallback if only 1 image but tour exists */}
                        {(!property.images || property.images.length <= 1) && property.virtualTourUrl && (
                             <a
                                href={property.virtualTourUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-max px-4 py-2 mt-4 rounded-xl border-2 border-primary/20 bg-primary/5 flex items-center justify-center text-primary font-bold transition-colors gap-2 shadow-sm"
                            >
                                <Video className="w-4 h-4" />
                                <span className="text-xs uppercase tracking-widest">View 3D Tour</span>
                            </a>
                        )}
                    </div>

                    {/* Property Intel */}
                    <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-sm space-y-8 transition-colors">
                        <div className="flex flex-wrap items-start justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                        {property.type}
                                    </span>
                                    {displayStatus && (
                                        <span className={cn(
                                            "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                                            displayStatus === 'Available' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                            displayStatus.startsWith('Available from') ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                                            displayStatus === 'Under Maintenance' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                            "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                        )}>
                                            {displayStatus}
                                        </span>
                                    )}
                                    {property.rentAmount < 20000 && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                            <Zap className="w-3 h-3" /> Best Value
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-4xl font-black text-foreground">{property.name}</h1>
                                <p className="text-muted-foreground flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-rose-500" /> {property.city}, {property.address}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-4xl font-black text-foreground">₹{property.rentAmount?.toLocaleString('en-IN')}</p>
                                <p className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">Per Month + ₹{property.depositAmount?.toLocaleString('en-IN')} Deposit</p>
                            </div>
                        </div>

                        {/* Quick Specs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Bedrooms', value: property.bedrooms, icon: Bed, color: 'text-primary', bg: 'bg-primary/10' },
                                { label: 'Bathrooms', value: property.bathrooms, icon: Bath, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                { label: 'Square Ft', value: property.squareFeet, icon: Square, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                { label: 'Security', value: '24/7', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-500/10' }
                            ].map((spec, i) => (
                                <div key={i} className="p-4 rounded-3xl bg-muted border border-border/50 space-y-1">
                                    <spec.icon className={cn("w-5 h-5", spec.color)} />
                                    <p className="text-foreground font-black">{spec.value}</p>
                                    <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">{spec.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-foreground">Description</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {property.description || "This stunning property offers modern living in a prime location. Well-maintained with all essential amenities, it's perfect for those seeking comfort and style."}
                            </p>
                        </div>

                        {/* Calendar Dates */}
                        {property.bookedDates?.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-black text-foreground flex items-center gap-2"><Calendar className="w-5 h-5 text-primary"/> Availability Calendar</h3>
                                <div className="flex flex-wrap gap-2">
                                    {property.bookedDates.map((block, idx) => (
                                        <div key={idx} className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-500 text-xs font-bold flex flex-col gap-0.5">
                                            <span className="text-[9px] uppercase tracking-widest opacity-60">Booked</span>
                                            {new Date(block.startDate).toLocaleDateString()} - {new Date(block.endDate).toLocaleDateString()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amenities */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-foreground">Amenities</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(property.amenities?.length ? property.amenities : ['Parking', 'Wifi', 'Gym', 'Laundry']).map(am => {
                                    const Icon = AMENITY_ICONS[am] || CheckCircle2;
                                    return (
                                        <div key={am} className="flex items-center gap-3 p-3 rounded-2xl bg-muted border border-border/50">
                                            <div className="p-2 rounded-xl bg-card shadow-inner">
                                                <Icon className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="text-xs font-black text-muted-foreground/70">{am}</span>
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
                    <div className="sticky top-8 p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-700 dark:from-indigo-900 dark:to-blue-950 shadow-2xl shadow-primary/20 border border-white/10 space-y-6">
                        <div>
                            <h3 className="text-2xl font-black text-white">
                                {property.bookingType === 'free' ? 'Request Demo Booking' : 'Book this place'}
                            </h3>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-wider">
                                {property.bookingType === 'free' ? 'No payment required • Instant request' : 'Fast approval • Secure payments'}
                            </p>
                        </div>

                        {property.bookingType === 'free' ? (
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                                <p className="text-sm font-black text-white text-center">
                                    Available for <br />
                                    <span className="text-emerald-300 text-lg uppercase tracking-widest">Free Demo Booking</span>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Monthly Cost</p>
                                    <div className="flex items-baseline justify-between">
                                        <p className="text-2xl font-black text-white">₹{property.rentAmount?.toLocaleString('en-IN')}</p>
                                        <p className="text-xs text-white/60 font-medium">+ utilities</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Deposit</p>
                                    <p className="text-xl font-black text-white">₹{property.depositAmount?.toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        )}

                        {/* Booking Schedule Selector */}
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    min={minAvailableDate}
                                    disabled={isNotBookable}
                                    className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate || minAvailableDate}
                                    disabled={isNotBookable}
                                    className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>

                        <button
                            disabled={!!existingBooking || bookingLoading || isNotBookable}
                            onClick={async () => {
                                setBookingLoading(true);
                                try {
                                    await bookingService.requestBooking({
                                        propertyId: id,
                                        startDate: new Date(startDate).toISOString(),
                                        endDate: new Date(endDate).toISOString(),
                                        totalAmount: property.rentAmount,
                                        paymentReference: property.bookingType === 'free' ? 'FREE-BOOKING' : 'PENDING'
                                    });
                                    // Navigate to a success or status page
                                    navigate('/dashboard');
                                } catch (err) {
                                    alert('Failed to request booking. Please try again.');
                                } finally {
                                    setBookingLoading(false);
                                }
                            }}
                            className={cn(
                                "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-black/10",
                                (existingBooking || isNotBookable) ? "bg-white/20 text-white/40 cursor-not-allowed" : "bg-white text-primary hover:scale-[1.02] active:scale-[0.98]"
                            )}
                        >
                            <Wallet className="w-5 h-5" />
                            {bookingLoading ? 'Processing...' : 
                             isSoldOut ? 'Sold Out' : 
                             isUnderMaintenance ? 'Under Maintenance' :
                             existingBooking ? 'Request Pending' : 
                             (property.bookingType === 'free' ? 'Request for Free' : 'Proceed to Book')}
                        </button>


                        <p className="text-center text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">
                            {property.bookingType === 'free' ? 'No Credit Card Needed' : '100% Secure Transaction'}
                        </p>
                    </div>

                    {/* Manager Profile */}
                    <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                                {property.manager?.firstName?.[0] || 'A'}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground">{property.manager?.firstName} {property.manager?.lastName}</h3>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black w-fit mt-1 uppercase tracking-widest">
                                    <Shield className="w-3 h-3" /> VERIFIED MANAGER
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleChat}
                            className="w-full py-3.5 rounded-2xl bg-muted border border-border text-foreground font-black hover:bg-muted/80 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-4 h-4 text-primary" /> Chat with Manager
                        </button>
                    </div>

                    {/* Social Proof */}
                    <div className="p-6 rounded-[2.5rem] bg-card border border-border shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                        {['JD', 'SK', 'AL'][i - 1]}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs font-black text-muted-foreground/60 uppercase tracking-widest">
                                <span className="text-primary">12 others</span> viewed today
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Zap className="w-3 h-3" /> High Demand Property
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
                <div className="space-y-6 pt-12 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-foreground">Similar Properties</h2>
                            <p className="text-xs text-muted-foreground/40 font-black uppercase tracking-widest mt-1">Handpicked for you in {property.city}</p>
                        </div>
                        <button onClick={() => navigate('/browse')} className="text-xs font-black text-primary hover:text-primary/80 flex items-center gap-2 uppercase tracking-widest">
                            View all <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {similarProperties.map((p) => (
                            <motion.div
                                key={p._id}
                                whileHover={{ y: -8 }}
                                onClick={() => {
                                    navigate(`/properties/${p._id}`);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="group cursor-pointer rounded-3xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-xl transition-all"
                            >
                                <div className="aspect-[4/3] overflow-hidden relative">
                                    <img
                                        src={p.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'}
                                        alt={p.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md text-[10px] font-black text-primary shadow-lg uppercase tracking-widest">
                                        ₹{p.rentAmount?.toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className="p-5 space-y-3">
                                    <h3 className="font-black text-foreground truncate">{p.name}</h3>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><Bed className="w-3 h-3" /> {p.bedrooms}</span>
                                        <span className="flex items-center gap-1.5"><Bath className="w-3 h-3" /> {p.bathrooms}</span>
                                        <span className="flex items-center gap-1.5"><Square className="w-3 h-3" /> {p.size} sqft</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Razorpay Escrow Component decoupled to User Dashboard explicitly */}
        </div>
    );
}
