// src/lib/networkStatus.ts
import { useEffect, useState } from 'react';

type NavigatorWithOnline = Navigator & {
  onLine?: boolean;
};

function readOnlineStatus() {
  const navigatorWithOnline = globalThis.navigator as NavigatorWithOnline | undefined;

  return typeof navigatorWithOnline?.onLine === 'boolean' ? navigatorWithOnline.onLine : true;
}

export function getOfflineMessage(action: 'join' | 'reveal' | 'save' | 'share' | 'sync') {
  const messages = {
    join: 'You are offline. Join the couple deck when your connection is back.',
    reveal: 'You are offline. Mystery reveals need a synced couple deck, so try again when connected.',
    save: 'You are offline. Sign-in saves need sync, but this date is still available locally for now.',
    share: 'You are offline. Mystery card sharing needs a synced link, so try again when connected.',
    sync: 'You are offline. Local features still work, and sync will be available when you reconnect.',
  } as const;

  return messages[action];
}

export function isProbablyOnline() {
  return readOnlineStatus();
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(readOnlineStatus);

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(readOnlineStatus());
    }

    if (typeof globalThis.addEventListener !== 'function') {
      return undefined;
    }

    globalThis.addEventListener('online', updateOnlineStatus);
    globalThis.addEventListener('offline', updateOnlineStatus);

    return () => {
      globalThis.removeEventListener('online', updateOnlineStatus);
      globalThis.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return {
    isOffline: !isOnline,
    isOnline,
  };
}
