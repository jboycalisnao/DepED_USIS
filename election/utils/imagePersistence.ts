import { urlToBase64, getBase64Size } from './imageUtils';

const CACHE_KEY = 'deped_image_cache';

export const cacheBrandingImages = async (urls: Record<string, string>) => {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    const cache = cacheStr ? JSON.parse(cacheStr) : {};
    const newCache = { ...cache };
    let updated = false;
    let bytesSaved = 0;

    for (const [key, url] of Object.entries(urls)) {
      if (!newCache[key]) {
        console.log(`Caching branding asset: ${key}`);
        const base64 = await urlToBase64(url);
        newCache[key] = base64;
        updated = true;
      } else {
        bytesSaved += getBase64Size(newCache[key]);
      }
    }

    if (updated) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
    }
    
    if (bytesSaved > 0) {
      console.log(`E-Boto Persistence: Saved ${(bytesSaved / 1024 / 1024).toFixed(2)}MB of egress by loading from local cache.`);
    }
  } catch (e) {
    console.warn("Storage caching error:", e);
  }
};

export const getCachedImage = (key: string, fallback: string): string => {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    const cache = cacheStr ? JSON.parse(cacheStr) : {};
    return cache[key] || fallback;
  } catch (e) {
    return fallback;
  }
};

export const getCacheStats = () => {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return { size: 0, items: 0 };
    const cache = JSON.parse(cacheStr);
    const items = Object.keys(cache).length;
    const size = getBase64Size(cacheStr);
    return { size, items };
  } catch (e) {
    return { size: 0, items: 0 };
  }
};