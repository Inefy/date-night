// src/lib/networkStatus.ts
import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

function isOnlineFromState(state: NetInfoState) {
  if (state.isConnected === false) {
    return false;
  }

  if (state.isInternetReachable === false) {
    return false;
  }

  return true;
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

export async function isProbablyOnline() {
  try {
    return isOnlineFromState(await NetInfo.fetch());
  } catch {
    return true;
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    void NetInfo.fetch()
      .then((state) => setIsOnline(isOnlineFromState(state)))
      .catch(() => setIsOnline(true));

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(isOnlineFromState(state));
    });

    return unsubscribe;
  }, []);

  return {
    isOffline: !isOnline,
    isOnline,
  };
}
