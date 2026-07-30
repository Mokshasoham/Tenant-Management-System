import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService, bookingService, visitService } from '../services/api';
import { Helmet } from 'react-helmet-async';
import {
    MapPin, IndianRupee, Bed, Bath, Square,
    ArrowLeft, Shield, CheckCircle2, Star,
    Calendar, User, Home, Building2, Zap,
    Wifi, Car, Droplets, Wind, Info, MessageSquare,
    ChevronRight, ArrowRight, Wallet, Hammer, Video, XCircle, AlertTriangle
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
    const location = useLocation();
    const [property, setProperty] = useState(null);
    const [similarProperties, setSimilarProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    const [existingBooking, setExistingBooking] = useState(null);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [showRazorpay, setShowRazorpay] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState('');

    const [activeBookingTab, setActiveBookingTab] = useState(location.state?.activeBookingTab || 'book');
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [visitSlot, setVisitSlot] = useState('10:00 AM - 11:00 AM');
    const [visitLoading, setVisitLoading] = useState(false);
    const [visitSuccess, setVisitSuccess] = useState(false);
    const [visitError, setVisitError] = useState('');
    const [existingVisit, setExistingVisit] = useState(null);

    // Feedback review states
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackCondition, setFeedbackCondition] = useState(5);
    const [feedbackManager, setFeedbackManager] = useState(5);
    const [feedbackCleanliness, setFeedbackCleanliness] = useState(5);
    const [feedbackLocation, setFeedbackLocation] = useState(5);
    const [feedbackComments, setFeedbackComments] = useState('');
    const [feedbackRecommend, setFeedbackRecommend] = useState(true);
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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

                // Check for existing visit request
                try {
                    const myVisitsRes = await visitService.getMyVisits();
                    const currentVisit = myVisitsRes.data.find(v => v.property?._id === id);
                    setExistingVisit(currentVisit);
                } catch (err) {
                    console.log('User not logged in or failed to fetch visits');
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
        <div className="max-w-md mx-auto my-20 p-8 rounded-[2.5rem] bg-card/60 backdrop-blur-sm border border-border/80 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-foreground">This record is no longer available</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
                The property you are trying to view does not exist or has been removed.
            </p>
            <div className="flex gap-3 justify-center pt-2">
                <button
                    onClick={() => navigate('/browse')}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                    View Listings
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-xs font-black uppercase tracking-wider transition-all hover:bg-white/10"
                >
                    Dashboard
                </button>
            </div>
        </div>
    );

    const activeLease = property?.activeLease || property?.leases?.find(l => l && l.status === 'active');
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

                        {/* Option Tab Selector */}
                        <div className="grid grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/10">
                            <button
                                type="button"
                                onClick={() => setActiveBookingTab('book')}
                                className={cn(
                                    "py-2 text-[10px] uppercase tracking-wider font-black rounded-lg transition-all",
                                    activeBookingTab === 'book' ? "bg-white text-indigo-900 shadow-sm" : "text-white/60 hover:text-white"
                                )}
                            >
                                Proceed to Book
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveBookingTab('visit')}
                                className={cn(
                                    "py-2 text-[10px] uppercase tracking-wider font-black rounded-lg transition-all",
                                    activeBookingTab === 'visit' ? "bg-white text-indigo-900 shadow-sm" : "text-white/60 hover:text-white"
                                )}
                            >
                                Request Visit
                            </button>
                        </div>

                        {activeBookingTab === 'book' ? (
                            <>
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

                                {bookingSuccess && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold space-y-1">
                                        <p className="flex items-center gap-1.5 font-black uppercase tracking-wider">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Request Sent!
                                        </p>
                                        <p className="text-[10px] text-emerald-300/80 leading-relaxed font-medium">
                                            Booking request has been sent to the manager. Please wait for approval.
                                        </p>
                                    </div>
                                )}

                                {bookingError && (
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold space-y-1">
                                        <p className="flex items-center gap-1.5 font-black uppercase tracking-wider">
                                            <XCircle className="w-4 h-4 text-rose-400" /> Request Failed
                                        </p>
                                        <p className="text-[10px] text-rose-300/80 leading-relaxed font-medium">
                                            {bookingError}
                                        </p>
                                    </div>
                                )}

                                <button
                                    disabled={!!existingBooking || bookingLoading || isNotBookable}
                                    onClick={async () => {
                                        setBookingLoading(true);
                                        setBookingSuccess(false);
                                        setBookingError('');
                                        try {
                                            const res = await bookingService.requestBooking({
                                                propertyId: id,
                                                startDate: new Date(startDate).toISOString(),
                                                endDate: new Date(endDate).toISOString(),
                                                totalAmount: property.rentAmount,
                                                paymentReference: property.bookingType === 'free' ? 'FREE-BOOKING' : 'PENDING'
                                            });
                                            setBookingSuccess(true);
                                            // Update the existing booking state on the page immediately with the returned booking details
                                            setExistingBooking(res.data?.booking || res.data || { status: 'pending' });
                                        } catch (err) {
                                            setBookingError(err.response?.data?.message || 'Failed to request booking. Please try again.');
                                        } finally {
                                            setBookingLoading(false);
                                        }
                                    }}
                                    className={cn(
                                        "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-black/10",
                                        (existingBooking || isNotBookable || bookingLoading) ? "bg-white/20 text-white/40 cursor-not-allowed" : "bg-white text-primary hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                >
                                    <Wallet className="w-5 h-5" />
                                    {bookingLoading ? 'Sending request to manager...' : 
                                     isSoldOut ? 'Sold Out' : 
                                     isUnderMaintenance ? 'Under Maintenance' :
                                     existingBooking ? 'Request Pending' : 
                                     (property.bookingType === 'free' ? 'Request for Free' : 'Proceed to Book')}
                                </button>
                            </>
                        ) : (
                            /* Request Visit tab */
                            <div className="space-y-4 text-white">
                                {!existingVisit ? (
                                    <>
                                        <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-3">
                                            <p className="text-xs font-bold text-white/80">Schedule an Inspection Visit</p>
                                            
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40">Select Date</label>
                                                <input
                                                    type="date"
                                                    value={visitDate}
                                                    onChange={(e) => setVisitDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs"
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/40">Select Time Slot</label>
                                                <select
                                                    value={visitSlot}
                                                    onChange={(e) => setVisitSlot(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white font-bold text-xs"
                                                >
                                                    {['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM'].map(slot => (
                                                        <option key={slot} value={slot}>{slot}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {visitSuccess && (
                                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                                                <p className="flex items-center gap-1.5 font-black uppercase tracking-wider">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Visit Requested!
                                                </p>
                                                <p className="text-[10px] text-emerald-300/80 leading-relaxed font-medium mt-1">
                                                    Visit request has been sent to the manager. Please wait for approval.
                                                </p>
                                            </div>
                                        )}

                                        {visitError && (
                                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold">
                                                <p className="flex items-center gap-1.5 font-black uppercase tracking-wider">
                                                    <XCircle className="w-4 h-4 text-rose-400" /> Visit Request Failed
                                                </p>
                                                <p className="text-[10px] text-rose-300/80 leading-relaxed font-medium mt-1">
                                                    {visitError}
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            disabled={visitLoading}
                                            onClick={async () => {
                                                setVisitLoading(true);
                                                setVisitSuccess(false);
                                                setVisitError('');
                                                try {
                                                    const res = await visitService.requestVisit({
                                                        propertyId: id,
                                                        visitDate,
                                                        timeSlot: visitSlot
                                                    });
                                                    setVisitSuccess(true);
                                                    setExistingVisit(res.data);
                                                } catch (err) {
                                                    setVisitError(err.response?.data?.message || 'Failed to submit visit request. Please try again.');
                                                } finally {
                                                    setVisitLoading(false);
                                                }
                                            }}
                                            className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 bg-white text-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                                        >
                                            <Calendar className="w-5 h-5 text-primary" />
                                            {visitLoading ? 'Sending request to manager...' : 'Request Property Visit'}
                                        </button>
                                    </>
                                ) : (
                                    /* Handle existing visit statuses */
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-2">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-black uppercase tracking-wider text-white/80">Visit Request Details</p>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                                    existingVisit.status === 'approved' && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                                                    existingVisit.status === 'pending' && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                                                    existingVisit.status === 'completed' && "bg-blue-500/20 text-blue-300 border border-blue-500/30",
                                                    existingVisit.status === 'rejected' && "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                                )}>
                                                    {existingVisit.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/70">
                                                Scheduled Date: <span className="font-bold text-white">{new Date(existingVisit.visitDate).toLocaleDateString()}</span>
                                            </p>
                                            <p className="text-xs text-white/70">
                                                Time Slot: <span className="font-bold text-white">{existingVisit.timeSlot}</span>
                                            </p>
                                        </div>

                                        {existingVisit.status === 'pending' && (
                                            <p className="text-[10px] text-center text-white/60 italic">
                                                Visit is pending manager review. You will be notified once approved or rescheduled.
                                            </p>
                                        )}

                                        {existingVisit.status === 'approved' && (
                                            <p className="text-[10px] text-center text-white/60 italic">
                                                Visit is scheduled! You can meet the manager at the property on the scheduled slot.
                                            </p>
                                        )}

                                        {existingVisit.status === 'completed' && (
                                            /* Review is mandatory to complete visit workflow */
                                            (!existingVisit.feedback || !existingVisit.feedback.submittedAt) ? (
                                                <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-4 text-xs">
                                                    <div className="border-b border-white/10 pb-2">
                                                        <p className="font-black text-indigo-300 uppercase tracking-wider text-[10px]">Mandatory Visit Review</p>
                                                        <p className="text-[9px] text-white/60">Please share your experience to complete the visit request.</p>
                                                    </div>

                                                    {/* Star ratings selector block */}
                                                    <div className="space-y-3">
                                                        {[
                                                            { label: 'Overall Experience', val: feedbackRating, setVal: setFeedbackRating },
                                                            { label: 'Property Condition', val: feedbackCondition, setVal: setFeedbackCondition },
                                                            { label: 'Manager Experience', val: feedbackManager, setVal: setFeedbackManager },
                                                            { label: 'Cleanliness', val: feedbackCleanliness, setVal: setFeedbackCleanliness },
                                                            { label: 'Location Satisfaction', val: feedbackLocation, setVal: setFeedbackLocation }
                                                        ].map(item => (
                                                            <div key={item.label} className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-white/80">{item.label}</span>
                                                                <div className="flex gap-1">
                                                                    {[1, 2, 3, 4, 5].map(star => (
                                                                        <button
                                                                            type="button"
                                                                            key={star}
                                                                            onClick={() => item.setVal(star)}
                                                                            className="focus:outline-none"
                                                                        >
                                                                            <Star className={cn(
                                                                                "w-3.5 h-3.5 transition-colors",
                                                                                star <= item.val ? "text-amber-400 fill-amber-400" : "text-white/20"
                                                                            )} />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-white/40">Comments & Suggestions</label>
                                                        <textarea
                                                            rows={3}
                                                            value={feedbackComments}
                                                            onChange={(e) => setFeedbackComments(e.target.value)}
                                                            placeholder="Describe the visit experience..."
                                                            className="w-full p-2.5 rounded-xl bg-black border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                        <span className="text-[10px] font-bold text-white/80">Would you recommend this property?</span>
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setFeedbackRecommend(true)}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                                                    feedbackRecommend ? "bg-emerald-500 text-white" : "bg-white/5 text-white/60"
                                                                )}
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFeedbackRecommend(false)}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                                                    !feedbackRecommend ? "bg-rose-500 text-white" : "bg-white/5 text-white/60"
                                                                )}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={feedbackSubmitting}
                                                        onClick={async () => {
                                                            setFeedbackSubmitting(true);
                                                            try {
                                                                const res = await visitService.submitFeedback(existingVisit._id, {
                                                                    rating: feedbackRating,
                                                                    propertyCondition: feedbackCondition,
                                                                    managerExperience: feedbackManager,
                                                                    cleanliness: feedbackCleanliness,
                                                                    locationSatisfaction: feedbackLocation,
                                                                    comments: feedbackComments,
                                                                    recommend: feedbackRecommend
                                                                });
                                                                setExistingVisit(res.data);
                                                            } catch (err) {
                                                                alert('Failed to submit feedback. Please try again.');
                                                            } finally {
                                                                setFeedbackSubmitting(false);
                                                            }
                                                        }}
                                                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                                    >
                                                        {feedbackSubmitting ? 'Submitting Review...' : 'Submit Review & Complete Visit'}
                                                    </button>
                                                </div>
                                            ) : (
                                                /* Feedback is submitted */
                                                existingVisit.notInterested ? (
                                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                                                        <p className="text-xs font-bold text-white/80">Workflow Closed</p>
                                                        <p className="text-[10px] text-white/50">You have marked this property as not interested. Thank you for your feedback!</p>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md space-y-3">
                                                        <p className="text-xs font-bold text-center text-indigo-300">Visit Review Submitted!</p>
                                                        <p className="text-[10px] text-center text-white/60">Are you interested in proceeding to book this property?</p>
                                                        
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveBookingTab('book')}
                                                                className="flex-1 py-2.5 rounded-xl bg-white text-primary text-xs font-black uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                            >
                                                                Proceed to Book
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await visitService.setNotInterested(existingVisit._id);
                                                                        setExistingVisit(res.data);
                                                                    } catch (err) {
                                                                        alert('Failed to update status. Please try again.');
                                                                    }
                                                                }}
                                                                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                            >
                                                                Not Interested
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

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
