// Simplified Google Translate utility using direct API calls
// Uses Google Translate's web interface (no API key required)

/**
 * Translates text from Chinese to English using Google Translate
 * Uses a CORS-friendly approach with fallback
 */
export async function translateChineseToEnglish(text: string): Promise<string> {
  if (!text || typeof window === 'undefined') {
    return text;
  }

  try {
    // Method 1: Try the MyMemory Translation API (free, no CORS issues)
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=zh|en`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('Primary translation failed, trying fallback:', error);
    
    // Method 2: Fallback to LibreTranslate API
    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'zh',
          target: 'en'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.translatedText) {
          return data.translatedText;
        }
      }
    } catch (fallbackError) {
      console.error('Fallback translation also failed:', fallbackError);
    }
    
    // If all translation methods fail, return original text
    console.warn('All translation methods failed, returning original text');
    return text;
  }
}

/**
 * Checks if a text appears to be Chinese
 */
export function isChineseText(text: string): boolean {
  if (!text) return false;
  
  // Check for Chinese characters (including simplified and traditional)
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  return chineseRegex.test(text);
}

/**
 * Debounced translation function to avoid too many API calls
 */
const translationCache = new Map<string, string>();
let translationTimeout: NodeJS.Timeout | null = null;

export function translateWithCache(text: string): Promise<string> {
  return new Promise((resolve) => {
    // Check cache first
    if (translationCache.has(text)) {
      resolve(translationCache.get(text)!);
      return;
    }

    // If not Chinese text, return as-is
    if (!isChineseText(text)) {
      resolve(text);
      return;
    }

    // Clear existing timeout
    if (translationTimeout) {
      clearTimeout(translationTimeout);
    }

    // Debounce translation requests
    translationTimeout = setTimeout(async () => {
      try {
        const translated = await translateChineseToEnglish(text);
        translationCache.set(text, translated);
        resolve(translated);
      } catch (error) {
        console.error('Cached translation failed:', error);
        resolve(text); // Return original on error
      }
    }, 300); // 300ms debounce
  });
}
