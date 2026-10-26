import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

const isSupportedLanguage = (code) =>
    typeof code === 'string' && SUPPORTED_LANGUAGES.some((item) => item.code === code);

function getInitialLanguage() {
    try {
        const savedLanguage = window.localStorage.getItem('language');
        return isSupportedLanguage(savedLanguage) ? savedLanguage : 'en';
    } catch {
        // Storage may be unavailable in restricted browser contexts.
        return 'en';
    }
}

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(getInitialLanguage);

    useEffect(() => {
        try {
            window.localStorage.setItem('language', language);
        } catch {
            // The selected language still works for this session if storage is blocked.
        }

        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('lang', language);
        }
    }, [language]);

    // Keep the existing setter API while rejecting unsupported language codes.
    const setLanguage = (nextLanguage) => {
        const resolvedLanguage =
            typeof nextLanguage === 'function' ? nextLanguage(language) : nextLanguage;

        if (isSupportedLanguage(resolvedLanguage)) {
            setLanguageState(resolvedLanguage);
        }
    };

    const t = (key, fallbackDefault = null) => {
        if (typeof key !== 'string' || !key.trim()) {
            return fallbackDefault ?? '';
        }

        const keys = key.split('.');
        const resolve = (dictionary) => {
            let value = dictionary;
            for (const part of keys) {
                value = value?.[part];
                if (value === undefined || value === null) return undefined;
            }
            return value;
        };

        const currentTranslation = resolve(translations[language] || translations.en);
        if (currentTranslation !== undefined) return currentTranslation;

        const englishFallback = resolve(translations.en);
        if (englishFallback !== undefined) return englishFallback;

        return fallbackDefault ?? key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, SUPPORTED_LANGUAGES }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
