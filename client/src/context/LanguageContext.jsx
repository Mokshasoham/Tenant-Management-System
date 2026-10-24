import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

export const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  es: 'es-ES',
  fr: 'fr-FR',
};

const RELATIVE_TIME_UNITS = {
  en: { justNow: 'just now', secondsAgo: '{{count}}s ago', minutesAgo: '{{count}}m ago', hoursAgo: '{{count}}h ago', yesterday: 'yesterday', daysAgo: '{{count}}d ago' },
  hi: { justNow: 'अभी', secondsAgo: '{{count}} सेकंड पहले', minutesAgo: '{{count}} मिनट पहले', hoursAgo: '{{count}} घंटे पहले', yesterday: 'कल', daysAgo: '{{count}} दिन पहले' },
  ta: { justNow: 'இப்போது', secondsAgo: '{{count}} வினாடிகளுக்கு முன்', minutesAgo: '{{count}} நிமிடங்களுக்கு முன்', hoursAgo: '{{count}} மணிநேரத்திற்கு முன்', yesterday: 'நேற்று', daysAgo: '{{count}} நாட்களுக்கு முன்' },
  te: { justNow: 'ఇప్పుడే', secondsAgo: '{{count}} సెకన్ల క్రితం', minutesAgo: '{{count}} నిమిషాల క్రితం', hoursAgo: '{{count}} గంటల క్రితం', yesterday: 'నిన్న', daysAgo: '{{count}} రోజుల క్రితం' },
  kn: { justNow: 'ಈಗಷ್ಟೇ', secondsAgo: '{{count}} ಸೆಕೆಂಡುಗಳ ಹಿಂದೆ', minutesAgo: '{{count}} ನಿಮಿಷಗಳ ಹಿಂದೆ', hoursAgo: '{{count}} ಗಂಟೆಗಳ ಹಿಂದೆ', yesterday: 'ನಿನ್ನೆ', daysAgo: '{{count}} ದಿನಗಳ ಹಿಂದೆ' },
  ml: { justNow: 'ഇപ്പോൾ', secondsAgo: '{{count}} സെക്കൻഡ് മുമ്പ്', minutesAgo: '{{count}} മിനിറ്റ് മുമ്പ്', hoursAgo: '{{count}} മണിക്കൂർ മുമ്പ്', yesterday: 'ഇന്നലെ', daysAgo: '{{count}} ദിവസങ്ങൾക്ക് മുമ്പ്' },
  es: { justNow: 'hace un momento', secondsAgo: 'hace {{count}} s', minutesAgo: 'hace {{count}} min', hoursAgo: 'hace {{count}} h', yesterday: 'ayer', daysAgo: 'hace {{count}} d' },
  fr: { justNow: 'à l’instant', secondsAgo: 'il y a {{count}} s', minutesAgo: 'il y a {{count}} min', hoursAgo: 'il y a {{count}} h', yesterday: 'hier', daysAgo: 'il y a {{count}} j' },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('language') : null;
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
        return stored;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.code === newLang)) {
      setLanguageState(newLang);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('language', newLang);
        }
      } catch (err) {
        console.warn('Failed to save language to localStorage:', err);
      }
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('language', language);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', language);
      }
    } catch (err) {
      console.warn('Failed to update document lang attribute:', err);
    }
  }, [language]);

  const t = useCallback((key, fallbackOrParams = null, paramsObj = null) => {
    if (!key || typeof key !== 'string') return '';

    let fallbackDefault = null;
    let params = null;

    if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
      params = fallbackOrParams;
    } else {
      fallbackDefault = fallbackOrParams;
      if (typeof paramsObj === 'object' && paramsObj !== null) {
        params = paramsObj;
      }
    }

    const keys = key.split('.');
    let val = translations[language];
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) break;
    }

    // Fallback to English if translation is undefined in active language
    if (val === undefined) {
      let fallbackVal = translations['en'];
      for (const k of keys) {
        fallbackVal = fallbackVal?.[k];
        if (fallbackVal === undefined) break;
      }
      val = fallbackVal !== undefined ? fallbackVal : (fallbackDefault || key);
    }

    // Interpolation replacement for {{param}}
    if (params && typeof val === 'string') {
      for (const [pKey, pVal] of Object.entries(params)) {
        val = val.replaceAll(`{{${pKey}}}`, pVal !== undefined && pVal !== null ? String(pVal) : '');
      }
    }

    return val;
  }, [language]);

  const formatDate = useCallback((dateValue, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    const locale = LOCALE_MAP[language] || 'en-IN';
    try {
      return new Intl.DateTimeFormat(locale, options).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }, [language]);

  const formatNumber = useCallback((num, options = {}) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const locale = LOCALE_MAP[language] || 'en-IN';
    try {
      return new Intl.NumberFormat(locale, options).format(num);
    } catch {
      return String(num);
    }
  }, [language]);

  const formatCurrency = useCallback((amount, currency = 'INR') => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    const locale = LOCALE_MAP[language] || 'en-IN';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `₹${amount}`;
    }
  }, [language]);

  const formatRelativeTime = useCallback((dateValue) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    const units = RELATIVE_TIME_UNITS[language] || RELATIVE_TIME_UNITS['en'];

    if (diffSec < 30) return units.justNow;
    if (diffSec < 60) return units.secondsAgo.replace('{{count}}', String(diffSec));
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return units.minutesAgo.replace('{{count}}', String(diffMin));
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return units.hoursAgo.replace('{{count}}', String(diffHours));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return units.yesterday;
    if (diffDays < 30) return units.daysAgo.replace('{{count}}', String(diffDays));
    return formatDate(d);
  }, [language, formatDate]);

  const translateApiError = useCallback((error) => {
    if (!error) return t('errors.somethingWentWrong');
    const msg = typeof error === 'string' ? error : (error.response?.data?.message || error.message || '');
    const lower = msg.toLowerCase();

    if (lower.includes('network') || lower.includes('connection')) return t('errors.networkError');
    if (lower.includes('unauthorized') || lower.includes('not authorized') || lower.includes('token')) return t('errors.unauthorized');
    if (lower.includes('invalid credentials') || (lower.includes('password') && lower.includes('incorrect'))) return t('errors.invalidCredentials');
    if (lower.includes('expired')) return t('errors.sessionExpired');
    if (lower.includes('required')) return t('errors.fieldRequired');
    if (lower.includes('not found')) return t('common.noData');

    return msg || t('errors.somethingWentWrong');
  }, [t]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    translateApiError,
    SUPPORTED_LANGUAGES,
    LOCALE_MAP,
  }), [language, setLanguage, t, formatDate, formatNumber, formatCurrency, formatRelativeTime, translateApiError]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export default useLanguage;
