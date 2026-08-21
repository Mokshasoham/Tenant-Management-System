import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitch({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <label 
      className={`ui-switch ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle light and dark theme"
    >
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        aria-label="Toggle light and dark theme"
      />
      <div className="slider">
        <div className="circle">
          {isDark ? (
            <svg 
              className="w-4 h-4 text-white fill-white pointer-events-none transition-transform duration-200" 
              viewBox="0 0 24 24"
            >
              {/* Star */}
              <path d="M6 3 L7 5 L9 6 L7 7 L6 9 L5 7 L3 6 L5 5 Z" fill="white" />
              {/* Crescent Moon */}
              <path d="M12.3 4.5 C10.5 6.2 9.5 8.6 9.5 11.2 C9.5 16.3 13.7 20.5 18.8 20.5 C19.9 20.5 20.9 20.3 21.8 19.9 C20.3 21.8 18 23 15.5 23 C10.2 23 6 18.8 6 13.5 C6 9.3 8.7 5.7 12.3 4.5 Z" fill="white" />
            </svg>
          ) : (
            <svg 
              className="w-4 h-4 text-white fill-none stroke-white stroke-[2.2] pointer-events-none transition-transform duration-200" 
              viewBox="0 0 24 24"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          )}
        </div>
      </div>
    </label>
  );
}
