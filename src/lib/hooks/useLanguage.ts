import { useLanguageContext } from '../context/LanguageContext';

export const useLanguage = () => {
  return useLanguageContext();
};