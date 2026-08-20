import React from 'react';
import { Compass, ArrowRight, MapPin } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export default function TopNearbyPlacesCTA({ onExploreClick }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = (e) => {
    e.preventDefault();
    if (onExploreClick) {
      onExploreClick();
    } else {
      const target = document.getElementById('explore-nearby-places');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-4 sm:p-5 overflow-hidden transition-all duration-200 shadow-xs",
        isDark
          ? "bg-[#09111E] border-slate-800/80 hover:border-slate-700/90 text-white"
          : "bg-[#F8FAFC] border-slate-200 hover:border-slate-300 text-slate-900"
      )}
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon + Content */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
              isDark
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}
          >
            <Compass className="w-5 h-5 stroke-[2]" />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-bold tracking-[0.18em] uppercase",
                  isDark ? "text-emerald-400" : "text-emerald-700"
                )}
              >
                ✦ EXPLORE THE NEIGHBORHOOD
              </span>
            </div>

            <h4
              className={cn(
                "text-sm sm:text-base font-bold tracking-tight truncate",
                isDark ? "text-slate-100" : "text-slate-900"
              )}
            >
              What's around this property?
            </h4>

            <p
              className={cn(
                "text-xs leading-relaxed max-w-xl font-normal",
                isDark ? "text-slate-400" : "text-slate-500"
              )}
            >
              Discover nearby transit, hospitals, shopping, restaurants and everyday essentials.
            </p>
          </div>
        </div>

        {/* Right: CTA Action Button */}
        <button
          type="button"
          onClick={handleClick}
          aria-label="Explore nearby places around this property"
          className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer shrink-0 group shadow-xs",
            isDark
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          )}
        >
          <span>Explore Nearby</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
