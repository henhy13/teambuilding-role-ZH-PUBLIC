'use client';

import React from 'react';
import { useTranslation } from '../../lib/hooks/useTranslation';

export function FloatingLanguageToggle() {
  const { language, toggleLanguage } = useTranslation();

  return (
    <button
      onClick={toggleLanguage}
      className="
        fixed bottom-4 right-4 z-50 md:hidden
        w-12 h-12 bg-blue-600 hover:bg-blue-700 
        text-white rounded-full shadow-lg
        flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-all duration-200 hover:scale-105
      "
      aria-label={`Switch to ${language === 'zh' ? 'English' : 'Chinese'}`}
    >
      <span className="text-sm font-mono font-semibold">
        {language === 'zh' ? 'EN' : '中'}
      </span>
    </button>
  );
}