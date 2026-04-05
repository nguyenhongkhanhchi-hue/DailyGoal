import { useState, useEffect } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  updateSW: () => Promise<void>;
  offlineReady: boolean;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for custom PWA update events from vite-plugin-pwa
      const handleNeedRefresh = (e: Event) => {
        const customEvent = e as CustomEvent<{ update: () => Promise<void> }>;
        setNeedRefresh(true);
        setUpdateSW(() => customEvent.detail.update);
      };

      const handleOfflineReady = () => {
        setOfflineReady(true);
      };

      // Listen for service worker update events
      window.addEventListener('vite-pwa:update-needed', handleNeedRefresh as EventListener);
      window.addEventListener('vite-pwa:offline-ready', handleOfflineReady);

      // Manual check for service worker updates
      const checkForUpdates = () => {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch(() => {
            // Silent fail
          });
        });
      };

      // Check every 30 minutes
      const interval = setInterval(checkForUpdates, 30 * 60 * 1000);

      // Check on visibility change (when user returns to app)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkForUpdates();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('vite-pwa:update-needed', handleNeedRefresh as EventListener);
        window.removeEventListener('vite-pwa:offline-ready', handleOfflineReady);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(interval);
      };
    }
  }, []);

  return {
    needRefresh,
    updateSW,
    offlineReady,
  };
}
