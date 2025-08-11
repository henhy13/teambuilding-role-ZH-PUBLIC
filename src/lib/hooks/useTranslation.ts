import { useMemo } from 'react';
import { useLanguage } from './useLanguage';
import { createTranslationFunction, Language, TranslationFunction } from '../translations';

interface UseTranslationReturn {
  t: TranslationFunction;
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
}

export const useTranslation = (): UseTranslationReturn => {
  const { language, setLanguage, toggleLanguage } = useLanguage();
  
  const t = useMemo(() => {
    return createTranslationFunction(language);
  }, [language]);

  return {
    t,
    language,
    toggleLanguage,
    setLanguage,
  };
};