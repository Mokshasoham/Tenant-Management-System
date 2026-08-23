import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, Check, ArrowRight, Sparkles, X } from 'lucide-react';
import { cn } from '../utils/cn';

const ROLES = [
  {
    id: 'tenant',
    title: 'TENANT',
    tagline: 'Find, rent and manage your home.',
    icon: Home,
    accent: 'emerald',
    badge: 'Resident & Renter',
    features: [
      'Browse verified properties',
      'Save & compare properties',
      'Book properties & reserve units',
      'Manage lease agreements & e-signatures',
      'Pay rent securely with auto-pay & UPI',
      'Raise & track maintenance requests',
    ],
    buttonText: 'CONTINUE AS TENANT',
    buttonGradient: 'from-emerald-500 via-teal-600 to-emerald-600',
    buttonShadow: 'shadow-emerald-500/25 hover:shadow-emerald-500/40',
    borderActive: 'border-emerald-500 ring-2 ring-emerald-500/30',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  },
  {
    id: 'manager',
    title: 'PROPERTY MANAGER',
    tagline: 'Manage properties, tenants and rentals.',
    icon: Building2,
    accent: 'blue',
    badge: 'Owner & Operator',
    features: [
      'List & market rental properties',
      'Manage tenants & applications',
      'Draft, generate & counter-sign leases',
      'Track rent collections & financial analytics',
      'Handle maintenance workflows & specialists',
      'Communicate directly with tenants',
    ],
    buttonText: 'CONTINUE AS MANAGER',
    buttonGradient: 'from-blue-600 via-indigo-600 to-blue-700',
    buttonShadow: 'shadow-blue-500/25 hover:shadow-blue-500/40',
    borderActive: 'border-blue-500 ring-2 ring-blue-500/30',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
  },
];

export function RoleSelectionCards({ selectedRole, onSelectRole, onConfirm, isLoading }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Account Setup</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          How do you want to use TMS?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
          Choose your primary role. You will get dedicated features and dashboard tailored for your needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;

          return (
            <motion.div
              key={role.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelectRole(role.id)}
              className={cn(
                "p-6 sm:p-7 rounded-3xl border text-left cursor-pointer transition-all duration-300 relative flex flex-col justify-between group",
                isSelected
                  ? cn("bg-white dark:bg-[#0E1A33] shadow-2xl", role.borderActive)
                  : "bg-slate-50/80 dark:bg-[#070E1C]/80 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
              )}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", role.iconBg)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      {role.badge}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {role.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                  "{role.tagline}"
                </p>

                <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Included Features:
                  </span>
                  <ul className="space-y-1.5">
                    {role.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="font-medium text-[11px] leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRole(role.id);
                    if (onConfirm) onConfirm(role.id);
                  }}
                  className={cn(
                    "w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
                    "bg-gradient-to-r",
                    role.buttonGradient,
                    role.buttonShadow,
                    isSelected ? "ring-2 ring-white/40 scale-[1.02]" : "opacity-90 hover:opacity-100"
                  )}
                >
                  <span>{isLoading && isSelected ? 'SETTING UP...' : role.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function RoleSelectionModal({ isOpen, onClose, onSelectAndProceed, isLoading, userProfile }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="w-full max-w-3xl relative z-10 my-8 p-6 sm:p-10 rounded-[2.5rem] bg-white dark:bg-[#0B1424] border border-slate-200 dark:border-emerald-500/25 shadow-2xl overflow-hidden text-slate-900 dark:text-white transition-colors duration-300"
        >
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {userProfile && (
            <div className="mb-4 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Signed in as <span className="font-bold text-slate-800 dark:text-slate-200">{userProfile.email}</span>
              </span>
            </div>
          )}

          <RoleSelectionCards
            selectedRole={null}
            onSelectRole={(role) => onSelectAndProceed(role)}
            onConfirm={(role) => onSelectAndProceed(role)}
            isLoading={isLoading}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
