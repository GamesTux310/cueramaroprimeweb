'use client';
import { useState, useEffect } from 'react';
import { 
  hasPendingWrites, 
  getPendingWritesCount, 
  isOnline, 
  onConnectionChange,
  getLastSyncTime 
} from '@/lib/sync';

export default function SyncStatus() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Initial state
    setOnline(isOnline());
    setPendingCount(getPendingWritesCount());
    setLastSync(getLastSyncTime());

    // Listen for connection changes
    const unsubscribe = onConnectionChange((isOnline) => {
      setOnline(isOnline);
    });

    // Poll pending writes
    const interval = setInterval(() => {
      setPendingCount(getPendingWritesCount());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Determine status
  const status = !online 
    ? 'offline' 
    : pendingCount > 0 
      ? 'syncing' 
      : 'synced';

  const statusConfig = {
    offline: {
      color: '#f59e0b',
      icon: '📴',
      text: 'Sin conexión',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    syncing: {
      color: '#3b82f6',
      icon: '🔄',
      text: `Sincronizando (${pendingCount})`,
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    synced: {
      color: '#10b981',
      icon: '☁️',
      text: 'Sincronizado',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
  };

  const config = statusConfig[status];

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '8px 16px',
        borderRadius: '20px',
        backgroundColor: config.bg,
        border: `1px solid ${config.color}`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: config.color,
        cursor: 'pointer',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={{ 
        animation: status === 'syncing' ? 'spin 1s linear infinite' : 'none'
      }}>
        {config.icon}
      </span>
      <span style={{ fontWeight: 500 }}>{config.text}</span>

      {showTooltip && lastSync && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: '8px',
          padding: '8px 12px',
          backgroundColor: '#1f2937',
          color: 'white',
          borderRadius: '8px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
        }}>
          Última sync: {new Date(lastSync).toLocaleString('es-MX')}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
