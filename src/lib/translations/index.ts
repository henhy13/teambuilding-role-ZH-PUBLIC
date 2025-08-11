import type { Language, TranslationKeys, TranslationFunction } from './types';
import { zh } from './zh';
import { en } from './en';

const translations: Record<Language, TranslationKeys> = {
  zh,
  en,
};

export const createTranslationFunction = (language: Language): TranslationFunction => {
  return (key: keyof TranslationKeys): string => {
    const translation = translations[language][key];
    
    // Fallback to Chinese if translation is missing
    if (!translation && language !== 'zh') {
      const fallback = translations.zh[key];
      if (fallback) {
        console.warn(`Missing translation for key "${key}" in language "${language}", falling back to Chinese`);
        return fallback;
      }
    }
    
    // If no translation found at all, return the key
    if (!translation) {
      console.warn(`Missing translation for key "${key}"`);
      return key;
    }
    
    return translation;
  };
};

export const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'zh'; // SSR fallback
  
  const stored = localStorage.getItem('language');
  if (stored === 'en' || stored === 'zh') {
    return stored;
  }
  
  // Default to Chinese
  return 'zh';
};

export const setStoredLanguage = (language: Language): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', language);
  }
};

// Re-export types
export type { Language, TranslationKeys, TranslationFunction } from './types';
export { zh } from './zh';
export { en } from './en';