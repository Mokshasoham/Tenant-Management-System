import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import useAuthStore from './authStore';
import { userService } from '../services/api';

const ThemeContext = createContext();

const getStorageKey = (uid) => uid ? `tms:theme:${uid}` : 'tms:theme:guest';

const resolveUserTheme = (currentUser) => {
    const uid = currentUser?._id || currentUser?.userId;
    if (uid) {
        // 1. Authoritative server preference (highest priority)
        if (currentUser?.preferences?.theme && ['light', 'dark'].includes(currentUser.preferences.theme)) {
            return currentUser.preferences.theme;
        }
        // 2. User-scoped local cache
        const cached = localStorage.getItem(getStorageKey(uid));
        if (cached && ['light', 'dark'].includes(cached)) {
            return cached;
        }
        // 3. Default for authenticated user without saved preference
        return 'light';
    }

    // Guest / Unauthenticated:
    const guestCached = localStorage.getItem('tms:theme:guest');
    if (guestCached && ['light', 'dark'].includes(guestCached)) {
        return guestCached;
    }
    return 'light';
};

const applyThemeToDOM = (targetTheme) => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.setAttribute('data-theme', targetTheme);
    if (targetTheme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
};

export function ThemeProvider({ children }) {
    const user = useAuthStore((state) => state.user);
    const setUserPreferences = useAuthStore((state) => state.setUserPreferences);
    const currentUserId = user?._id || user?.userId || null;
    const isFirstMount = useRef(true);

    const [theme, setThemeState] = useState(() => {
        // Scrub any legacy unscoped key so it never leaks across users
        try { localStorage.removeItem('theme'); } catch (_) {}

        // Read initial user from localStorage on first mount if authStore is hydrating
        let initialUser = null;
        try {
            const storedUserStr = localStorage.getItem('user');
            if (storedUserStr) initialUser = JSON.parse(storedUserStr);
        } catch (_) {}

        const initialTheme = resolveUserTheme(initialUser);
        applyThemeToDOM(initialTheme);
        return initialTheme;
    });

    // Re-evaluate theme whenever user identity changes or server preferences update
    useEffect(() => {
        // Scrub legacy global key defensively
        try { localStorage.removeItem('theme'); } catch (_) {}

        const targetTheme = resolveUserTheme(user);
        setThemeState(targetTheme);
        applyThemeToDOM(targetTheme);

        // Keep user-scoped local cache updated with authoritative server preference
        if (currentUserId) {
            localStorage.setItem(getStorageKey(currentUserId), targetTheme);
        } else {
            localStorage.setItem('tms:theme:guest', targetTheme);
        }
    }, [currentUserId, user?.preferences?.theme]);

    const setTheme = (newTheme) => {
        if (!['light', 'dark'].includes(newTheme)) return;

        // 1. Instant optimistic UI update
        setThemeState(newTheme);
        applyThemeToDOM(newTheme);

        const storageKey = getStorageKey(currentUserId);
        localStorage.setItem(storageKey, newTheme);

        // 2. If authenticated user, persist to backend and sync in-memory user
        if (currentUserId) {
            if (setUserPreferences) {
                setUserPreferences({ theme: newTheme });
            }
            userService.updatePreferences({ theme: newTheme }).catch((err) => {
                console.warn('[ThemeContext] Failed to persist theme to backend:', err?.message || err);
            });
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Multi-tab synchronization (scoped strictly to current user's key)
    useEffect(() => {
        const handleStorageChange = (e) => {
            const activeKey = getStorageKey(currentUserId);
            if (e.key === activeKey && e.newValue && ['light', 'dark'].includes(e.newValue)) {
                setThemeState(e.newValue);
                applyThemeToDOM(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [currentUserId]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
