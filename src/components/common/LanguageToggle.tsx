'use client';

import React from 'react';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { language, toggleLanguage } = useTranslation();

  return (
    <button
      onClick={toggleLanguage}
      className={`
        inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md 
        text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-colors duration-200
        ${className}
      `}
      aria-label={`Switch to ${language === 'zh' ? 'English' : 'Chinese'}`}
    >
      <div className="flex items-center space-x-1">
        <span className="text-xs">🌐</span>
        <span className="font-mono">
          {language === 'zh' ? 'EN' : '中'}
        </span>
      </div>
    </button>
  );
}