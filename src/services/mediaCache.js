/**
 * Media Cache Service
 * Manages browser cache for media files (images and audio) retrieved from AnkiConnect
 * Uses the Cache API to store base64 data with configurable expiration
 */

const CACHE_NAME = "anki-media-cache-v1";
const DEFAULT_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class MediaCacheService {
  constructor() {
    this.cacheDuration = DEFAULT_CACHE_DURATION_MS;
    this.initCache();
  }

  /**
   * Initialize the cache
   */
  async initCache() {
    try {
      // Check if Cache API is available
      if (!("caches" in window)) {
        return false;
      }
      return true;
    } catch {
      // Cache API not available or initialization failed
      return false;
    }
  }

  /**
   * Get cached media file if available and not expired
   * @param {string} filename - The media filename
   * @returns {Promise<string|null>} - Base64 data or null if not cached/expired
   */
  async getCachedMedia(filename) {
    try {
      if (!("caches" in window)) return null;

      const cache = await caches.open(CACHE_NAME);
      const cacheKey = this._getCacheKey(filename);
      const response = await cache.match(cacheKey);

      if (!response) {
        return null;
      }

      // Check if cache entry has expired
      const cachedData = await response.json();
      const now = Date.now();

      if (now - cachedData.timestamp > this.cacheDuration) {
        // Cache expired, remove it
        await cache.delete(cacheKey);
        return null;
      }

      return cachedData.base64Data;
    } catch {
      // Failed to retrieve from cache
      return null;
    }
  }

  /**
   * Store media file in cache with timestamp
   * @param {string} filename - The media filename
   * @param {string} base64Data - The base64 encoded media data
   * @returns {Promise<boolean>} - Success status
   */
  async setCachedMedia(filename, base64Data) {
    try {
      if (!("caches" in window)) return false;

      const cache = await caches.open(CACHE_NAME);
      const cacheKey = this._getCacheKey(filename);

      const cacheData = {
        filename,
        base64Data,
        timestamp: Date.now(),
      };

      // Create a Response object to store in cache
      const response = new Response(JSON.stringify(cacheData), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${Math.floor(this.cacheDuration / 1000)}`,
        },
      });

      await cache.put(cacheKey, response);
      return true;
    } catch {
      // Failed to cache media
      return false;
    }
  }

  /**
   * Clear expired cache entries
   * @returns {Promise<number>} - Number of entries cleared
   */
  async clearExpiredCache() {
    try {
      if (!("caches" in window)) return 0;

      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      const now = Date.now();
      let clearedCount = 0;

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cachedData = await response.json();
          if (now - cachedData.timestamp > this.cacheDuration) {
            await cache.delete(request);
            clearedCount++;
          }
        }
      }

      return clearedCount;
    } catch {
      // Failed to clear expired cache
      return 0;
    }
  }

  /**
   * Clear all cached media
   * @returns {Promise<boolean>} - Success status
   */
  async clearAllCache() {
    try {
      if (!("caches" in window)) return false;

      const deleted = await caches.delete(CACHE_NAME);
      return deleted;
    } catch {
      // Failed to clear cache
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache statistics
   */
  async getCacheStats() {
    try {
      if (!("caches" in window)) {
        return {
          totalEntries: 0,
          expiredEntries: 0,
          validEntries: 0,
          cacheSize: 0,
        };
      }

      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      const now = Date.now();

      let totalEntries = 0;
      let expiredEntries = 0;
      let validEntries = 0;
      let cacheSize = 0;

      for (const request of requests) {
        totalEntries++;
        const response = await cache.match(request);
        if (response) {
          const cachedData = await response.json();
          const dataSize = new Blob([cachedData.base64Data]).size;
          cacheSize += dataSize;

          if (now - cachedData.timestamp > this.cacheDuration) {
            expiredEntries++;
          } else {
            validEntries++;
          }
        }
      }

      return {
        totalEntries,
        expiredEntries,
        validEntries,
        cacheSize: Math.round(cacheSize / 1024), // Size in KB
      };
    } catch {
      // Failed to get cache stats
      return {
        totalEntries: 0,
        expiredEntries: 0,
        validEntries: 0,
        cacheSize: 0,
      };
    }
  }

  /**
   * Set cache duration
   * @param {number} durationMs - Duration in milliseconds
   */
  setCacheDuration(durationMs) {
    this.cacheDuration = durationMs;
  }

  /**
   * Get current cache duration
   * @returns {number} - Duration in milliseconds
   */
  getCacheDuration() {
    return this.cacheDuration;
  }

  /**
   * Get cache duration in hours
   * @returns {number} - Duration in hours
   */
  getCacheDurationHours() {
    return Math.round(this.cacheDuration / (60 * 60 * 1000));
  }

  /**
   * Set cache duration in hours
   * @param {number} hours - Duration in hours
   */
  setCacheDurationHours(hours) {
    this.cacheDuration = hours * 60 * 60 * 1000;
  }

  /**
   * Generate cache key for a filename
   * @private
   */
  _getCacheKey(filename) {
    return `${window.location.origin}/anki-media/${filename}`;
  }
}

// Create singleton instance
const mediaCacheService = new MediaCacheService();

export default mediaCacheService;
