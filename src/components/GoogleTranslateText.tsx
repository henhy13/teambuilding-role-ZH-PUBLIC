'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { translateWithCache, isChineseText } from '../lib/utils/googleTranslate';

interface GoogleTranslateTextProps {
  /** The Chinese text to be translated */
  chineseText: string;
  /** Current user language */
  language: 'en' | 'zh';
  /** Unique identifier for this translation instance (not used but kept for API compatibility) */
  uniqueId: string;
  /** Additional CSS classes */
  className?: string;
  /** Children to render (fallback content) */
  children?: React.ReactNode;
}

/**
 * Component that automatically translates Chinese text to English using Google Translate
 * when the user language is set to English. Shows original Chinese when language is Chinese.
 */
export function GoogleTranslateText({
  chineseText,
  language,
  uniqueId,
  className = '',
  children,
}: GoogleTranslateTextProps) {
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);

  const performTranslation = useCallback(async () => {
    if (isTranslating) return;

    setIsTranslating(true);
    setTranslationError(false);

    try {
      const result = await translateWithCache(chineseText);
      setTranslatedText(result);
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslationError(true);
      setTranslatedText(chineseText); // Fallback to original
    } finally {
      setIsTranslating(false);
    }
  }, [chineseText, isTranslating]);

  // Effect to handle translation when language or text changes
  useEffect(() => {
    if (language === 'en' && chineseText && isChineseText(chineseText)) {
      performTranslation();
    } else {
      // Reset state when not translating
      setTranslatedText('');
      setIsTranslating(false);
      setTranslationError(false);
    }
  }, [language, chineseText, performTranslation]);

  // If language is Chinese or no text, show original
  if (language === 'zh' || !chineseText) {
    return (
      <div className={className}>
        {children || chineseText}
      </div>
    );
  }

  // If not Chinese text, show as-is
  if (!isChineseText(chineseText)) {
    return (
      <div className={className}>
        {children || chineseText}
      </div>
    );
  }

  // For English language with Chinese text, show translation
  return (
    <div className={className}>
      {/* Loading indicator */}
      {isTranslating && (
        <div className="flex items-center space-x-2 text-blue-600 text-xs mb-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          <span>Translating...</span>
        </div>
      )}

      {/* Translation error fallback */}
      {translationError && (
        <div className="text-xs text-amber-600 mb-2">
          Translation failed - showing original text
        </div>
      )}

      {/* Translated or original content */}
      <div className="leading-relaxed">
        {translatedText || chineseText}
      </div>

      {/* Success indicator */}
      {translatedText && !isTranslating && !translationError && translatedText !== chineseText && (
        <div className="text-xs text-green-600 mt-1 opacity-70">
          ✓ Translated from Chinese
        </div>
      )}
    </div>
  );
}

export default GoogleTranslateText;
