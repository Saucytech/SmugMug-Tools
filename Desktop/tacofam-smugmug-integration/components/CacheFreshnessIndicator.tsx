'use client';

import { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { galleryCache, formatAge, getFreshnessLabel, type FreshnessStatus } from '@/lib/galleryCache';

interface CacheFreshnessIndicatorProps {
  albumKey?: string; // Optional: show freshness for specific gallery
  showAll?: boolean; // Show overall cache freshness
  onClick?: () => void; // Optional: make it clickable to refresh
  className?: string;
  compact?: boolean; // Show minimal version
}

export default function CacheFreshnessIndicator({
  albumKey,
  showAll = false,
  onClick,
  className = '',
  compact = false,
}: CacheFreshnessIndicatorProps) {
  const [freshness, setFreshness] = useState<FreshnessStatus | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const updateFreshness = () => {
      if (showAll) {
        // Show overall cache stats
        const cacheStats = galleryCache.getStats();
        setStats(cacheStats);
      } else if (albumKey) {
        // Show specific gallery freshness
        const galleryFreshness = galleryCache.getFreshness(albumKey);
        setFreshness(galleryFreshness);
      }
    };

    updateFreshness();

    // Update every 30 seconds
    const interval = setInterval(updateFreshness, 30000);
    return () => clearInterval(interval);
  }, [albumKey, showAll]);

  if (showAll && stats) {
    return <OverallCacheStatus stats={stats} onClick={onClick} className={className} compact={compact} />;
  }

  if (!freshness) {
    return null;
  }

  return (
    <GalleryFreshnessStatus
      freshness={freshness}
      onClick={onClick}
      className={className}
      compact={compact}
    />
  );
}

// Component for individual gallery freshness
function GalleryFreshnessStatus({
  freshness,
  onClick,
  className,
  compact,
}: {
  freshness: FreshnessStatus;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const getStatusColor = () => {
    switch (freshness.status) {
      case 'fresh':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stale':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'outdated':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getIcon = () => {
    if (freshness.status === 'fresh') {
      return '🟢';
    } else if (freshness.status === 'stale') {
      return '🟡';
    } else {
      return '🔴';
    }
  };

  const baseClasses = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${getStatusColor()}`;
  const clickableClasses = onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : '';

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={!onClick}
        className={`${baseClasses} ${clickableClasses} ${className}`}
        title={`${getFreshnessLabel(freshness.status)} - ${formatAge(freshness.age)}`}
      >
        <span>{getIcon()}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${baseClasses} ${clickableClasses} ${className}`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{getFreshnessLabel(freshness.status)}</span>
      <span className="opacity-75">•</span>
      <span className="opacity-90">{formatAge(freshness.age)}</span>
      {onClick && (
        <RefreshCw className="w-3 h-3 opacity-60" />
      )}
    </button>
  );
}

// Component for overall cache statistics
function OverallCacheStatus({
  stats,
  onClick,
  className,
  compact,
}: {
  stats: any;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const getOverallStatus = (): 'fresh' | 'stale' | 'outdated' => {
    const stalePercentage = (stats.staleGalleries / stats.totalGalleries) * 100;
    const outdatedPercentage = (stats.outdatedGalleries / stats.totalGalleries) * 100;

    if (outdatedPercentage > 30) return 'outdated';
    if (stalePercentage > 30) return 'stale';
    return 'fresh';
  };

  const getStatusColor = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'fresh':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stale':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'outdated':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const needsRefresh = stats.staleGalleries > 0 || stats.outdatedGalleries > 0;

  const baseClasses = `inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${getStatusColor()}`;
  const clickableClasses = onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : '';

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={!onClick}
        className={`${baseClasses} ${clickableClasses} ${className}`}
        title={`${stats.totalGalleries} galleries cached`}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>{stats.totalGalleries}</span>
        {needsRefresh && <RefreshCw className="w-3 h-3 opacity-60" />}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${baseClasses} ${clickableClasses} ${className}`}
    >
      <Clock className="w-3.5 h-3.5" />
      <div className="flex items-center gap-2">
        <span>{stats.totalGalleries} galleries</span>
        {stats.freshGalleries > 0 && (
          <span className="opacity-90">🟢 {stats.freshGalleries}</span>
        )}
        {stats.staleGalleries > 0 && (
          <span className="opacity-90">🟡 {stats.staleGalleries}</span>
        )}
        {stats.outdatedGalleries > 0 && (
          <span className="opacity-90">🔴 {stats.outdatedGalleries}</span>
        )}
      </div>
      {onClick && <RefreshCw className="w-3 h-3 opacity-60" />}
    </button>
  );
}
