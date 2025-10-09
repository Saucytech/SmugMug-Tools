/**
 * Unified Gallery Cache Service
 *
 * Centralized caching system for SmugMug gallery data across all tools.
 * Provides intelligent staleness detection, automatic migration, and error recovery.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CachedImage {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  Keywords?: string;
  ArchivedUri?: string;
  ThumbnailUrl?: string;
  WebUri?: string;
  [key: string]: any; // Allow additional SmugMug fields
}

export interface CachedGallery {
  albumKey: string;
  albumName: string;
  albumUri?: string;
  imageCount: number;
  images: CachedImage[];
  cachedAt: number;        // Timestamp when cached
  lastRefreshed: number;   // Timestamp of last manual refresh
  metadata?: {
    folderPath?: string;
    description?: string;
    keywords?: string[];
    [key: string]: any;
  };
}

export interface CacheMetadata {
  version: number;
  createdAt: number;
  lastFullSync: number;
  totalGalleries: number;
  totalImages: number;
}

export interface GalleryCacheData {
  metadata: CacheMetadata;
  galleries: Map<string, CachedGallery>; // albumKey -> gallery
}

export interface FreshnessStatus {
  status: 'fresh' | 'stale' | 'outdated';
  age: number; // milliseconds
  lastUpdate: Date;
  needsRefresh: boolean;
}

export interface CacheStats {
  totalGalleries: number;
  totalImages: number;
  freshGalleries: number;
  staleGalleries: number;
  outdatedGalleries: number;
  oldestCache: Date | null;
  newestCache: Date | null;
  cacheSize: number; // bytes
  lastFullSync: Date | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  CACHE_KEY: 'smugmug-gallery-cache-v1',
  CURRENT_VERSION: 1,
  LEGACY_KEYS: ['photo-organizer-index'], // Old cache keys to migrate from

  // Staleness thresholds (in milliseconds)
  FRESH_THRESHOLD: 30 * 60 * 1000,      // 30 minutes
  STALE_THRESHOLD: 2 * 60 * 60 * 1000,  // 2 hours
  // Anything older than STALE_THRESHOLD is considered "outdated"

  // Storage limits
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_GALLERIES: 1000,
};

// ============================================================================
// GALLERY CACHE SERVICE CLASS
// ============================================================================

class GalleryCacheService {
  private cache: GalleryCacheData | null = null;
  private initialized = false;

  /**
   * Initialize the cache service (loads from localStorage)
   */
  initialize(): void {
    if (this.initialized) return;

    try {
      this.cache = this.loadCache();
      this.initialized = true;

      // Check if migration is needed
      if (this.cache.metadata.version < CONFIG.CURRENT_VERSION) {
        this.migrateCache();
      }
    } catch (error) {
      console.error('Failed to initialize gallery cache:', error);
      this.cache = this.createEmptyCache();
      this.initialized = true;
    }
  }

  /**
   * Create an empty cache structure
   */
  private createEmptyCache(): GalleryCacheData {
    return {
      metadata: {
        version: CONFIG.CURRENT_VERSION,
        createdAt: Date.now(),
        lastFullSync: 0,
        totalGalleries: 0,
        totalImages: 0,
      },
      galleries: new Map(),
    };
  }

  /**
   * Load cache from localStorage with validation
   */
  private loadCache(): GalleryCacheData {
    try {
      const stored = localStorage.getItem(CONFIG.CACHE_KEY);

      if (!stored) {
        // Try to migrate from legacy cache
        return this.migrateLegacyCache();
      }

      const parsed = JSON.parse(stored);

      // Validate structure
      if (!this.validateCacheStructure(parsed)) {
        console.warn('Invalid cache structure, creating new cache');
        return this.createEmptyCache();
      }

      // Convert galleries array back to Map
      const galleries = new Map<string, CachedGallery>(
        Object.entries(parsed.galleries || {})
      );

      return {
        metadata: parsed.metadata,
        galleries,
      };
    } catch (error) {
      console.error('Error loading cache:', error);
      return this.createEmptyCache();
    }
  }

  /**
   * Validate cache data structure
   */
  private validateCacheStructure(data: any): boolean {
    return !!(
      data &&
      data.metadata &&
      typeof data.metadata.version === 'number' &&
      data.galleries &&
      typeof data.galleries === 'object'
    );
  }

  /**
   * Migrate from legacy cache formats
   */
  private migrateLegacyCache(): GalleryCacheData {
    const newCache = this.createEmptyCache();

    // Try to migrate from Photo Organizer cache
    try {
      const legacyData = localStorage.getItem('photo-organizer-index');
      if (!legacyData) return newCache;

      const parsed = JSON.parse(legacyData);
      const galleries = Array.isArray(parsed) ? parsed : [];

      galleries.forEach((gallery: any) => {
        if (gallery.albumKey) {
          const cachedGallery: CachedGallery = {
            albumKey: gallery.albumKey,
            albumName: gallery.albumName || 'Untitled',
            imageCount: gallery.imageCount || gallery.images?.length || 0,
            images: gallery.images || [],
            cachedAt: gallery.indexedAt || Date.now(),
            lastRefreshed: gallery.indexedAt || Date.now(),
          };

          newCache.galleries.set(gallery.albumKey, cachedGallery);
          newCache.metadata.totalGalleries++;
          newCache.metadata.totalImages += cachedGallery.imageCount;
        }
      });

      console.log(`Migrated ${newCache.metadata.totalGalleries} galleries from legacy cache`);
    } catch (error) {
      console.error('Error migrating legacy cache:', error);
    }

    return newCache;
  }

  /**
   * Migrate cache to newer version
   */
  private migrateCache(): void {
    if (!this.cache) return;

    // Add migration logic here as versions evolve
    // For now, just update version number
    this.cache.metadata.version = CONFIG.CURRENT_VERSION;
    this.saveCache();
  }

  /**
   * Save cache to localStorage
   */
  private saveCache(): void {
    if (!this.cache) return;

    try {
      // Convert Map to object for JSON serialization
      const galleriesObj = Object.fromEntries(this.cache.galleries);

      const toSave = {
        metadata: this.cache.metadata,
        galleries: galleriesObj,
      };

      const serialized = JSON.stringify(toSave);

      // Check size before saving
      const sizeInBytes = new Blob([serialized]).size;
      if (sizeInBytes > CONFIG.MAX_CACHE_SIZE) {
        console.warn('Cache size exceeds limit, pruning old galleries');
        this.pruneOldGalleries();
        return; // Retry after pruning
      }

      localStorage.setItem(CONFIG.CACHE_KEY, serialized);
    } catch (error) {
      console.error('Error saving cache:', error);

      // If quota exceeded, try pruning and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.pruneOldGalleries();
      }
    }
  }

  /**
   * Prune oldest galleries to free up space
   */
  private pruneOldGalleries(): void {
    if (!this.cache) return;

    const galleries = Array.from(this.cache.galleries.values());

    // Sort by cachedAt, oldest first
    galleries.sort((a, b) => a.cachedAt - b.cachedAt);

    // Remove oldest 20%
    const toRemove = Math.ceil(galleries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.galleries.delete(galleries[i].albumKey);
    }

    // Update metadata
    this.updateMetadata();
    this.saveCache();

    console.log(`Pruned ${toRemove} oldest galleries`);
  }

  /**
   * Update cache metadata statistics
   */
  private updateMetadata(): void {
    if (!this.cache) return;

    let totalImages = 0;
    this.cache.galleries.forEach(gallery => {
      totalImages += gallery.imageCount;
    });

    this.cache.metadata.totalGalleries = this.cache.galleries.size;
    this.cache.metadata.totalImages = totalImages;
  }

  // ==========================================================================
  // PUBLIC API - READ OPERATIONS
  // ==========================================================================

  /**
   * Get all galleries
   */
  getAllGalleries(): CachedGallery[] {
    this.ensureInitialized();
    return Array.from(this.cache!.galleries.values());
  }

  /**
   * Get a specific gallery by albumKey
   */
  getGallery(albumKey: string): CachedGallery | null {
    this.ensureInitialized();
    return this.cache!.galleries.get(albumKey) || null;
  }

  /**
   * Get multiple galleries by albumKeys
   */
  getGalleries(albumKeys: string[]): CachedGallery[] {
    this.ensureInitialized();
    return albumKeys
      .map(key => this.cache!.galleries.get(key))
      .filter((g): g is CachedGallery => g !== undefined);
  }

  /**
   * Check if a gallery exists in cache
   */
  hasGallery(albumKey: string): boolean {
    this.ensureInitialized();
    return this.cache!.galleries.has(albumKey);
  }

  /**
   * Get cache metadata
   */
  getMetadata(): CacheMetadata {
    this.ensureInitialized();
    return { ...this.cache!.metadata };
  }

  // ==========================================================================
  // PUBLIC API - WRITE OPERATIONS
  // ==========================================================================

  /**
   * Add or update a gallery in cache
   */
  setGallery(gallery: CachedGallery): void {
    this.ensureInitialized();

    const now = Date.now();
    const cachedGallery: CachedGallery = {
      ...gallery,
      cachedAt: now,
      lastRefreshed: gallery.lastRefreshed || now,
    };

    this.cache!.galleries.set(gallery.albumKey, cachedGallery);
    this.updateMetadata();
    this.saveCache();
  }

  /**
   * Add or update multiple galleries
   */
  setGalleries(galleries: CachedGallery[]): void {
    this.ensureInitialized();

    const now = Date.now();
    galleries.forEach(gallery => {
      const cachedGallery: CachedGallery = {
        ...gallery,
        cachedAt: now,
        lastRefreshed: gallery.lastRefreshed || now,
      };
      this.cache!.galleries.set(gallery.albumKey, cachedGallery);
    });

    this.updateMetadata();
    this.cache!.metadata.lastFullSync = now;
    this.saveCache();
  }

  /**
   * Remove a gallery from cache
   */
  removeGallery(albumKey: string): void {
    this.ensureInitialized();
    this.cache!.galleries.delete(albumKey);
    this.updateMetadata();
    this.saveCache();
  }

  /**
   * Clear all galleries from cache
   */
  clearCache(): void {
    this.ensureInitialized();
    this.cache = this.createEmptyCache();
    this.saveCache();

    // Also clear legacy caches
    CONFIG.LEGACY_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // ==========================================================================
  // PUBLIC API - FRESHNESS & STALENESS
  // ==========================================================================

  /**
   * Check if a gallery is stale
   */
  isStale(albumKey: string): boolean {
    const gallery = this.getGallery(albumKey);
    if (!gallery) return true;

    const age = Date.now() - gallery.cachedAt;
    return age > CONFIG.FRESH_THRESHOLD;
  }

  /**
   * Check if a gallery is outdated
   */
  isOutdated(albumKey: string): boolean {
    const gallery = this.getGallery(albumKey);
    if (!gallery) return true;

    const age = Date.now() - gallery.cachedAt;
    return age > CONFIG.STALE_THRESHOLD;
  }

  /**
   * Get freshness status for a gallery
   */
  getFreshness(albumKey: string): FreshnessStatus | null {
    const gallery = this.getGallery(albumKey);
    if (!gallery) return null;

    const age = Date.now() - gallery.cachedAt;
    let status: 'fresh' | 'stale' | 'outdated';

    if (age < CONFIG.FRESH_THRESHOLD) {
      status = 'fresh';
    } else if (age < CONFIG.STALE_THRESHOLD) {
      status = 'stale';
    } else {
      status = 'outdated';
    }

    return {
      status,
      age,
      lastUpdate: new Date(gallery.cachedAt),
      needsRefresh: status !== 'fresh',
    };
  }

  /**
   * Get overall cache statistics
   */
  getStats(): CacheStats {
    this.ensureInitialized();

    const galleries = this.getAllGalleries();
    let freshCount = 0;
    let staleCount = 0;
    let outdatedCount = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    galleries.forEach(gallery => {
      const age = Date.now() - gallery.cachedAt;

      if (age < CONFIG.FRESH_THRESHOLD) {
        freshCount++;
      } else if (age < CONFIG.STALE_THRESHOLD) {
        staleCount++;
      } else {
        outdatedCount++;
      }

      oldestTimestamp = Math.min(oldestTimestamp, gallery.cachedAt);
      newestTimestamp = Math.max(newestTimestamp, gallery.cachedAt);
    });

    // Calculate cache size
    const serialized = localStorage.getItem(CONFIG.CACHE_KEY) || '';
    const cacheSize = new Blob([serialized]).size;

    return {
      totalGalleries: this.cache!.metadata.totalGalleries,
      totalImages: this.cache!.metadata.totalImages,
      freshGalleries: freshCount,
      staleGalleries: staleCount,
      outdatedGalleries: outdatedCount,
      oldestCache: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
      newestCache: newestTimestamp === 0 ? null : new Date(newestTimestamp),
      cacheSize,
      lastFullSync: this.cache!.metadata.lastFullSync
        ? new Date(this.cache!.metadata.lastFullSync)
        : null,
    };
  }

  /**
   * Get list of stale galleries
   */
  getStaleGalleries(): CachedGallery[] {
    return this.getAllGalleries().filter(gallery => {
      const age = Date.now() - gallery.cachedAt;
      return age > CONFIG.FRESH_THRESHOLD && age < CONFIG.STALE_THRESHOLD;
    });
  }

  /**
   * Get list of outdated galleries
   */
  getOutdatedGalleries(): CachedGallery[] {
    return this.getAllGalleries().filter(gallery => {
      const age = Date.now() - gallery.cachedAt;
      return age > CONFIG.STALE_THRESHOLD;
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Ensure cache is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const galleryCache = new GalleryCacheService();

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
  galleryCache.initialize();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format age in human-readable format
 */
export function formatAge(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Get freshness color for UI
 */
export function getFreshnessColor(status: 'fresh' | 'stale' | 'outdated'): string {
  switch (status) {
    case 'fresh':
      return 'green';
    case 'stale':
      return 'yellow';
    case 'outdated':
      return 'red';
  }
}

/**
 * Get freshness label for UI
 */
export function getFreshnessLabel(status: 'fresh' | 'stale' | 'outdated'): string {
  switch (status) {
    case 'fresh':
      return 'Up to date';
    case 'stale':
      return 'May be outdated';
    case 'outdated':
      return 'Needs refresh';
  }
}
