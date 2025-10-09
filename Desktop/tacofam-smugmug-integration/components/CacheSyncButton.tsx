'use client';

import { useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

interface CacheSyncButtonProps {
  onSync: () => Promise<void>; // Function to call when syncing
  label?: string;
  showLabel?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export default function CacheSyncButton({
  onSync,
  label = 'Refresh',
  showLabel = true,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled = false,
}: CacheSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    if (syncing || disabled) return;

    setSyncing(true);
    setSyncStatus('idle');

    try {
      await onSync();
      setSyncStatus('success');

      // Reset success state after 2 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');

      // Reset error state after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } finally {
      setSyncing(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-2.5 text-base';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
    }
  };

  const getStatusIcon = () => {
    const iconClass = getIconSize();

    if (syncStatus === 'success') {
      return <Check className={`${iconClass} text-green-600`} />;
    }

    if (syncStatus === 'error') {
      return <AlertCircle className={`${iconClass} text-red-600`} />;
    }

    return (
      <RefreshCw
        className={`${iconClass} ${syncing ? 'animate-spin' : ''}`}
      />
    );
  };

  const getStatusLabel = () => {
    if (syncStatus === 'success') return 'Updated!';
    if (syncStatus === 'error') return 'Failed';
    if (syncing) return 'Updating...';
    return label;
  };

  return (
    <button
      onClick={handleSync}
      disabled={disabled || syncing}
      className={`
        inline-flex items-center gap-2
        font-medium rounded-lg border
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:shadow-sm active:scale-95
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
      title={syncing ? 'Syncing...' : 'Refresh cache'}
    >
      {getStatusIcon()}
      {showLabel && <span>{getStatusLabel()}</span>}
    </button>
  );
}

// Specialized variant for minimal toolbar usage
export function CacheSyncIconButton({
  onSync,
  className = '',
  disabled = false,
}: Pick<CacheSyncButtonProps, 'onSync' | 'className' | 'disabled'>) {
  return (
    <CacheSyncButton
      onSync={onSync}
      showLabel={false}
      variant="ghost"
      size="sm"
      className={className}
      disabled={disabled}
    />
  );
}

// Specialized variant for prominent sync actions
export function CacheSyncPrimaryButton({
  onSync,
  label = 'Sync All Galleries',
  className = '',
  disabled = false,
}: Pick<CacheSyncButtonProps, 'onSync' | 'label' | 'className' | 'disabled'>) {
  return (
    <CacheSyncButton
      onSync={onSync}
      label={label}
      showLabel={true}
      variant="primary"
      size="md"
      className={className}
      disabled={disabled}
    />
  );
}
