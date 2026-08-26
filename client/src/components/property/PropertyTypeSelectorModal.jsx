import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Building2, Home, Store, Building, KeyRound,
    Check, ArrowRight, Sparkles, Layers, ShieldCheck
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const PROPERTY_TYPE_OPTIONS = [
    {
        id: 'apartment',
        title: 'Apartment / Flat',
        tag: 'Residential Unit',
        description: 'BHK apartments, flats and residential units',
        icon: Building2,
        color: 'from-emerald-500/20 to-teal-500/10',
        activeBorder: 'border-emerald-500',
        activeText: 'text-emerald-500',
        activeBg: 'bg-emerald-500/10',
        badges: ['BHK Layouts', 'Balcony', 'Floor Level', 'Parking']
    },
    {
        id: 'house',
        title: 'House / Villa',
        tag: 'Independent Home',
        description: 'Independent houses, villas and residential homes',
        icon: Home,
        color: 'from-amber-500/20 to-orange-500/10',
        activeBorder: 'border-amber-500',
        activeText: 'text-amber-500',
        activeBg: 'bg-amber-500/10',
        badges: ['Private Floors', 'Built-up Area', 'Garden / Outdoor', 'Driveway']
    },
    {
        id: 'commercial',
        title: 'Shop / Commercial',
        tag: 'Commercial Space',
        description: 'Retail shops and commercial spaces',
        icon: Store,
        color: 'from-blue-500/20 to-cyan-500/10',
        activeBorder: 'border-blue-500',
        activeText: 'text-blue-500',
        activeBg: 'bg-blue-500/10',
        badges: ['Commercial Sqft', 'Shop Frontage', '3-Phase Power', 'Business Fit']
    },
    {
        id: 'hostel',
        title: 'Hostel',
        tag: 'Shared Living',
        description: 'Shared accommodation and hostel properties',
        icon: Building,
        color: 'from-purple-500/20 to-indigo-500/10',
        activeBorder: 'border-purple-500',
        activeText: 'text-purple-500',
        activeBg: 'bg-purple-500/10',
        badges: ['Bed Capacity', 'Mess / Food', 'AC / Non-AC', 'Common Study']
    },
    {
        id: 'pg',
        title: 'PG / Paying Guest',
        tag: 'Co-Living Rental',
        description: 'Paying guest and shared rental accommodation',
        icon: KeyRound,
        color: 'from-rose-500/20 to-pink-500/10',
        activeBorder: 'border-rose-500',
        activeText: 'text-rose-500',
        activeBg: 'bg-rose-500/10',
        badges: ['Sharing Basis', 'Attached Bath', 'Food & WiFi', 'Housekeeping']
    }
];

export default function PropertyTypeSelectorModal({ isOpen, onClose, onSelectType }) {
    const [selectedType, setSelectedType] = useState(null);

    if (!isOpen) return null;

    const handleContinue = () => {
        if (!selectedType) return;
        onSelectType(selectedType);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2.5rem] border border-border bg-card shadow-2xl overflow-hidden backdrop-blur-xl"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-border/70 bg-muted/30">
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">
                                    Step 1 of 2 · Category Setup
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                What type of property are you adding?
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                Choose a property type to get a tailored listing experience.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Property Types Grid */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PROPERTY_TYPE_OPTIONS.map((opt) => {
                            const IconComponent = opt.icon;
                            const isSelected = selectedType === opt.id;

                            return (
                                <motion.div
                                    key={opt.id}
                                    whileHover={{ y: -3 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedType(opt.id)}
                                    className={cn(
                                        "relative rounded-3xl p-5 sm:p-6 border transition-all cursor-pointer flex flex-col justify-between select-none",
                                        isSelected
                                            ? `${opt.activeBorder} ${opt.activeBg} ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10`
                                            : "border-border/80 bg-card/60 hover:bg-muted/40 hover:border-border"
                                    )}
                                >
                                    {/* Selection Indicator Checkmark */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors border shadow-inner",
                                            isSelected
                                                ? `${opt.activeBg} ${opt.activeText} ${opt.activeBorder}`
                                                : "bg-muted text-muted-foreground border-border"
                                        )}>
                                            <IconComponent className="w-6 h-6" />
                                        </div>

                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center transition-all border",
                                            isSelected
                                                ? "bg-emerald-500 text-white border-emerald-500 scale-110 shadow-sm"
                                                : "border-border/80 bg-muted/40 text-transparent"
                                        )}>
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground/80 border border-border/60">
                                                {opt.tag}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-black text-foreground tracking-tight">
                                            {opt.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {opt.description}
                                        </p>
                                    </div>

                                    {/* Feature Pills */}
                                    <div className="flex flex-wrap gap-1.5 pt-4 mt-3 border-t border-border/50">
                                        {opt.badges.map((b) => (
                                            <span
                                                key={b}
                                                className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-muted/80 text-muted-foreground/70 border border-border/40"
                                            >
                                                {b}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-border bg-muted/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleContinue}
                        disabled={!selectedType}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-lg cursor-pointer",
                            selectedType
                                ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20 active:scale-95"
                                : "bg-muted-foreground/20 text-muted-foreground/40 cursor-not-allowed shadow-none"
                        )}
                    >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
